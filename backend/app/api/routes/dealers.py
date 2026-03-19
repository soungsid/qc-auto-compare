"""Dealer endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.db.models import Dealer, Vehicle
from app.schemas.dealer import DealerCreate, DealerResponse, DealerUpdate
from app.schemas.vehicle import VehicleListResponse, VehicleResponse
from app.services.search_service import search_vehicles

router = APIRouter(prefix="/dealers", tags=["Dealers"])


@router.get("", response_model=list[DealerResponse])
async def list_dealers(
    brand: str | None = Query(None),
    city: str | None = Query(None),
    is_active: bool = Query(True),
    db: AsyncSession = Depends(get_db),
) -> list[DealerResponse]:
    """List all dealers, optionally filtered by brand or city."""
    stmt = select(Dealer).where(Dealer.is_active == is_active)
    if brand:
        stmt = stmt.where(Dealer.brand.ilike(f"%{brand}%"))
    if city:
        stmt = stmt.where(Dealer.city.ilike(f"%{city}%"))
    stmt = stmt.order_by(Dealer.brand, Dealer.name)

    result = await db.execute(stmt)
    return [DealerResponse.model_validate(d) for d in result.scalars().all()]


@router.post("", response_model=DealerResponse, status_code=201)
async def create_dealer(
    payload: DealerCreate,
    db: AsyncSession = Depends(get_db),
) -> DealerResponse:
    """Create a new dealer (used for manual seed or testing)."""
    # Check slug uniqueness
    existing = await db.scalar(select(Dealer).where(Dealer.slug == payload.slug))
    if existing:
        raise HTTPException(status_code=409, detail=f"Dealer slug '{payload.slug}' already exists")

    dealer = Dealer(**payload.model_dump())
    db.add(dealer)
    await db.commit()
    await db.refresh(dealer)
    return DealerResponse.model_validate(dealer)


@router.get("/{slug}", response_model=DealerResponse)
async def get_dealer(slug: str, db: AsyncSession = Depends(get_db)) -> DealerResponse:
    """Get a dealer by slug."""
    dealer = await db.scalar(select(Dealer).where(Dealer.slug == slug))
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")
    return DealerResponse.model_validate(dealer)


@router.patch("/{slug}", response_model=DealerResponse)
async def update_dealer(
    slug: str,
    payload: DealerUpdate,
    db: AsyncSession = Depends(get_db),
) -> DealerResponse:
    """Partially update a dealer."""
    dealer = await db.scalar(select(Dealer).where(Dealer.slug == slug))
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(dealer, field, value)

    await db.commit()
    await db.refresh(dealer)
    return DealerResponse.model_validate(dealer)


@router.get("/{slug}/vehicles", response_model=VehicleListResponse)
async def list_dealer_vehicles(
    slug: str,
    condition: str | None = Query(None),
    sort: str = Query("sale_price"),
    order: str = Query("asc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> VehicleListResponse:
    """List all active vehicles for a specific dealer."""
    dealer = await db.scalar(select(Dealer).where(Dealer.slug == slug))
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer not found")

    return await search_vehicles(
        db,
        cities=[dealer.city] if dealer.city else None,
        condition=condition,
        sort=sort,
        order=order,
        page=page,
        limit=limit,
    )
