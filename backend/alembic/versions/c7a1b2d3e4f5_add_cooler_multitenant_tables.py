"""add cooler multi-tenant tables

Revision ID: c7a1b2d3e4f5
Revises: 5c60813a6ca3
Create Date: 2026-07-20 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c7a1b2d3e4f5"
down_revision = "5c60813a6ca3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_customers_id", "customers", ["id"])
    op.create_index("ix_customers_name", "customers", ["name"])

    op.create_table(
        "cooler_devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("device_id", sa.String(), nullable=False),
        sa.Column("hardware_token_hash", sa.String(), nullable=False),
        sa.Column("last_state", sa.Integer(), nullable=True),
        sa.Column("last_seen", sa.DateTime(), nullable=True),
        sa.Column("is_online", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_cooler_devices_id", "cooler_devices", ["id"])
    op.create_index("ix_cooler_devices_customer_id", "cooler_devices", ["customer_id"])
    op.create_index("ix_cooler_devices_device_id", "cooler_devices", ["device_id"], unique=True)

    op.create_table(
        "customer_memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_user_id", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("admin_user_id", "customer_id", name="uq_membership_user_customer"),
    )
    op.create_index("ix_customer_memberships_id", "customer_memberships", ["id"])
    op.create_index("ix_customer_memberships_admin_user_id", "customer_memberships", ["admin_user_id"])
    op.create_index("ix_customer_memberships_customer_id", "customer_memberships", ["customer_id"])

    op.create_table(
        "cooler_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("device_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_cooler_events_id", "cooler_events", ["id"])
    op.create_index("ix_cooler_events_customer_id", "cooler_events", ["customer_id"])
    op.create_index("ix_cooler_events_device_id", "cooler_events", ["device_id"])
    op.create_index("ix_cooler_events_created_at", "cooler_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("cooler_events")
    op.drop_table("customer_memberships")
    op.drop_table("cooler_devices")
    op.drop_table("customers")
