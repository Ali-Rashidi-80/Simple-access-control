"""add_performance_indices

Revision ID: 5c60813a6ca3
Revises: 8cec9d931ed4
Create Date: 2025-12-11 15:20:31.231717

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "5c60813a6ca3"
down_revision = "8cec9d931ed4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "admin_users" in tables:
        admin_idxs = {i["name"] for i in inspector.get_indexes("admin_users")}
        if op.f("ix_admin_users_last_ip") not in admin_idxs:
            op.create_index(
                op.f("ix_admin_users_last_ip"), "admin_users", ["last_ip"], unique=False
            )
        if op.f("ix_admin_users_last_login") not in admin_idxs:
            op.create_index(
                op.f("ix_admin_users_last_login"), "admin_users", ["last_login"], unique=False
            )

    if "mobile_otp" in tables:
        otp_idxs = {i["name"] for i in inspector.get_indexes("mobile_otp")}
        if op.f("ix_mobile_otp_expires_at") not in otp_idxs:
            op.create_index(
                op.f("ix_mobile_otp_expires_at"), "mobile_otp", ["expires_at"], unique=False
            )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "mobile_otp" in tables:
        otp_idxs = {i["name"] for i in inspector.get_indexes("mobile_otp")}
        if op.f("ix_mobile_otp_expires_at") in otp_idxs:
            op.drop_index(op.f("ix_mobile_otp_expires_at"), table_name="mobile_otp")

    if "admin_users" in tables:
        admin_idxs = {i["name"] for i in inspector.get_indexes("admin_users")}
        if op.f("ix_admin_users_last_login") in admin_idxs:
            op.drop_index(op.f("ix_admin_users_last_login"), table_name="admin_users")
        if op.f("ix_admin_users_last_ip") in admin_idxs:
            op.drop_index(op.f("ix_admin_users_last_ip"), table_name="admin_users")
