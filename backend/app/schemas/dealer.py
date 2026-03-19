"""Pydantic schemas for the Dealer resource."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, HttpUrl


class DealerBase(BaseModel):
    slug: str
    name: str
    brand: str
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    inventory_url: Optional[str] = None
    is_active: bool = True


class DealerCreate(DealerBase):
    pass


class DealerUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    inventory_url: Optional[str] = None
    is_active: Optional[bool] = None


class DealerResponse(DealerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    last_crawled_at: Optional[datetime] = None
    created_at: datetime
