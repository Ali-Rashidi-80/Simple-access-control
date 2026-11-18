"""add_oauth_otp_fields

Revision ID: 8cec9d931ed4
Revises:
Create Date: 2025-12-11 15:17:57.445893

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "8cec9d931ed4"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(), nullable=True),
            sa.Column("role", sa.String(), nullable=True, server_default="user"),
            sa.Column("avatar_url", sa.String(), nullable=True),
            sa.Column("rfid_tag", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
        op.create_index(op.f("ix_users_name"), "users", ["name"], unique=False)
        op.create_index(op.f("ix_users_rfid_tag"), "users", ["rfid_tag"], unique=True)

    if "admin_users" not in tables:
        op.create_table(
            "admin_users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("username", sa.String(), nullable=False),
            sa.Column("hashed_password", sa.String(), nullable=False),
            sa.Column("full_name", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=True),
            sa.Column("role", sa.String(), nullable=True, server_default="admin"),
            sa.Column("avatar_path", sa.String(), nullable=True),
            sa.Column("clearance_level", sa.Integer(), nullable=True, server_default="5"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("last_login", sa.DateTime(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
            sa.Column("google_id", sa.String(), nullable=True),
            sa.Column("phone", sa.String(), nullable=True),
            sa.Column("login_method", sa.String(), nullable=True, server_default="password"),
            sa.Column("last_ip", sa.String(), nullable=True),
            sa.Column("last_user_agent", sa.String(), nullable=True),
        )
        op.create_index(op.f("ix_admin_users_id"), "admin_users", ["id"], unique=False)
        op.create_index(op.f("ix_admin_users_username"), "admin_users", ["username"], unique=True)
        op.create_index(op.f("ix_admin_users_google_id"), "admin_users", ["google_id"], unique=True)
        op.create_index(op.f("ix_admin_users_phone"), "admin_users", ["phone"], unique=True)
    else:
        cols = {c["name"] for c in inspector.get_columns("admin_users")}
        idxs = {i["name"] for i in inspector.get_indexes("admin_users")}
        for col_name, col in (
            ("google_id", sa.Column("google_id", sa.String(), nullable=True)),
            ("phone", sa.Column("phone", sa.String(), nullable=True)),
            ("login_method", sa.Column("login_method", sa.String(), nullable=True)),
            ("last_ip", sa.Column("last_ip", sa.String(), nullable=True)),
            ("last_user_agent", sa.Column("last_user_agent", sa.String(), nullable=True)),
        ):
            if col_name not in cols:
                op.add_column("admin_users", col)
        if op.f("ix_admin_users_google_id") not in idxs:
            op.create_index(
                op.f("ix_admin_users_google_id"), "admin_users", ["google_id"], unique=True
            )
        if op.f("ix_admin_users_phone") not in idxs:
            op.create_index(op.f("ix_admin_users_phone"), "admin_users", ["phone"], unique=True)

    if "access_logs" not in tables:
        op.create_table(
            "access_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_name", sa.String(), nullable=True),
            sa.Column("rfid_tag", sa.String(), nullable=True),
            sa.Column("action", sa.String(), nullable=True),
            sa.Column("timestamp", sa.DateTime(), nullable=True),
            sa.Column("is_duress", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("temperature", sa.Float(), nullable=True),
        )
        op.create_index(op.f("ix_access_logs_id"), "access_logs", ["id"], unique=False)
        op.create_index(
            op.f("ix_access_logs_rfid_tag"), "access_logs", ["rfid_tag"], unique=False
        )
        op.create_index(
            op.f("ix_access_logs_timestamp"), "access_logs", ["timestamp"], unique=False
        )

    if "system_settings" not in tables:
        op.create_table(
            "system_settings",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("key", sa.String(), nullable=False),
            sa.Column("value", sa.Text(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index(op.f("ix_system_settings_id"), "system_settings", ["id"], unique=False)
        op.create_index(op.f("ix_system_settings_key"), "system_settings", ["key"], unique=True)

    if "login_attempts" not in tables:
        op.create_table(
            "login_attempts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("username", sa.String(), nullable=True),
            sa.Column("ip_address", sa.String(), nullable=True),
            sa.Column("success", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("timestamp", sa.DateTime(), nullable=True),
        )
        op.create_index(op.f("ix_login_attempts_id"), "login_attempts", ["id"], unique=False)
        op.create_index(
            op.f("ix_login_attempts_username"), "login_attempts", ["username"], unique=False
        )
        op.create_index(
            op.f("ix_login_attempts_ip_address"), "login_attempts", ["ip_address"], unique=False
        )
        op.create_index(
            op.f("ix_login_attempts_timestamp"), "login_attempts", ["timestamp"], unique=False
        )

    if "mobile_otp" not in tables:
        op.create_table(
            "mobile_otp",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("phone", sa.String(), nullable=False),
            sa.Column("otp", sa.String(length=6), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("attempts", sa.Integer(), nullable=True, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("client_ip", sa.String(), nullable=True),
            sa.Column("user_agent", sa.String(), nullable=True),
        )
        op.create_index(op.f("ix_mobile_otp_id"), "mobile_otp", ["id"], unique=False)
        op.create_index(op.f("ix_mobile_otp_phone"), "mobile_otp", ["phone"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "admin_users" in set(inspector.get_table_names()):
        idxs = {i["name"] for i in inspector.get_indexes("admin_users")}
        cols = {c["name"] for c in inspector.get_columns("admin_users")}
        if op.f("ix_admin_users_phone") in idxs:
            op.drop_index(op.f("ix_admin_users_phone"), table_name="admin_users")
        if op.f("ix_admin_users_google_id") in idxs:
            op.drop_index(op.f("ix_admin_users_google_id"), table_name="admin_users")
        for col in ("last_user_agent", "last_ip", "login_method", "phone", "google_id"):
            if col in cols:
                op.drop_column("admin_users", col)
