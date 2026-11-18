"""cooler resilience fields (historical)

Revision ID: d8e9f0a1b2c3
Revises: c7a1b2d3e4f5
Create Date: 2026-07-20 20:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "d8e9f0a1b2c3"
down_revision = "c7a1b2d3e4f5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Historical migration — columns may already exist on legacy DBs
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())
    if "customers" in tables:
        cols = {c["name"] for c in inspector.get_columns("customers")}
        if "alert_phone" not in cols:
            op.add_column("customers", sa.Column("alert_phone", sa.String(), nullable=True))
    if "cooler_devices" in tables:
        cols = {c["name"] for c in inspector.get_columns("cooler_devices")}
        for name, col in (
            ("last_ack_status", sa.Column("last_ack_status", sa.String(), nullable=True)),
            ("last_ack_command_id", sa.Column("last_ack_command_id", sa.String(), nullable=True)),
            ("last_ack_at", sa.Column("last_ack_at", sa.DateTime(), nullable=True)),
            ("offline_alerted_at", sa.Column("offline_alerted_at", sa.DateTime(), nullable=True)),
        ):
            if name not in cols:
                op.add_column("cooler_devices", col)


def downgrade() -> None:
    pass
