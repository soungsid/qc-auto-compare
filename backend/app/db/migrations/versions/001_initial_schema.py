"""Initial schema baseline

Revision ID: 001
Revises:
Create Date: 2026-03-20

This migration reflects the initial state of the database (tables created by
create_all before Alembic was introduced). Stamp the production DB with this
revision before running upgrade to head.

  docker compose exec backend alembic stamp 001
  docker compose exec backend alembic upgrade head

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial schema from scratch (skipped when stamping existing DBs)."""
    op.create_table(
        "dealers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("brand", sa.String(100), nullable=False),
        sa.Column("address", sa.Text),
        sa.Column("city", sa.String(100)),
        sa.Column("phone", sa.String(30)),
        sa.Column("website", sa.String(500)),
        sa.Column("inventory_url", sa.String(500)),
        sa.Column("last_crawled_at", sa.DateTime),
        sa.Column("is_active", sa.Boolean, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "vehicles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("fingerprint", sa.String(64), nullable=False, unique=True),
        sa.Column("dealer_id", sa.String(36), sa.ForeignKey("dealers.id")),
        sa.Column("make", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("trim", sa.String(100)),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("condition", sa.String(20), nullable=False),
        sa.Column("color_ext", sa.String(100)),
        sa.Column("color_int", sa.String(100)),
        sa.Column("body_type", sa.String(50)),
        sa.Column("drivetrain", sa.String(10)),
        sa.Column("transmission", sa.String(20)),
        sa.Column("mileage_km", sa.Integer, nullable=False),
        sa.Column("vin", sa.String(17)),
        sa.Column("stock_number", sa.String(50)),
        sa.Column("msrp", sa.Numeric(12, 2)),
        sa.Column("sale_price", sa.Numeric(12, 2)),
        sa.Column("freight_pdi", sa.Numeric(12, 2)),
        sa.Column("listing_url", sa.String(1000)),
        sa.Column("image_url", sa.String(1000)),
        sa.Column("ingest_source", sa.String(50), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False),
        sa.Column("last_seen_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime),
        sa.UniqueConstraint("fingerprint", name="uq_vehicles_fingerprint"),
    )
    op.create_table(
        "lease_offers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "vehicle_id",
            sa.String(36),
            sa.ForeignKey("vehicles.id"),
            nullable=False,
        ),
        sa.Column("offer_type", sa.String(20)),
        sa.Column("term_months", sa.Integer),
        sa.Column("payment_amount", sa.Numeric(10, 2)),
        sa.Column("payment_frequency", sa.String(20)),
        sa.Column("down_payment", sa.Numeric(10, 2)),
        sa.Column("annual_km", sa.Integer),
        sa.Column("residual_value", sa.Numeric(10, 2)),
        sa.Column("interest_rate_pct", sa.Numeric(6, 3)),
        sa.Column("offer_expiry", sa.Date),
        sa.Column("raw_text", sa.Text),
        sa.Column("ingest_source", sa.String(50)),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "ingest_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ingest_source", sa.String(50), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("vehicle_id", sa.String(36), sa.ForeignKey("vehicles.id")),
        sa.Column("payload_hash", sa.String(64)),
        sa.Column("error_message", sa.Text),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("ingest_log")
    op.drop_table("lease_offers")
    op.drop_table("vehicles")
    op.drop_table("dealers")
