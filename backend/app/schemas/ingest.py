"""
Universal ingestion payload schema.

This is the contract for ALL ingestion sources:
  - Internal crawler (Scrapy)
  - AI tools (GitHub Copilot, Cline, Claude)
  - Manual scripts
  - CSV imports

The fingerprint is always computed server-side from this payload.
"""

from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from app.schemas.lease_offer import LeaseOfferPayload


IngestSource = Literal[
    "crawler",
    "copilot",
    "cline",
    "claude",
    "manual",
    "csv_import",
    "unknown",
]


class VehicleIngestPayload(BaseModel):
    """
    Source-agnostic vehicle ingestion payload.

    At minimum, provide: ingest_source, make, model, year, condition.
    The more fields provided, the richer the fingerprint and listing.
    """

    model_config = {"extra": "ignore"}  # Tolerate unknown fields from future spiders

    # ---- Source traceability (required) ------------------------------------
    ingest_source: str  # IngestSource — validated loosely to allow future sources

    # ---- Dealer identification ---------------------------------------------
    dealer_slug: Optional[str] = None    # Preferred — stable identifier
    dealer_name: Optional[str] = None    # Fallback → auto-create dealer if unknown
    dealer_city: Optional[str] = None
    dealer_phone: Optional[str] = None
    dealer_website: Optional[str] = None

    # ---- Vehicle identity (required) ---------------------------------------
    make: str
    model: str
    year: int
    condition: str = "new"              # new | used | certified

    # ---- Vehicle details (optional) ----------------------------------------
    trim: Optional[str] = None
    vin: Optional[str] = None           # Priority #1 for fingerprint
    stock_number: Optional[str] = None  # Priority #2 for fingerprint
    body_type: Optional[str] = None     # Berline, VUS, Coupé, Hayon, Camion, etc.
    drivetrain: Optional[str] = None    # Will be normalized → FWD/AWD/RWD/4WD
    transmission: Optional[str] = None
    color_ext: Optional[str] = None
    color_int: Optional[str] = None

    # ---- Pricing -----------------------------------------------------------
    msrp: Optional[float] = None
    sale_price: Optional[float] = None
    freight_pdi: Optional[float] = None
    mileage_km: int = 0

    # ---- Listing -----------------------------------------------------------
    listing_url: Optional[str] = None
    image_url: Optional[str] = None

    # ---- Financing offers --------------------------------------------------
    lease_offers: list[LeaseOfferPayload] = []

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if not (1980 <= v <= 2030):
            raise ValueError(f"Year {v} is out of plausible range [1980–2030]")
        return v

    @field_validator("make", "model")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()


class BatchIngestPayload(BaseModel):
    """Batch ingestion — up to 500 vehicles per request."""

    vehicles: list[VehicleIngestPayload]

    @field_validator("vehicles")
    @classmethod
    def validate_batch_size(cls, v: list) -> list:
        if len(v) > 500:
            raise ValueError("Batch size must not exceed 500 vehicles")
        return v


class IngestResult(BaseModel):
    """Result of a single vehicle ingestion operation."""

    action: Literal["created", "updated", "skipped", "error"]
    fingerprint: str
    vehicle_id: Optional[str] = None
    error: Optional[str] = None


class BatchIngestResult(BaseModel):
    """Aggregated result of a batch ingestion."""

    total: int
    created: int
    updated: int
    skipped: int
    errors: int
    results: list[IngestResult]
