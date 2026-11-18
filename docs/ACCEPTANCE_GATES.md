# Acceptance Gates A–X

Checklist for the SentryGate Door build (Next.js + FastAPI + ESP32).

| Gate | Criterion | How to verify |
|------|-----------|---------------|
| A | Cooler code/paths removed | No `cooler_*` routers/models; `cooler-web/` absent |
| B | Next.js in `web/` + Chabokan Docker | `web/Dockerfile`, compose `frontend` → `./web` |
| C | Cookie auth `sg_access` | Login sets httpOnly cookie; `/auth/me` with credentials |
| D | CSRF Origin on mutating routes | Bad Origin → 403 |
| E | RBAC admin/operator | `/auth/admins` admin-only; operators cannot create admins |
| F | RFID users CRUD | `/users/` + UI Users page |
| G | Offline allowlist API | `GET /api/hardware/allowlist` + `X-Hardware-Token` |
| H | SoftAP exclusive firmware | GPIO33 / WiFi fails; unlock disabled in SoftAP |
| I | Redis OAuth/rate-limit | `REDIS_URL` used by `redis_store` / Google state |
| J | `npm ci` + lockfile | `web/package-lock.json` present |
| K | Uvicorn `workers=1` | Backend Dockerfile CMD |
| L | Vite `frontend/` removed | Directory absent after Next parity |
| M | Stub biometric/2FA UI removed | Settings has honest door options only |
| N | `pg_dump` backup | `create_backup()` uses `pg_dump` for Postgres |
| O | Alembic-only prod migrate | `docker-entrypoint.sh` runs `alembic upgrade head` |
| P | e2e path exists | `e2e/` Playwright against served UI |
| Q | Trusted proxy IP | `TRUSTED_PROXY_IPS` + `auth_deps.get_client_ip` |
| R | Asia/Tehran schedule | Processor secure window uses Tehran TZ |
| S | Permanent PIN HMAC + constant-time | `pin_crypto` + firmware `pin_hmac.py` |
| T | Temp PIN offline; no NTP → DENY | Firmware `allowlist.py` + `ntp_time.py` |
| U | RFID+PIN 10s window | Firmware when `require_pin_with_rfid` |
| V | Duress PIN/RFID → OPEN + `is_duress` | Settings + firmware/server |
| W | SoftAP exclusive; SMS no plaintext | `alert_sms` logs mask only; SoftAP module |
| X | Static export auth via `/auth/me`; WS same-origin; GPIO33; local-first | `web/` export + nginx `/ws` Upgrade |

## Quick local commands

```bash
# Backend + firmware unit/integration tests
cd backend && PYTHONNOUSERSITE=1 SKIP_DOTENV=1 REDIS_URL=memory:// pytest -v

# Frontend typecheck, lint & static export
cd web && npm run typecheck && npm run lint && npm run build

# Playwright E2E (uses web/out + e2e/serve-stack.mjs + FastAPI uvicorn)
cd e2e && npx playwright test --workers=1

# Stack
docker compose --env-file .env up -d --build
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:5173/
```
