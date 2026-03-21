"""
Vehicle ingestion service — the core upsert + deduplication engine.

This module is the single authority for writing vehicle data to the database.
All sources (crawler, AI tools, manual, CSV) use this code path.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.fingerprint import compute_fingerprint
from app.core.normalizer import (
    normalize_condition,
    normalize_drivetrain,
    infer_body_type,
    infer_fuel_type,
    normalize_make,
    normalize_price,
    normalize_transmission,
    normalize_vin,
)
from app.db.models import Dealer, IngestLog, LeaseOffer, Vehicle
from app.schemas.ingest import (
    BatchIngestPayload,
    BatchIngestResult,
    IngestResult,
    VehicleIngestPayload,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _payload_hash(payload: VehicleIngestPayload) -> str:
    """SHA-256 of the raw payload JSON for audit/debug purposes."""
    raw = payload.model_dump_json(exclude={"lease_offers"})
    return hashlib.sha256(raw.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Changeable fields — fields that trigger an UPDATE when they differ
# ---------------------------------------------------------------------------

CHANGEABLE_FIELDS = {
    "sale_price",
    "msrp",
    "is_active",
    "image_url",
    "listing_url",
    "freight_pdi",
    "color_ext",
    "color_int",
    "condition",      # BUG #2 fix - allow condition updates
    "drivetrain",     # BUG #2 fix - allow drivetrain updates
    "transmission",   # BUG #2 fix - allow transmission updates
    "mileage_km",     # BUG #2 fix - allow mileage updates
}


def _validate_condition_from_url(condition: str, listing_url: str | None) -> str:
    """
    BUG #2 Volet C: Validate and fix condition based on listing URL.
    If URL contains /occasion/ but condition is 'new', correct to 'used'.
    If URL contains /neufs/ but condition is 'used', correct to 'new'.
    """
    if not listing_url:
        return condition
    
    url_lower = listing_url.lower()
    if "/occasion/" in url_lower and condition == "new":
        return "used"
    if ("/neufs/" in url_lower or "/neuf/" in url_lower) and condition == "used":
        return "new"
    
    return condition


def _detect_changes(existing: Vehicle, payload: VehicleIngestPayload) -> dict:
    """Return a dict of {field: new_value} for fields that have changed."""
    changes: dict = {}

    # Normalize condition and validate against URL
    normalized_condition = normalize_condition(payload.condition)
    validated_condition = _validate_condition_from_url(normalized_condition, payload.listing_url)

    field_map = {
        "sale_price": normalize_price(payload.sale_price),
        "msrp": normalize_price(payload.msrp),
        "freight_pdi": normalize_price(payload.freight_pdi),
        "image_url": payload.image_url,
        "listing_url": payload.listing_url,
        "color_ext": payload.color_ext,
        "color_int": payload.color_int,
        "condition": validated_condition,
        "drivetrain": normalize_drivetrain(payload.drivetrain),
        "transmission": normalize_transmission(payload.transmission),
        # Guard-rail: mileage must fit in int32 and be plausible (max 999,999 km)
        "mileage_km": payload.mileage_km if (payload.mileage_km is not None and 0 <= payload.mileage_km <= 999_999) else None,
    }

    for field, new_value in field_map.items():
        if new_value is None:
            continue
        existing_value = getattr(existing, field, None)
        # Compare floats with a small epsilon to avoid floating-point noise
        if isinstance(new_value, float) and isinstance(existing_value, float):
            if abs(new_value - existing_value) > 0.01:
                changes[field] = new_value
        elif isinstance(new_value, int) and isinstance(existing_value, int):
            if new_value != existing_value:
                changes[field] = new_value
        elif new_value != existing_value:
            changes[field] = new_value

    return changes


# ---------------------------------------------------------------------------
# Dealer resolution / auto-creation
# ---------------------------------------------------------------------------

async def _resolve_dealer(
    db: AsyncSession,
    payload: VehicleIngestPayload,
) -> Optional[str]:
    """
    Resolve dealer_id from payload.

    Resolution order:
    1. dealer_slug → look up existing dealer
    2. dealer_name + dealer_city → look up or auto-create

    Returns dealer_id (str) or None if dealer info is absent.
    """
    if not payload.dealer_slug and not payload.dealer_name:
        return None

    # Try by slug first
    if payload.dealer_slug:
        stmt = select(Dealer).where(Dealer.slug == payload.dealer_slug.lower())
        dealer = await db.scalar(stmt)
        if dealer:
            return dealer.id

    # Try by name + city
    if payload.dealer_name:
        stmt = select(Dealer).where(Dealer.name == payload.dealer_name)
        if payload.dealer_city:
            stmt = stmt.where(Dealer.city == payload.dealer_city)
        dealer = await db.scalar(stmt)
        if dealer:
            return dealer.id

    # Auto-create a minimal dealer record
    slug = (payload.dealer_slug or _slugify(payload.dealer_name or "unknown"))
    new_dealer = Dealer(
        slug=slug,
        name=payload.dealer_name or slug,
        brand=normalize_make(payload.make) or payload.make,
        city=payload.dealer_city,
        phone=payload.dealer_phone,
        website=payload.dealer_website,
    )
    db.add(new_dealer)
    await db.flush()  # Get the ID without committing
    return new_dealer.id


def _slugify(s: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", s.strip().lower()).strip("-")


# ---------------------------------------------------------------------------
# BUG #6 FIX: Upsert lease offers to prevent duplicates
# ---------------------------------------------------------------------------

async def _upsert_lease_offers(
    db: AsyncSession,
    vehicle_id: str,
    lease_offers: list,
    ingest_source: str,
) -> None:
    """
    Upsert lease offers for a vehicle.
    
    Instead of blindly appending new offers, this function:
    1. Checks if an offer with the same (term_months, payment_frequency, offer_type) exists
    2. If yes, updates the existing offer with new values
    3. If no, creates a new offer
    
    This prevents duplicate lease offers from accumulating with each re-ingest.
    """
    from app.schemas.ingest import LeaseOfferPayload
    
    for offer_data in lease_offers:
        # Build the unique key for this offer
        if isinstance(offer_data, LeaseOfferPayload):
            offer_dict = offer_data.model_dump(exclude_none=True)
        else:
            offer_dict = offer_data
        
        term_months = offer_dict.get("term_months")
        payment_frequency = offer_dict.get("payment_frequency", "monthly")
        offer_type = offer_dict.get("offer_type", "lease")
        
        # Try to find existing offer with same key
        existing_offer = await db.scalar(
            select(LeaseOffer).where(
                LeaseOffer.vehicle_id == vehicle_id,
                LeaseOffer.term_months == term_months,
                LeaseOffer.payment_frequency == payment_frequency,
                LeaseOffer.offer_type == offer_type,
            )
        )
        
        if existing_offer:
            # Update existing offer
            for key, value in offer_dict.items():
                if value is not None and hasattr(existing_offer, key):
                    setattr(existing_offer, key, value)
            existing_offer.ingest_source = ingest_source
        else:
            # Create new offer
            new_offer = LeaseOffer(
                vehicle_id=vehicle_id,
                ingest_source=ingest_source,
                **offer_dict,
            )
            db.add(new_offer)


# ---------------------------------------------------------------------------
# Core ingest logic
# ---------------------------------------------------------------------------

async def ingest_vehicle(
    payload: VehicleIngestPayload,
    db: AsyncSession,
) -> IngestResult:
    """
    Upsert a single vehicle record.

    Returns an IngestResult with action = 'created' | 'updated' | 'skipped' | 'error'.
    The caller is responsible for committing the session.
    """
    # Normalize inputs before fingerprinting
    vin = normalize_vin(payload.vin)
    condition = normalize_condition(payload.condition)
    make = normalize_make(payload.make) or payload.make
    dealer_slug = payload.dealer_slug

    # Compute fingerprint server-side (clients never send it)
    fp = compute_fingerprint(
        vin=vin,
        stock_number=payload.stock_number,
        dealer_slug=dealer_slug,
        make=make,
        model=payload.model,
        trim=payload.trim,
        year=payload.year,
        condition=condition,
    )

    ph = _payload_hash(payload)
    vehicle_id: Optional[str] = None
    action: str
    error_msg: Optional[str] = None

    try:
        # Check for existing record
        stmt = select(Vehicle).where(Vehicle.fingerprint == fp)
        existing = await db.scalar(stmt)

        if existing is None:
            # ---- INSERT ----------------------------------------------------
            dealer_id = await _resolve_dealer(db, payload)

            vehicle = Vehicle(
                fingerprint=fp,
                dealer_id=dealer_id,
                make=make,
                model=payload.model.strip(),
                trim=payload.trim,
                year=payload.year,
                condition=condition,
                vin=vin,
                stock_number=payload.stock_number,
                body_type=payload.body_type or infer_body_type(make, payload.model),
                fuel_type=payload.fuel_type or infer_fuel_type(make, payload.model, payload.trim),
                drivetrain=normalize_drivetrain(payload.drivetrain),
                transmission=normalize_transmission(payload.transmission),
                color_ext=payload.color_ext,
                color_int=payload.color_int,
                msrp=normalize_price(payload.msrp),
                sale_price=normalize_price(payload.sale_price),
                freight_pdi=normalize_price(payload.freight_pdi),
                mileage_km=payload.mileage_km if (payload.mileage_km is not None and 0 <= payload.mileage_km <= 999_999) else None,
                listing_url=payload.listing_url,
                image_url=payload.image_url,
                ingest_source=payload.ingest_source,
                is_active=True,
                last_seen_at=utcnow(),
            )
            db.add(vehicle)
            await db.flush()
            vehicle_id = vehicle.id

            # Insert lease offers
            for offer_data in payload.lease_offers:
                offer = LeaseOffer(
                    vehicle_id=vehicle_id,
                    ingest_source=payload.ingest_source,
                    **offer_data.model_dump(exclude_none=True),
                )
                db.add(offer)

            action = "created"

        else:
            # ---- UPDATE or SKIP -------------------------------------------
            vehicle_id = existing.id
            changes = _detect_changes(existing, payload)

            if changes:
                for field, value in changes.items():
                    setattr(existing, field, value)
                existing.updated_at = utcnow()
                existing.ingest_source = payload.ingest_source  # Track latest writer
                action = "updated"
            else:
                action = "skipped"

            existing.last_seen_at = utcnow()
            existing.is_active = True  # Re-activate if it was marked stale

            # BUG #6 FIX: Upsert lease offers instead of blindly appending
            # This prevents duplicates when re-ingesting the same vehicle
            if payload.lease_offers:
                await _upsert_lease_offers(db, vehicle_id, payload.lease_offers, payload.ingest_source)

    except Exception as exc:
        action = "error"
        error_msg = str(exc)

    finally:
        # Always write to audit log
        log_entry = IngestLog(
            ingest_source=payload.ingest_source,
            fingerprint=fp,
            action=action,
            vehicle_id=vehicle_id,
            payload_hash=ph,
            error_message=error_msg,
        )
        db.add(log_entry)

    return IngestResult(
        action=action,  # type: ignore[arg-type]
        fingerprint=fp,
        vehicle_id=vehicle_id,
        error=error_msg,
    )


async def ingest_batch(
    payload: BatchIngestPayload,
    db: AsyncSession,
) -> BatchIngestResult:
    """
    Ingest a batch of vehicles in a single transaction.

    Processes each vehicle sequentially within the batch for data consistency.
    """
    results: list[IngestResult] = []

    for vehicle_payload in payload.vehicles:
        result = await ingest_vehicle(vehicle_payload, db)
        results.append(result)

    # Commit the entire batch atomically
    await db.commit()

    return BatchIngestResult(
        total=len(results),
        created=sum(1 for r in results if r.action == "created"),
        updated=sum(1 for r in results if r.action == "updated"),
        skipped=sum(1 for r in results if r.action == "skipped"),
        errors=sum(1 for r in results if r.action == "error"),
        results=results,
    )
