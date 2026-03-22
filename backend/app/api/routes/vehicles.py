"""Vehicle endpoints — listing, detail, comparison."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.db.models import Vehicle
from app.schemas.vehicle import VehicleCompareResponse, VehicleListResponse, VehicleResponse
from app.services.search_service import search_vehicles

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("", response_model=VehicleListResponse)
async def list_vehicles(
    make: Optional[str] = Query(None, description="Filter by make (Nissan, Toyota…)"),
    model: Optional[str] = Query(None, description="Filter by model (Kicks, Corolla…)"),
    trim: Optional[str] = Query(None),
    condition: Optional[str] = Query(None, description="new | used | certified"),
    body_type: Optional[str] = Query(None, description="Berline | VUS | Coupé | etc."),
    fuel_type: Optional[str] = Query(None, description="Essence | Diesel | Électrique | Hybride"),
    transmission: Optional[str] = Query(None, description="Automatique | Manuelle | CVT"),
    drivetrain: Optional[str] = Query(None, description="FWD | AWD | RWD | 4WD"),
    city: Optional[str] = Query(None, description="Comma-separated cities"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    year_min: Optional[int] = Query(None, ge=1900, le=2100, description="Minimum year"),
    year_max: Optional[int] = Query(None, ge=1900, le=2100, description="Maximum year"),
    mileage_max: Optional[int] = Query(None, ge=0, description="Maximum mileage in km"),
    max_monthly_payment: Optional[float] = Query(None, ge=0),
    payment_frequency: Optional[str] = Query(None, description="monthly | biweekly | weekly"),
    ingest_source: Optional[str] = Query(None),
    sort: str = Query("sale_price", description="Sort field"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> VehicleListResponse:
    """List vehicles with optional filtering, sorting, and pagination."""
    cities = [c.strip() for c in city.split(",")] if city else None

    return await search_vehicles(
        db,
        make=make,
        model=model,
        trim=trim,
        condition=condition,
        body_type=body_type,
        fuel_type=fuel_type,
        transmission=transmission,
        drivetrain=drivetrain,
        cities=cities,
        min_price=min_price,
        max_price=max_price,
        year_min=year_min,
        year_max=year_max,
        mileage_max=mileage_max,
        max_monthly_payment=max_monthly_payment,
        payment_frequency=payment_frequency,
        ingest_source=ingest_source,
        sort=sort,
        order=order,
        page=page,
        limit=limit,
    )


@router.get("/compare", response_model=VehicleCompareResponse)
async def compare_vehicles(
    ids: str = Query(..., description="Comma-separated vehicle IDs"),
    db: AsyncSession = Depends(get_db),
) -> VehicleCompareResponse:
    """Return multiple vehicles side-by-side for comparison."""
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if len(id_list) > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot compare more than 6 vehicles at once.",
        )

    stmt = (
        select(Vehicle)
        .options(selectinload(Vehicle.dealer), selectinload(Vehicle.lease_offers))
        .where(Vehicle.id.in_(id_list))
    )
    result = await db.execute(stmt)
    vehicles = result.scalars().all()

    return VehicleCompareResponse(
        vehicles=[VehicleResponse.model_validate(v) for v in vehicles]
    )


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
) -> VehicleResponse:
    """Get a single vehicle by ID, including all lease offers."""
    stmt = (
        select(Vehicle)
        .options(selectinload(Vehicle.dealer), selectinload(Vehicle.lease_offers))
        .where(Vehicle.id == vehicle_id)
    )
    vehicle = await db.scalar(stmt)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    return VehicleResponse.model_validate(vehicle)
