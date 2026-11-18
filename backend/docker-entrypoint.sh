#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Waiting for database..."
python - <<'PY'
import asyncio, os, sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

url = os.environ.get("DATABASE_URL", "")
if not url:
    print("DATABASE_URL missing", file=sys.stderr)
    sys.exit(1)

async def wait():
    engine = create_async_engine(url, pool_pre_ping=True)
    for i in range(30):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            await engine.dispose()
            print("[entrypoint] database ready")
            return
        except Exception as e:
            print(f"[entrypoint] db wait {i+1}/30: {e}")
            await asyncio.sleep(2)
    await engine.dispose()
    sys.exit(1)

asyncio.run(wait())
PY

echo "[entrypoint] ensure alembic baseline if legacy schema"
python - <<'PY'
import asyncio, os, subprocess, sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

url = os.environ["DATABASE_URL"]

async def maybe_stamp():
    engine = create_async_engine(url, pool_pre_ping=True)
    async with engine.begin() as conn:
        has_version = (await conn.execute(text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name='alembic_version'"
        ))).scalar()
        if has_version:
            await engine.dispose()
            return
        has_admin = (await conn.execute(text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name='admin_users'"
        ))).scalar()
        if not has_admin:
            await engine.dispose()
            return
        # Legacy create_all DBs: stamp to last cooler revision before drop/pin migrations
        print("[entrypoint] stamping legacy schema to d8e9f0a1b2c3")
    await engine.dispose()
    r = subprocess.run(["alembic", "stamp", "d8e9f0a1b2c3"], check=False)
    if r.returncode != 0:
        sys.exit(r.returncode)

asyncio.run(maybe_stamp())
PY

echo "[entrypoint] alembic upgrade head"
alembic upgrade head

exec "$@"
