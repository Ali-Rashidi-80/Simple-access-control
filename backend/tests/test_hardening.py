"""Hardening tests: CSRF, RBAC, Admin self-protection, OAuth, Avatar, CSV export, Alembic."""

import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from httpx import AsyncClient


async def _login_headers(
    client: AsyncClient, username: str = "admin", password: str = "admin123"
) -> dict[str, str]:
    resp = await client.post("/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _create_operator(
    client: AsyncClient, admin_headers: dict[str, str], username: str = "op1"
):
    resp = await client.post(
        "/auth/admins",
        json={
            "username": username,
            "password": "operator123",
            "full_name": "Operator One",
            "phone": "09120000055",
            "role": "operator",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_csrf_origin_bypass_rejected(client: AsyncClient):
    headers = await _login_headers(client)

    evil_origin = await client.post(
        "/users/",
        json={"name": "Evil", "rfid_tag": "EVIL01", "role": "user"},
        headers={**headers, "Origin": "http://localhost:5173.evil.com"},
    )
    assert evil_origin.status_code == 403

    evil_referer = await client.post(
        "/users/",
        json={"name": "EvilRef", "rfid_tag": "EVIL02", "role": "user"},
        headers={**headers, "Referer": "https://evil.example.com/attack"},
    )
    assert evil_referer.status_code == 403

    good_origin = await client.post(
        "/users/",
        json={"name": "Good", "rfid_tag": "GOOD01", "role": "user"},
        headers={**headers, "Origin": "http://localhost:5173"},
    )
    assert good_origin.status_code == 200


@pytest.mark.asyncio
async def test_rbac_restricts_settings_backup_and_admins_to_admin(client: AsyncClient):
    admin_headers = await _login_headers(client)
    await _create_operator(client, admin_headers, username="op_rbac")
    op_headers = await _login_headers(client, "op_rbac", "operator123")

    assert (
        await client.put("/settings/", json={"settings": {"theme": "light"}}, headers=op_headers)
    ).status_code == 403
    assert (await client.post("/api/debug/backup", headers=op_headers)).status_code == 403
    assert (await client.get("/auth/admins", headers=op_headers)).status_code == 403
    assert (
        await client.post(
            "/auth/admins",
            json={"username": "op2", "password": "password123", "full_name": "Op2"},
            headers=op_headers,
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_admin_self_protection_phone_uniqueness_and_idempotency(client: AsyncClient):
    admin_headers = await _login_headers(client)
    me = (await client.get("/auth/me", headers=admin_headers)).json()

    # Cannot deactivate or demote self
    self_deact = await client.patch(
        f"/auth/admins/{me['id']}", json={"is_active": False}, headers=admin_headers
    )
    assert self_deact.status_code == 400

    self_demote = await client.patch(
        f"/auth/admins/{me['id']}", json={"role": "operator"}, headers=admin_headers
    )
    assert self_demote.status_code == 400

    # Idempotency-Key on POST /auth/admins
    idem_headers = {**admin_headers, "Idempotency-Key": "create-op-idem-1"}
    c1 = await client.post(
        "/auth/admins",
        json={
            "username": "op_idem",
            "password": "password123",
            "full_name": "Idem Op",
            "phone": "09120000077",
            "role": "operator",
        },
        headers=idem_headers,
    )
    c2 = await client.post(
        "/auth/admins",
        json={
            "username": "op_idem",
            "password": "password123",
            "full_name": "Idem Op",
            "phone": "09120000077",
            "role": "operator",
        },
        headers=idem_headers,
    )
    assert c1.status_code == 201
    assert c2.status_code == 201
    assert c1.json()["id"] == c2.json()["id"]

    # Duplicate phone rejected cleanly
    dup_phone = await client.post(
        "/auth/admins",
        json={
            "username": "op_dup_phone",
            "password": "password123",
            "full_name": "Dup Phone",
            "phone": "+989120000077",
            "role": "operator",
        },
        headers=admin_headers,
    )
    assert dup_phone.status_code == 400


@pytest.mark.asyncio
async def test_google_oauth_requires_verified_email_and_no_ip_hijack(db_session):
    from app import models
    from app.services.google_oauth import GoogleUserInfo, find_or_create_google_user

    # Existing user at same IP with no email must NOT be hijacked by IP fingerprint
    victim = models.AdminUser(
        username="victim_admin",
        hashed_password="x",
        full_name="Victim",
        email="",
        role="admin",
        last_ip="203.0.113.10",
        last_login=models.utc_now(),
        is_active=True,
    )
    db_session.add(victim)
    await db_session.commit()

    unverified = GoogleUserInfo(
        id="goog-unverified",
        email="attacker@example.com",
        name="Attacker",
        verified_email=False,
    )
    with pytest.raises(HTTPException) as exc:
        await find_or_create_google_user(unverified, db_session, "203.0.113.10", "UA")
    assert exc.value.status_code == 403

    verified = GoogleUserInfo(
        id="goog-verified-1",
        email="fresh@example.com",
        name="Fresh User",
        verified_email=True,
    )
    created = await find_or_create_google_user(verified, db_session, "203.0.113.10", "UA")
    assert created.id != victim.id
    assert created.username.startswith("google_")
    assert created.role == "operator"


@pytest.mark.asyncio
async def test_user_patch_put_idempotency_and_expires_at(client: AsyncClient):
    headers = await _login_headers(client)
    idem_headers = {**headers, "Idempotency-Key": "create-user-idem-1"}

    u1 = await client.post(
        "/users/",
        json={"name": "User Edit", "rfid_tag": "EDIT001", "role": "user"},
        headers=idem_headers,
    )
    u2 = await client.post(
        "/users/",
        json={"name": "User Edit", "rfid_tag": "EDIT001", "role": "user"},
        headers=idem_headers,
    )
    assert u1.status_code == 200 and u2.status_code == 200
    assert u1.json()["id"] == u2.json()["id"]
    uid = u1.json()["id"]

    # Create second user to test duplicate RFID on PATCH
    other = await client.post(
        "/users/",
        json={"name": "Other", "rfid_tag": "OTHER002", "role": "user"},
        headers=headers,
    )
    assert other.status_code == 200

    dup_patch = await client.patch(
        f"/users/{uid}",
        json={"rfid_tag": "OTHER002"},
        headers=headers,
    )
    assert dup_patch.status_code == 400

    future = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    patched = await client.patch(
        f"/users/{uid}",
        json={"name": "Edited Name", "is_active": False, "expires_at": future},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Edited Name"
    assert patched.json()["is_active"] is False
    assert patched.json()["expires_at"] is not None
    assert patched.json()["has_pin"] is False

    put_alias = await client.put(
        f"/users/{uid}",
        json={"is_active": True, "expires_at": None},
        headers=headers,
    )
    assert put_alias.status_code == 200
    assert put_alias.json()["is_active"] is True
    assert put_alias.json()["expires_at"] is None


@pytest.mark.asyncio
async def test_settings_validation_and_duress_clear(client: AsyncClient):
    headers = await _login_headers(client)

    bad_hour = await client.put(
        "/settings/", json={"settings": {"auto_lock_start": "25"}}, headers=headers
    )
    assert bad_hour.status_code == 422

    bad_timer = await client.put(
        "/settings/", json={"settings": {"timer_duration": "99"}}, headers=headers
    )
    assert bad_timer.status_code == 422

    bad_phone = await client.put(
        "/settings/", json={"settings": {"alert_phone": "not-a-phone"}}, headers=headers
    )
    assert bad_phone.status_code == 422

    set_pin = await client.put(
        "/settings/",
        json={"settings": {"duress_pin": "2468", "alert_phone": "09120000001"}},
        headers=headers,
    )
    assert set_pin.status_code == 200
    s1 = (await client.get("/settings/", headers=headers)).json()["settings"]
    assert s1["duress_pin_hash"] == "__CONFIGURED__"

    cleared1 = await client.put(
        "/settings/", json={"settings": {"duress_pin": "__CLEAR__"}}, headers=headers
    )
    assert cleared1.status_code == 200
    s2 = (await client.get("/settings/", headers=headers)).json()["settings"]
    assert s2["duress_pin_hash"] == ""

    await client.put("/settings/", json={"settings": {"duress_pin": "1357"}}, headers=headers)
    cleared2 = await client.put(
        "/settings/", json={"settings": {"clear_duress_pin": "true"}}, headers=headers
    )
    assert cleared2.status_code == 200
    s3 = (await client.get("/settings/", headers=headers)).json()["settings"]
    assert s3["duress_pin_hash"] == ""


@pytest.mark.asyncio
async def test_logs_search_pin_denied_and_csv_export(client: AsyncClient, db_session):
    from app import models

    headers = await _login_headers(client)
    db_session.add_all(
        [
            models.AccessLog(user_name="=cmd|calc", rfid_tag="TAG_CSV_1", action="GRANTED"),
            models.AccessLog(user_name="+SUM(1,2)", rfid_tag="PIN", action="PIN_DENIED"),
            models.AccessLog(user_name="-EVIL", rfid_tag="@TAG", action="DENIED"),
        ]
    )
    await db_session.commit()

    # Search q
    q_resp = await client.get("/logs/?q=TAG_CSV_1", headers=headers)
    assert q_resp.status_code == 200
    assert q_resp.json()["total"] == 1

    # PIN_DENIED included in status=error and stats.error
    err_resp = await client.get("/logs/?status=error", headers=headers)
    assert err_resp.status_code == 200
    assert err_resp.json()["total"] == 2
    assert err_resp.json()["stats"]["error"] == 2
    assert err_resp.json()["stats"]["success"] == 1

    # CSV export UTF-8 BOM + formula injection escaping
    csv_resp = await client.get("/logs/export", headers=headers)
    assert csv_resp.status_code == 200
    assert csv_resp.content.startswith(b"\xef\xbb\xbf")
    text = csv_resp.content.decode("utf-8-sig")
    assert "'=cmd|calc" in text
    assert "'+SUM(1,2)" in text
    assert "'-EVIL" in text
    assert "'@TAG" in text


@pytest.mark.asyncio
async def test_avatar_upload_validation_and_safe_delete(client: AsyncClient, tmp_path, monkeypatch):
    import app.main as main_module

    upload_dir = tmp_path / "uploads"
    avatar_dir = upload_dir / "avatars"
    avatar_dir.mkdir(parents=True)
    monkeypatch.setattr(main_module, "UPLOAD_DIR", str(upload_dir))
    monkeypatch.setattr(main_module, "AVATAR_DIR", str(avatar_dir))

    headers = await _login_headers(client)

    # Reject non-image magic bytes disguised as image/png
    bad_magic = await client.post(
        "/profile/avatar",
        files={"file": ("evil.png", b"<?php echo 1; ?>", "image/png")},
        headers=headers,
    )
    assert bad_magic.status_code == 400

    # Reject > 5MB
    oversized = await client.post(
        "/profile/avatar",
        files={
            "file": ("big.png", b"\x89PNG\r\n\x1a\n" + b"0" * (5 * 1024 * 1024 + 10), "image/png")
        },
        headers=headers,
    )
    assert oversized.status_code == 400

    # Valid PNG accepted and subsequent upload cleans old file safely
    valid_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    ok1 = await client.post(
        "/profile/avatar",
        files={"file": ("avatar.png", valid_png, "image/png")},
        headers=headers,
    )
    assert ok1.status_code == 200
    first_url = ok1.json()["avatar_url"]
    first_file = upload_dir / first_url.removeprefix("/uploads/")
    assert first_file.exists()

    valid_jpg = b"\xff\xd8\xff\xe0" + b"\x00" * 32
    ok2 = await client.post(
        "/profile/avatar",
        files={"file": ("avatar.jpg", valid_jpg, "image/jpeg")},
        headers=headers,
    )
    assert ok2.status_code == 200
    assert not first_file.exists()


def test_redis_store_bounded_memory_and_set_nx_ex():
    from app.services import redis_store

    redis_store.clear_memory()
    assert redis_store.set_nx_ex("lock-1", "a", 30) is True
    assert redis_store.set_nx_ex("lock-1", "b", 30) is False
    assert redis_store.get("lock-1") == "a"
    redis_store.delete("lock-1")
    assert redis_store.set_nx_ex("lock-1", "b", 30) is True

    # Bounded capacity check
    for i in range(redis_store.MAX_MEMORY_KEYS + 25):
        redis_store.set_ex(f"cap:{i}", "1", 60)
    assert len(redis_store._memory) <= redis_store.MAX_MEMORY_KEYS
    redis_store.clear_memory()


def test_alembic_upgrade_head_on_fresh_sqlite(tmp_path):
    db_file = tmp_path / "alembic_smoke.db"
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_file.as_posix()}"
    env["SKIP_DOTENV"] = "1"
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    proc = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"alembic failed:\n{proc.stdout}\n{proc.stderr}"
