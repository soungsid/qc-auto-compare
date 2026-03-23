"""Filter options endpoint — dynamic filter values with contextual filtering."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
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
    years: dict  # {"min": 2018, "max": 2026, "list": [{"year": 2026, "count": 5}, ...]}
    ingest_sources: list[str]
    price_range: dict[str, Optional[float]]
    mileage_range: dict[str, Optional[int]]
    colors: list[str]


def _apply_context(query, make: Optional[str], model: Optional[str], condition: Optional[str],
                   fuel_type: Optional[str], body_type: Optional[str],
                   transmission: Optional[str], drivetrain: Optional[str],
                   year_min: Optional[int], year_max: Optional[int],
                   price_max: Optional[float]):
    """Apply contextual filter constraints to a SQLAlchemy query."""
    if make:
        query = query.where(Vehicle.make.ilike(f"%{make}%"))
    if model:
        query = query.where(Vehicle.model.ilike(f"%{model}%"))
    if condition:
        query = query.where(Vehicle.condition == condition)
    if fuel_type:
        query = query.where(Vehicle.fuel_type.ilike(f"%{fuel_type}%"))
    if body_type:
        query = query.where(Vehicle.body_type.ilike(f"%{body_type}%"))
    if transmission:
        query = query.where(Vehicle.transmission.ilike(f"%{transmission}%"))
    if drivetrain:
        query = query.where(Vehicle.drivetrain.ilike(f"%{drivetrain}%"))
    if year_min is not None:
        query = query.where(Vehicle.year >= year_min)
    if year_max is not None:
        query = query.where(Vehicle.year <= year_max)
    if price_max is not None:
        query = query.where(Vehicle.sale_price <= price_max)
    return query


@router.get("/options", response_model=FilterOptionsResponse)
async def get_filter_options(
    db: AsyncSession = Depends(get_db),
    make: Optional[str] = Query(None, description="Filter by make (contextual)"),
    model: Optional[str] = Query(None, description="Filter by model (contextual)"),
    condition: Optional[str] = Query(None, description="Filter by condition (contextual)"),
    fuel_type: Optional[str] = Query(None, description="Filter by fuel type (contextual)"),
    body_type: Optional[str] = Query(None, description="Filter by body type (contextual)"),
    transmission: Optional[str] = Query(None, description="Filter by transmission (contextual)"),
    drivetrain: Optional[str] = Query(None, description="Filter by drivetrain (contextual)"),
    year_min: Optional[int] = Query(None, description="Min year (contextual)"),
    year_max: Optional[int] = Query(None, description="Max year (contextual)"),
    price_max: Optional[float] = Query(None, description="Max price (contextual)"),
) -> FilterOptionsResponse:
    """
    Return available filter options based on actual data in the database.
    Accepts optional context params so counts reflect the currently active filters.
    For example, passing make=Nissan returns body type counts only for Nissan vehicles.
    """
    ctx = dict(make=make, model=model, condition=condition, fuel_type=fuel_type,
               body_type=body_type, transmission=transmission, drivetrain=drivetrain,
               year_min=year_min, year_max=year_max, price_max=price_max)

    base = select(Vehicle.make, Vehicle.model, func.count(Vehicle.id).label('count'))
    base = _apply_context(base.where(Vehicle.is_active == True), **ctx)

    # Get brands with models and counts — not filtered by make/model so user can switch brand
    ctx_no_make = {**ctx, "make": None, "model": None}
    brands_q = _apply_context(
        select(Vehicle.make, Vehicle.model, func.count(Vehicle.id).label('count'))
        .where(Vehicle.is_active == True),
        **ctx_no_make
    ).group_by(Vehicle.make, Vehicle.model).order_by(Vehicle.make, func.count(Vehicle.id).desc())
    brands_models_result = await db.execute(brands_q)

    brands_dict: dict[str, dict] = {}
    for mk, mdl, count in brands_models_result.all():
        if mk not in brands_dict:
            brands_dict[mk] = {"brand": mk, "total_count": 0, "models": []}
        brands_dict[mk]["total_count"] += count
        brands_dict[mk]["models"].append({"model": mdl, "count": count})
    brands = sorted(brands_dict.values(), key=lambda x: x["total_count"], reverse=True)

    # Body types — not filtered by body_type itself so user can switch
    ctx_no_body = {**ctx, "body_type": None}
    body_types_result = await db.execute(
        _apply_context(
            select(Vehicle.body_type, func.count(Vehicle.id).label('count'))
            .where(Vehicle.is_active == True).where(Vehicle.body_type.isnot(None)),
            **ctx_no_body
        ).group_by(Vehicle.body_type).order_by(func.count(Vehicle.id).desc())
    )
    body_types = [{"body_type": bt, "count": c} for bt, c in body_types_result.all()]

    # Fuel types — not filtered by fuel_type itself
    ctx_no_fuel = {**ctx, "fuel_type": None}
    fuel_types_result = await db.execute(
        _apply_context(
            select(Vehicle.fuel_type, func.count(Vehicle.id).label('count'))
            .where(Vehicle.is_active == True).where(Vehicle.fuel_type.isnot(None)),
            **ctx_no_fuel
        ).group_by(Vehicle.fuel_type).order_by(func.count(Vehicle.id).desc())
    )
    fuel_types = [{"fuel_type": ft, "count": c} for ft, c in fuel_types_result.all()]

    # Conditions — not filtered by condition itself
    ctx_no_cond = {**ctx, "condition": None}
    conditions_result = await db.execute(
        _apply_context(
            select(distinct(Vehicle.condition)).where(Vehicle.is_active == True),
            **ctx_no_cond
        ).order_by(Vehicle.condition)
    )
    conditions = [row[0] for row in conditions_result if row[0]]

    # Drivetrains — not filtered by drivetrain itself
    ctx_no_drive = {**ctx, "drivetrain": None}
    drivetrains_result = await db.execute(
        _apply_context(
            select(Vehicle.drivetrain, func.count(Vehicle.id).label('count'))
            .where(Vehicle.is_active == True).where(Vehicle.drivetrain.isnot(None)),
            **ctx_no_drive
        ).group_by(Vehicle.drivetrain).order_by(func.count(Vehicle.id).desc())
    )
    drivetrains = [{"drivetrain": dt, "count": c} for dt, c in drivetrains_result.all()]

    # Transmissions — not filtered by transmission itself
    ctx_no_trans = {**ctx, "transmission": None}
    transmissions_result = await db.execute(
        _apply_context(
            select(Vehicle.transmission, func.count(Vehicle.id).label('count'))
            .where(Vehicle.is_active == True).where(Vehicle.transmission.isnot(None)),
            **ctx_no_trans
        ).group_by(Vehicle.transmission).order_by(func.count(Vehicle.id).desc())
    )
    transmissions = [{"transmission": tr, "count": c} for tr, c in transmissions_result.all()]

    # Cities
    cities_result = await db.execute(
        _apply_context(
            select(distinct(Dealer.city))
            .join(Vehicle, Vehicle.dealer_id == Dealer.id)
            .where(Vehicle.is_active == True).where(Dealer.city.isnot(None)),
            **ctx
        ).order_by(Dealer.city)
    )
    cities = [row[0] for row in cities_result if row[0]]

    # Year range + per-year counts
    years_result = await db.execute(
        _apply_context(
            select(func.min(Vehicle.year), func.max(Vehicle.year)).where(Vehicle.is_active == True),
            **ctx
        )
    )
    years_row = years_result.first()
    years_list_result = await db.execute(
        _apply_context(
            select(Vehicle.year, func.count(Vehicle.id).label("count"))
            .where(Vehicle.is_active == True)
            .where(Vehicle.year.isnot(None)),
            **ctx
        ).group_by(Vehicle.year).order_by(Vehicle.year.desc())
    )
    years = {
        "min": years_row[0] if years_row and years_row[0] else None,
        "max": years_row[1] if years_row and years_row[1] else None,
        "list": [{"year": y, "count": c} for y, c in years_list_result.all()],
    }

    # Ingest sources
    sources_result = await db.execute(
        _apply_context(
            select(distinct(Vehicle.ingest_source)).where(Vehicle.is_active == True),
            **ctx
        ).order_by(Vehicle.ingest_source)
    )
    ingest_sources = [row[0] for row in sources_result if row[0]]

    # Price range — cap at 500 000 $ to exclude corrupted data
    price_range_result = await db.execute(
        _apply_context(
            select(func.min(Vehicle.sale_price), func.max(Vehicle.sale_price))
            .where(Vehicle.is_active == True)
            .where(Vehicle.sale_price <= 500000),
            **{**ctx, "price_max": None}
        )
    )
    price_row = price_range_result.first()
    price_range = {
        "min": float(price_row[0]) if price_row and price_row[0] else None,
        "max": float(price_row[1]) if price_row and price_row[1] else None,
    }

    # Mileage range
    mileage_range_result = await db.execute(
        _apply_context(
            select(func.min(Vehicle.mileage_km), func.max(Vehicle.mileage_km))
            .where(Vehicle.is_active == True).where(Vehicle.mileage_km > 0),
            **ctx
        )
    )
    mileage_row = mileage_range_result.first()
    mileage_range = {
        "min": mileage_row[0] if mileage_row and mileage_row[0] else None,
        "max": mileage_row[1] if mileage_row and mileage_row[1] else None,
    }

    # Colors
    colors_result = await db.execute(
        _apply_context(
            select(distinct(Vehicle.color_ext))
            .where(Vehicle.is_active == True).where(Vehicle.color_ext.isnot(None)),
            **ctx
        ).order_by(Vehicle.color_ext)
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
