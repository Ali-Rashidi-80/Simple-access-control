"""drop cooler multi-tenant tables

Revision ID: e9f0a1b2c3d4
Revises: d8e9f0a1b2c3
Create Date: 2026-07-20 21:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = "e9f0a1b2c3d4"
down_revision = "d8e9f0a1b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    cascade = " CASCADE" if op.get_bind().dialect.name == "postgresql" else ""
    for table in (
        "cooler_schedules",
        "cooler_events",
        "customer_memberships",
        "cooler_devices",
        "customers",
    ):
        op.execute(sa.text(f"DROP TABLE IF EXISTS {table}{cascade}"))


def downgrade() -> None:
    pass
