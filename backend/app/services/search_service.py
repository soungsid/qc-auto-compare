"""
Vehicle search service — filtering, sorting, and pagination.
"""

from typing import Optional

from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Dealer, LeaseOffer, Vehicle
from app.schemas.vehicle import VehicleListResponse, VehicleResponse


# ---------------------------------------------------------------------------
# Sort configuration
# ---------------------------------------------------------------------------

SORTABLE_COLUMNS = {
    "sale_price": Vehicle.sale_price,
    "msrp": Vehicle.msrp,
    "year": Vehicle.year,
    "make": Vehicle.make,
    "model": Vehicle.model,
    "mileage_km": Vehicle.mileage_km,
    "created_at": Vehicle.created_at,
}


# ---------------------------------------------------------------------------
# Main search function
# ---------------------------------------------------------------------------

async def search_vehicles(
    db: AsyncSession,
    *,
    make: Optional[str] = None,
    model: Optional[str] = None,
    trim: Optional[str] = None,
    condition: Optional[str] = None,
    drivetrain: Optional[str] = None,
    cities: Optional[list[str]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    mileage_max: Optional[int] = None,
    max_monthly_payment: Optional[float] = None,
    payment_frequency: Optional[str] = None,
    ingest_source: Optional[str] = None,
    is_active: bool = True,
    sort: str = "sale_price",
    order: str = "asc",
    page: int = 1,
    limit: int = 50,
) -> VehicleListResponse:
    """
    Search vehicles with optional filters, sorting, and pagination.

    Args:
        db:                   Async database session.
        make:                 Filter by make (case-insensitive).
        model:                Filter by model (case-insensitive).
        trim:                 Filter by trim level.
        condition:            Filter by condition (new/used/certified).
        drivetrain:           Filter by drivetrain (FWD/AWD/RWD/4WD).
        cities:               Filter by dealer cities (OR).
        min_price:            Minimum sale_price.
        max_price:            Maximum sale_price.
        year_min:             Minimum year (BUG #4 fix).
        year_max:             Maximum year (BUG #4 fix).
        mileage_max:          Maximum mileage in km (BUG #4 fix).
        max_monthly_payment:  Max monthly lease payment (joins lease_offers).
        payment_frequency:    Payment frequency filter for lease_offers.
        ingest_source:        Filter by ingestion source (for debugging).
        is_active:            Only return active listings (default True).
        sort:                 Sort column key (see SORTABLE_COLUMNS).
        order:                'asc' or 'desc'.
        page:                 1-indexed page number.
        limit:                Page size (max 200).

    Returns:
        VehicleListResponse with total count and paginated items.
    """
    limit = min(limit, 200)
    offset = (max(page, 1) - 1) * limit

    stmt = (
        select(Vehicle)
        .options(
            selectinload(Vehicle.dealer),
            selectinload(Vehicle.lease_offers),
        )
        .where(Vehicle.is_active == is_active)
    )

    # ---- Filters -----------------------------------------------------------
    if make:
        stmt = stmt.where(Vehicle.make.ilike(f"%{make}%"))
    if model:
        stmt = stmt.where(Vehicle.model.ilike(f"%{model}%"))
    if trim:
        stmt = stmt.where(Vehicle.trim.ilike(f"%{trim}%"))
    if condition:
        stmt = stmt.where(Vehicle.condition == condition.lower())
    if drivetrain:
        stmt = stmt.where(Vehicle.drivetrain == drivetrain.upper())
    if ingest_source:
        stmt = stmt.where(Vehicle.ingest_source == ingest_source)
    if min_price is not None:
        stmt = stmt.where(Vehicle.sale_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Vehicle.sale_price <= max_price)
    # BUG #4 fix: Add year and mileage filters
    if year_min is not None:
        stmt = stmt.where(Vehicle.year >= year_min)
    if year_max is not None:
        stmt = stmt.where(Vehicle.year <= year_max)
    if mileage_max is not None:
        stmt = stmt.where(Vehicle.mileage_km <= mileage_max)
    if cities:
        city_filters = [Vehicle.dealer.has(Dealer.city.ilike(c)) for c in cities]
        stmt = stmt.where(or_(*city_filters))

    # ---- Lease payment filter (join) ----------------------------------------
    if max_monthly_payment is not None:
        freq = payment_frequency or "monthly"
        stmt = stmt.where(
            Vehicle.lease_offers.any(
                (LeaseOffer.payment_amount <= max_monthly_payment)
                & (LeaseOffer.payment_frequency == freq)
            )
        )

    # ---- Count (before pagination) -----------------------------------------
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt) or 0

    # ---- Sorting -----------------------------------------------------------
    sort_col = SORTABLE_COLUMNS.get(sort, Vehicle.sale_price)
    sort_dir = asc if order.lower() == "asc" else desc
    # Put NULLs last regardless of direction
    stmt = stmt.order_by(sort_col.is_(None), sort_dir(sort_col))

    # ---- Pagination --------------------------------------------------------
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    vehicles = result.scalars().all()

    return VehicleListResponse(
        total=total,
        page=page,
        limit=limit,
        items=[VehicleResponse.model_validate(v) for v in vehicles],
    )
