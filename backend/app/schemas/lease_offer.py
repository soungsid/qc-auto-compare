"""Pydantic schemas for LeaseOffer resource."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class LeaseOfferPayload(BaseModel):
    """Incoming lease offer data — accepted from any ingestion source."""

    offer_type: Optional[str] = None        # lease | finance | cash
    term_months: Optional[int] = None
    payment_amount: Optional[float] = None
    payment_frequency: Optional[str] = None  # monthly | biweekly | weekly
    down_payment: Optional[float] = None
    annual_km: Optional[int] = None
    residual_value: Optional[float] = None
    interest_rate_pct: Optional[float] = None
    offer_expiry: Optional[date] = None
    raw_text: Optional[str] = None


class LeaseOfferResponse(LeaseOfferPayload):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vehicle_id: str
    ingest_source: Optional[str] = None
    created_at: datetime
