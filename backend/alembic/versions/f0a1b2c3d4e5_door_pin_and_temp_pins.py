"""users pin fields + temporary_pins

Revision ID: f0a1b2c3d4e5
Revises: e9f0a1b2c3d4
Create Date: 2026-07-20 21:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "f0a1b2c3d4e5"
down_revision = "e9f0a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c["name"] for c in inspector.get_columns("users")}
    if "pin_hash" not in cols:
        op.add_column("users", sa.Column("pin_hash", sa.String(), nullable=True))
    if "is_active" not in cols:
        op.add_column(
            "users",
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=True),
        )
    if "expires_at" not in cols:
        op.add_column("users", sa.Column("expires_at", sa.DateTime(), nullable=True))

    tables = set(inspector.get_table_names())
    if "temporary_pins" not in tables:
        op.create_table(
            "temporary_pins",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("code_hash", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("uses_remaining", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=True),
            sa.Column("label", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_temporary_pins_code_hash", "temporary_pins", ["code_hash"])
        op.create_index("ix_temporary_pins_expires_at", "temporary_pins", ["expires_at"])


def downgrade() -> None:
    op.drop_table("temporary_pins")
    op.drop_column("users", "expires_at")
    op.drop_column("users", "is_active")
    op.drop_column("users", "pin_hash")
