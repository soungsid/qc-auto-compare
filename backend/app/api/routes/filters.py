"""Filter options endpoint - BUG #3: Dynamic filter values from database."""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.models import Dealer, Vehicle

router = APIRouter(prefix="/filters", tags=["Filters"])


class FilterOptionsResponse(BaseModel):
    """Available filter options based on actual data in the database."""
    makes: list[str]
    conditions: list[str]
    drivetrains: list[str]
    transmissions: list[str]
    cities: list[str]
    years: list[int]
    ingest_sources: list[str]
    price_range: dict[str, Optional[float]]
    mileage_range: dict[str, Optional[int]]


@router.get("/options", response_model=FilterOptionsResponse)
async def get_filter_options(
    db: AsyncSession = Depends(get_db),
) -> FilterOptionsResponse:
    """
    Return available filter options based on actual data in the database.
    
    BUG #3 FIX: Instead of hardcoded values, this endpoint queries the database
    to return only values that exist in the current dataset.
    """
    # Get distinct makes
    makes_result = await db.execute(
        select(distinct(Vehicle.make))
        .where(Vehicle.is_active == True)
        .order_by(Vehicle.make)
    )
    makes = [row[0] for row in makes_result if row[0]]

    # Get distinct conditions
    conditions_result = await db.execute(
        select(distinct(Vehicle.condition))
        .where(Vehicle.is_active == True)
        .order_by(Vehicle.condition)
    )
    conditions = [row[0] for row in conditions_result if row[0]]

    # Get distinct drivetrains
    drivetrains_result = await db.execute(
        select(distinct(Vehicle.drivetrain))
        .where(Vehicle.is_active == True)
        .where(Vehicle.drivetrain.isnot(None))
        .order_by(Vehicle.drivetrain)
    )
    drivetrains = [row[0] for row in drivetrains_result if row[0]]

    # Get distinct transmissions
    transmissions_result = await db.execute(
        select(distinct(Vehicle.transmission))
        .where(Vehicle.is_active == True)
        .where(Vehicle.transmission.isnot(None))
        .order_by(Vehicle.transmission)
    )
    transmissions = [row[0] for row in transmissions_result if row[0]]

    # Get distinct cities from dealers
    cities_result = await db.execute(
        select(distinct(Dealer.city))
        .join(Vehicle, Vehicle.dealer_id == Dealer.id)
        .where(Vehicle.is_active == True)
        .where(Dealer.city.isnot(None))
        .order_by(Dealer.city)
    )
    cities = [row[0] for row in cities_result if row[0]]

    # Get distinct years
    years_result = await db.execute(
        select(distinct(Vehicle.year))
        .where(Vehicle.is_active == True)
        .order_by(Vehicle.year.desc())
    )
    years = [row[0] for row in years_result if row[0]]

    # Get distinct ingest sources
    sources_result = await db.execute(
        select(distinct(Vehicle.ingest_source))
        .where(Vehicle.is_active == True)
        .order_by(Vehicle.ingest_source)
    )
    ingest_sources = [row[0] for row in sources_result if row[0]]

    # Get price range
    price_range_result = await db.execute(
        select(
            func.min(Vehicle.sale_price),
            func.max(Vehicle.sale_price)
        ).where(Vehicle.is_active == True)
    )
    price_row = price_range_result.first()
    price_range = {
        "min": float(price_row[0]) if price_row and price_row[0] else None,
        "max": float(price_row[1]) if price_row and price_row[1] else None,
    }

    # Get mileage range
    mileage_range_result = await db.execute(
        select(
            func.min(Vehicle.mileage_km),
            func.max(Vehicle.mileage_km)
        ).where(Vehicle.is_active == True)
        .where(Vehicle.mileage_km > 0)
    )
    mileage_row = mileage_range_result.first()
    mileage_range = {
        "min": mileage_row[0] if mileage_row and mileage_row[0] else None,
        "max": mileage_row[1] if mileage_row and mileage_row[1] else None,
    }

    return FilterOptionsResponse(
        makes=makes,
        conditions=conditions,
        drivetrains=drivetrains,
        transmissions=transmissions,
        cities=cities,
        years=years,
        ingest_sources=ingest_sources,
        price_range=price_range,
        mileage_range=mileage_range,
    )
