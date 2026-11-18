# SentryGate Door — Deployment

## Compose stacks

| File | Services |
|------|----------|
| [`docker-compose.yml`](../docker-compose.yml) | `db` + `redis` + `backend` + `frontend` (nginx + `web/out`) |
| [`docker-compose.local-mirror.yml`](../docker-compose.local-mirror.yml) | Same stack, alternate ports/names for side-by-side dev |
| [`backend/docker-compose.yml`](../backend/docker-compose.yml) | API-only variant |

Images and package registries default to **Chabokan** `mirror2.chabokan.net` (Docker base images, npm, PyPI, apt) — see Dockerfiles in `backend/`, `web/`.

---

## Prerequisites

1. Copy env template — **never commit real `.env`:**
   ```bash
   cp .env.example .env
   ```
2. Set strong placeholders in `.env`:
   - `JWT_SECRET_KEY`
   - `HARDWARE_TOKEN` (must match ESP32 `config.json`)
   - `PIN_PEPPER` / `PIN_PEPPER_ID`
   - `POSTGRES_PASSWORD`, `REDIS_PASSWORD`
3. ESP32 door config:
   ```bash
   cp micro-python-esp32/config.example.json micro-python-esp32/config.json
   ```
   `hardware_token` = `HARDWARE_TOKEN`; `device_role` = `door`.
4. **Alembic:** container entrypoint runs `alembic upgrade head` before uvicorn starts. For bare-metal backend, run manually from `backend/` after DB is up.

---

## Full stack

```powershell
$env:DOCKER_BUILDKIT = "1"
docker compose --env-file .env up -d --build
```

| Service | Default host port | Notes |
|---------|-------------------|-------|
| frontend (nginx) | `5173` | Serves static export from `web/out` |
| backend | `8000` | Override with `BACKEND_PUBLISH_PORT` |
| postgres | internal only | Host publish commented out in compose |
| redis | internal only | Required for OTP/session helpers |

- Health: `GET http://127.0.0.1:<BACKEND_PUBLISH_PORT>/health` → `{"status":"ok"}`
- API docs: `/docs`

---

## Backend runtime constraints

- **Single worker:** `uvicorn … --workers 1` (see `backend/Dockerfile`). WebSocket client registry is in-process; multiple workers need Redis pub/sub fanout (not shipped).
- **Redis:** set `REDIS_URL` (compose injects from `REDIS_PASSWORD`).
- **Entrypoint:** waits for Postgres, runs `alembic upgrade head`, then execs uvicorn.

---

## Key environment variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET_KEY` | Signs admin JWT / `sg_access` cookie |
| `HARDWARE_TOKEN` | Door WebSocket + allowlist API auth |
| `PIN_PEPPER` | Server-side pepper for device HMAC key derivation |
| `PIN_PEPPER_ID` | Pepper version tag in allowlist (rotation) |
| `REDIS_URL` | Redis connection string |
| `COOKIE_SECURE` | `true` behind HTTPS |
| `TRUSTED_PROXY_IPS` | Trust `X-Forwarded-For` from these proxies |
| `CORS_ORIGINS` | Allowed Origin prefixes (CSRF check) |
| `FRONTEND_URL` | Admin UI base URL (also merged into CORS) |
| `SMS_USERNAME` / `SMS_PASSWORD` / `SMS_SENDER_NUMBER` | Optional Melipayamak OTP |

See [`.env.example`](../.env.example) for the full template (placeholders only).

---

## Local mirror stack

```powershell
docker compose -p sentrygate-mirror -f docker-compose.local-mirror.yml --env-file .env.local-mirror up -d --build
```

Copy from `.env.local-mirror.example` if present.

---

## Chabokan split deploy

Use [`.env.chabokan.split.example`](../.env.chabokan.split.example) as a checklist for managed Postgres, Redis, backend container, and frontend nginx container on separate Chabokan services.

---

## Building admin UI locally

```powershell
cd web
npm config set registry https://mirror2.chabokan.net/npm/
npm install
npm run build    # writes web/out/
```

Docker build runs the same steps inside the `web/Dockerfile` builder stage.

---

## Health checks

| Service | Check |
|---------|-------|
| Backend | `GET /health` |
| Frontend | `GET /` (nginx) |
| Postgres | `pg_isready` |
| Redis | `redis-cli PING` |

---

## Security

- Example env files contain **placeholders only** — no live credentials.
- Rotate any secret ever committed to git history.
- Set `COOKIE_SECURE=true` and HTTPS in production.
- Keep `PIN_PEPPER` stable; changing it invalidates all stored PIN hashes unless re-provisioned.

