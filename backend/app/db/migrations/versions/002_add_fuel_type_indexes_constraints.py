"""Add fuel_type column, performance indexes, and lease_offers unique constraint

Revision ID: 002
Revises: 001
Create Date: 2026-03-20

Changes:
  - vehicles: add fuel_type VARCHAR(50)
  - vehicles: add performance indexes (condition, make, year, sale_price, is_active, dealer_id)
  - dealers: add index on city
  - lease_offers: add unique constraint (vehicle_id, term_months, payment_frequency, offer_type)

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- vehicles: missing column ---
    op.add_column("vehicles", sa.Column("fuel_type", sa.String(50), nullable=True))

    # --- vehicles: performance indexes ---
    op.create_index("idx_vehicles_condition", "vehicles", ["condition"])
    op.create_index("idx_vehicles_make", "vehicles", ["make"])
    op.create_index("idx_vehicles_year", "vehicles", ["year"])
    op.create_index("idx_vehicles_sale_price", "vehicles", ["sale_price"])
    op.create_index("idx_vehicles_is_active", "vehicles", ["is_active"])
    op.create_index("idx_vehicles_dealer_id", "vehicles", ["dealer_id"])

    # --- dealers: city index ---
    op.create_index("idx_dealers_city", "dealers", ["city"])

    # --- lease_offers: unique constraint to prevent duplicates ---
    op.create_unique_constraint(
        "uq_lease_offers_vehicle_term_freq_type",
        "lease_offers",
        ["vehicle_id", "term_months", "payment_frequency", "offer_type"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_lease_offers_vehicle_term_freq_type", "lease_offers", type_="unique"
    )
    op.drop_index("idx_dealers_city", table_name="dealers")
    op.drop_index("idx_vehicles_dealer_id", table_name="vehicles")
    op.drop_index("idx_vehicles_is_active", table_name="vehicles")
    op.drop_index("idx_vehicles_sale_price", table_name="vehicles")
    op.drop_index("idx_vehicles_year", table_name="vehicles")
    op.drop_index("idx_vehicles_make", table_name="vehicles")
    op.drop_index("idx_vehicles_condition", table_name="vehicles")
    op.drop_column("vehicles", "fuel_type")
