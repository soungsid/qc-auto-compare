"""
SQLAlchemy 2.x async ORM models for the QC Auto Compare platform.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    """Return current UTC time as a naive datetime (required by TIMESTAMP WITHOUT TIME ZONE columns)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Dealer(Base):
    """An authorized vehicle dealer in Quebec."""

    __tablename__ = "dealers"
    __table_args__ = (
        # BUG #5: Index for city filtering
        Index("idx_dealers_city", "city"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    website: Mapped[Optional[str]] = mapped_column(String(500))
    inventory_url: Mapped[Optional[str]] = mapped_column(String(500))
    last_crawled_at: Mapped[Optional[datetime]] = mapped_column()
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    # Relationships
    vehicles: Mapped[list["Vehicle"]] = relationship("Vehicle", back_populates="dealer")

    def __repr__(self) -> str:
        return f"<Dealer {self.slug!r}>"


class Vehicle(Base):
    """A vehicle listing from a Quebec dealer."""

    __tablename__ = "vehicles"
    __table_args__ = (
        UniqueConstraint("fingerprint", name="uq_vehicles_fingerprint"),
        # BUG #5: Performance indexes for commonly filtered columns
        Index("idx_vehicles_condition", "condition"),
        Index("idx_vehicles_make", "make"),
        Index("idx_vehicles_year", "year"),
        Index("idx_vehicles_sale_price", "sale_price"),
        Index("idx_vehicles_is_active", "is_active"),
        Index("idx_vehicles_dealer_id", "dealer_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    dealer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("dealers.id"), nullable=True
    )

    # Identity
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    trim: Mapped[Optional[str]] = mapped_column(String(100))
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    condition: Mapped[str] = mapped_column(String(20), nullable=False, default="new")

    # Specs
    color_ext: Mapped[Optional[str]] = mapped_column(String(100))
    color_int: Mapped[Optional[str]] = mapped_column(String(100))
    drivetrain: Mapped[Optional[str]] = mapped_column(String(10))
    transmission: Mapped[Optional[str]] = mapped_column(String(20))
    mileage_km: Mapped[int] = mapped_column(Integer, default=0)

    # Identifiers
    vin: Mapped[Optional[str]] = mapped_column(String(17))
    stock_number: Mapped[Optional[str]] = mapped_column(String(50))

    # Pricing
    msrp: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    sale_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    freight_pdi: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))

    # Listing
    listing_url: Mapped[Optional[str]] = mapped_column(String(1000))
    image_url: Mapped[Optional[str]] = mapped_column(String(1000))

    # Ingestion metadata
    ingest_source: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column()

    # Relationships
    dealer: Mapped[Optional["Dealer"]] = relationship("Dealer", back_populates="vehicles")
    lease_offers: Mapped[list["LeaseOffer"]] = relationship(
        "LeaseOffer", back_populates="vehicle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Vehicle {self.year} {self.make} {self.model} [{self.fingerprint[:8]}]>"


class LeaseOffer(Base):
    """A financing or lease offer associated with a vehicle."""

    __tablename__ = "lease_offers"
    __table_args__ = (
        # BUG #6: Unique constraint to prevent duplicate lease offers
        UniqueConstraint(
            "vehicle_id", "term_months", "payment_frequency", "offer_type",
            name="uq_lease_offers_vehicle_term_freq_type"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id"), nullable=False
    )

    offer_type: Mapped[Optional[str]] = mapped_column(String(20))  # lease/finance/cash
    term_months: Mapped[Optional[int]] = mapped_column(Integer)
    payment_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    payment_frequency: Mapped[Optional[str]] = mapped_column(String(20))
    down_payment: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    annual_km: Mapped[Optional[int]] = mapped_column(Integer)
    residual_value: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    interest_rate_pct: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    offer_expiry: Mapped[Optional[datetime]] = mapped_column(Date)
    raw_text: Mapped[Optional[str]] = mapped_column(Text)
    ingest_source: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="lease_offers")


class IngestLog(Base):
    """Audit log for every ingestion attempt from any source."""

    __tablename__ = "ingest_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    ingest_source: Mapped[str] = mapped_column(String(50), nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # created/updated/skipped/error
    vehicle_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("vehicles.id"), nullable=True
    )
    payload_hash: Mapped[Optional[str]] = mapped_column(String(64))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
