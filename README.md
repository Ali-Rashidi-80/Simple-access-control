# SentryGate Door

IoT access control: **Next.js admin UI** (`web/`, static export served by **nginx**), **FastAPI** backend, **ESP32 MicroPython** door firmware.

**This build is door-only** — no cooler fleet, no BLE/NFC wallet, no biometric unlock.

---

## Unlock channels (this build)

| Channel | Where | Notes |
|---------|--------|--------|
| **RFID** | ESP32 RC522 | UID checked against synced allowlist (online or offline) |
| **Keypad PIN** | 4×3 matrix | 4–8 digits; HMAC-SHA256 vs allowlist `pin_hash` |
| **Temporary PIN** | Admin UI → allowlist | Time/usage limited; consumed on device |
| **Remote OPEN** | Dashboard WebSocket | Admin sends `OPEN`; respects secure-hours policy |
| **SoftAP provision** | GPIO 33 hold at boot | Wi‑Fi/credentials setup only — not an unlock path |

Offline: device caches allowlist in `allowlist.json` and validates RFID/PIN locally when the server is unreachable.

---

## Stack

| Layer | Tech |
|-------|------|
| Admin UI | Next.js 15 (`web/`) → `output: "export"` → nginx |
| API | FastAPI + PostgreSQL + Redis |
| Device | ESP32 + MicroPython (`micro-python-esp32/`) |
| Deploy | Docker Compose (Chabokan mirrors) |

Legacy **React + Vite** UI (`frontend/`) remains in the repo but is **not** the Docker default.

---

## Quick start

```bash
cp .env.example .env          # fill placeholders — never commit .env
cp micro-python-esp32/config.example.json micro-python-esp32/config.json
docker compose --env-file .env up -d --build
```

- **Dashboard:** `http://localhost:5173` (nginx → static `web/out`)
- **API health:** `http://localhost:8000/health`
- **API docs:** `http://localhost:8000/docs`

---

## Documentation

| Doc | Contents |
|-----|----------|
| [Architecture](docs/ARCHITECTURE.md) | Data flow, auth cookie, CSRF, allowlist, HMAC PIN |
| [Hardware guide](docs/HARDWARE_GUIDE.md) | BOM, GPIO pinout, wiring |
| [Deployment](docs/DEPLOYMENT.md) | Docker, Alembic, Redis, Chabokan, env vars |
| [Roadmap](docs/ROADMAP.md) | Future features (BLE, NFC, etc.) |
| [Testing](TESTING.md) | Pytest / Playwright |

---

## Security notes

- Session cookie: `sg_access` (HttpOnly; set `COOKIE_SECURE=true` behind HTTPS).
- Mutating API calls require a matching `Origin` / `Referer` (see `CORS_ORIGINS`).
- Set strong `JWT_SECRET_KEY`, `HARDWARE_TOKEN`, and `PIN_PEPPER` in production.
- Do not commit `.env` or `micro-python-esp32/config.json`.
