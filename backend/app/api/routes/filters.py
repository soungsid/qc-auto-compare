"""Filter options endpoint - BUG #3: Dynamic filter values from database."""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.models import Dealer, Vehicle

router = APIRouter(prefix="/filters", tags=["Filters"])


class BrandModel(BaseModel):
    model: str
    count: int

class BrandWithModels(BaseModel):
    brand: str
    total_count: int
    models: list[BrandModel]

class FilterOptionsResponse(BaseModel):
    """Available filter options based on actual data in the database."""
    brands: list[BrandWithModels]  # [{brand: "Nissan", total_count: 100, models: [{model: "Kicks", count: 20}]}]
    body_types: list[dict[str, int | str]]  # [{"body_type": "VUS", "count": 1416}, ...]
    fuel_types: list[dict[str, int | str]]  # [{"fuel_type": "Essence", "count": 2269}, ...]
    conditions: list[str]
    drivetrains: list[dict[str, int | str]]  # [{"drivetrain": "AWD", "count": 500}]
    transmissions: list[dict[str, int | str]]  # [{"transmission": "Automatique", "count": 800}]
    cities: list[str]
    years: dict[str, Optional[int]]  # {"min": 2018, "max": 2026}
    ingest_sources: list[str]
    price_range: dict[str, Optional[float]]
    mileage_range: dict[str, Optional[int]]
    colors: list[str]


@router.get("/options", response_model=FilterOptionsResponse)
async def get_filter_options(
    db: AsyncSession = Depends(get_db),
) -> FilterOptionsResponse:
    """
    Return available filter options based on actual data in the database.
    
    BUG #3 FIX: Instead of hardcoded values, this endpoint queries the database
    to return only values that exist in the current dataset.
    """
    # Get brands with models and counts
    brands_models_result = await db.execute(
        select(
            Vehicle.make,
            Vehicle.model,
            func.count(Vehicle.id).label('count')
        )
        .where(Vehicle.is_active == True)
        .group_by(Vehicle.make, Vehicle.model)
        .order_by(Vehicle.make, func.count(Vehicle.id).desc())
    )
    
    # Build brands with models structure
    brands_dict: dict[str, dict] = {}
    for make, model, count in brands_models_result.all():
        if make not in brands_dict:
            brands_dict[make] = {"brand": make, "total_count": 0, "models": []}
        brands_dict[make]["total_count"] += count
        brands_dict[make]["models"].append({"model": model, "count": count})
    
    # Sort brands by total_count descending
    brands = sorted(brands_dict.values(), key=lambda x: x["total_count"], reverse=True)
    
    # Get body types with counts
    body_types_result = await db.execute(
        select(
            Vehicle.body_type,
            func.count(Vehicle.id).label('count')
        )
        .where(Vehicle.is_active == True)
        .where(Vehicle.body_type.isnot(None))
        .group_by(Vehicle.body_type)
        .order_by(func.count(Vehicle.id).desc())
    )
    body_types = [
        {"body_type": bt, "count": count}
        for bt, count in body_types_result.all()
    ]

    # Get fuel types with counts
    fuel_types_result = await db.execute(
        select(
            Vehicle.fuel_type,
            func.count(Vehicle.id).label('count')
        )
        .where(Vehicle.is_active == True)
        .where(Vehicle.fuel_type.isnot(None))
        .group_by(Vehicle.fuel_type)
        .order_by(func.count(Vehicle.id).desc())
    )
    fuel_types = [
        {"fuel_type": ft, "count": count}
        for ft, count in fuel_types_result.all()
    ]

    # Get distinct conditions
    conditions_result = await db.execute(
        select(distinct(Vehicle.condition))
        .where(Vehicle.is_active == True)
        .order_by(Vehicle.condition)
    )
    conditions = [row[0] for row in conditions_result if row[0]]

    # Get drivetrains with counts
    drivetrains_result = await db.execute(
        select(
            Vehicle.drivetrain,
            func.count(Vehicle.id).label('count')
        )
        .where(Vehicle.is_active == True)
        .where(Vehicle.drivetrain.isnot(None))
        .group_by(Vehicle.drivetrain)
        .order_by(func.count(Vehicle.id).desc())
    )
    drivetrains = [
        {"drivetrain": dt, "count": count}
        for dt, count in drivetrains_result.all()
    ]

    # Get transmissions with counts
    transmissions_result = await db.execute(
        select(
            Vehicle.transmission,
            func.count(Vehicle.id).label('count')
        )
        .where(Vehicle.is_active == True)
        .where(Vehicle.transmission.isnot(None))
        .group_by(Vehicle.transmission)
        .order_by(func.count(Vehicle.id).desc())
    )
    transmissions = [
        {"transmission": trans, "count": count}
        for trans, count in transmissions_result.all()
    ]

    # Get distinct cities from dealers
    cities_result = await db.execute(
        select(distinct(Dealer.city))
        .join(Vehicle, Vehicle.dealer_id == Dealer.id)
        .where(Vehicle.is_active == True)
        .where(Dealer.city.isnot(None))
        .order_by(Dealer.city)
    )
    cities = [row[0] for row in cities_result if row[0]]

    # Get year range (min and max)
    years_result = await db.execute(
        select(
            func.min(Vehicle.year),
            func.max(Vehicle.year)
        ).where(Vehicle.is_active == True)
    )
    years_row = years_result.first()
    years = {
        "min": years_row[0] if years_row and years_row[0] else None,
        "max": years_row[1] if years_row and years_row[1] else None,
    }

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

    # Get unique exterior colors
    colors_result = await db.execute(
        select(distinct(Vehicle.color_ext))
        .where(Vehicle.is_active == True)
        .where(Vehicle.color_ext.isnot(None))
        .order_by(Vehicle.color_ext)
    )
    colors = [row[0] for row in colors_result if row[0]]

    return FilterOptionsResponse(
        brands=brands,
        body_types=body_types,
        fuel_types=fuel_types,
        conditions=conditions,
        drivetrains=drivetrains,
        transmissions=transmissions,
        cities=cities,
        years=years,
        ingest_sources=ingest_sources,
        price_range=price_range,
        mileage_range=mileage_range,
        colors=colors,
    )
