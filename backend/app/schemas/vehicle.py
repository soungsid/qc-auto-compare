"""Pydantic schemas for the Vehicle resource."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.dealer import DealerResponse
from app.schemas.lease_offer import LeaseOfferResponse


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    fingerprint: str
    dealer_id: Optional[str] = None
    make: str
    model: str
    trim: Optional[str] = None
    year: int
    condition: str
    color_ext: Optional[str] = None
    color_int: Optional[str] = None
    body_type: Optional[str] = None
    fuel_type: Optional[str] = None
    drivetrain: Optional[str] = None
    transmission: Optional[str] = None
    mileage_km: int = 0
    vin: Optional[str] = None
    stock_number: Optional[str] = None
    msrp: Optional[float] = None
    sale_price: Optional[float] = None
    freight_pdi: Optional[float] = None
    listing_url: Optional[str] = None
    image_url: Optional[str] = None
    ingest_source: str
    is_active: bool
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Nested
    dealer: Optional[DealerResponse] = None
    lease_offers: list[LeaseOfferResponse] = []


class VehicleListResponse(BaseModel):
    """Paginated vehicle listing."""

    total: int
    page: int
    limit: int
    items: list[VehicleResponse]


class VehicleCompareResponse(BaseModel):
    """Side-by-side comparison of multiple vehicles."""

    vehicles: list[VehicleResponse]
