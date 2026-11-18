# SentryGate Door — Architecture

## Components

```
┌─────────────┐     HTTPS/WSS      ┌──────────────┐     SQL      ┌──────────┐
│  web/ (SPA) │ ◄────────────────► │ FastAPI      │ ◄──────────► │ Postgres │
│  nginx      │   /api  /ws        │ workers=1    │              └──────────┘
└─────────────┘                    │              │     Redis    ┌──────────┐
                                   │              │ ◄──────────► │ Redis    │
┌─────────────┐   WSS + REST       └──────────────┘              └──────────┘
│ ESP32 door  │ ◄────────────────►       ▲
│ MicroPython │   allowlist sync         │ sg_access JWT
└─────────────┘                          │
```

| Layer | Role |
|-------|------|
| **web/** | Next.js static export (`trailingSlash: true`); nginx serves static `out/` routes (including `/users/`, `/logs/`, `/settings/`, `/profile/` HTML & `.txt` RSC payloads) and reverse-proxies API/upload/health calls plus `/ws` Upgrade to backend |
| **Backend** | Auth, users, logs, allowlist build, temp PINs, WebSocket hub |
| **ESP32** | RFID, keypad, relay, buzzer, offline allowlist, SoftAP provision |
| **Redis** | OTP / rate-limit / session helpers (required in compose stack) |

---

## Four unlock channels + SoftAP

| # | Channel | Flow |
|---|---------|------|
| 1 | **RFID** | RC522 UID → allowlist tag lookup → `OPEN` or `DENY` |
| 2 | **Keypad PIN** | 4×3 matrix → HMAC verify → `OPEN` or lockout |
| 3 | **Temp PIN** | Admin creates PIN → synced in allowlist → device verifies & decrements `uses_remaining` |
| 4 | **Remote OPEN** | Authenticated admin sends `{cmd:"OPEN"}` on dashboard WebSocket → backend forwards to door hardware |
| — | **SoftAP** | GPIO 33 held ≥3 s at boot (or Wi‑Fi fail streak) → captive portal for Wi‑Fi/credentials only |

Optional: **RFID + PIN** when `require_pin_with_rfid` is enabled — card scan then PIN within 10 s.

Secure-hours window (`auto_lock_start` / `auto_lock_end`) blocks RFID/PIN/remote open during configured hours.

---

## Admin authentication

- **Cookie:** `sg_access` — HttpOnly JWT set on login (`auth_deps.set_auth_cookie`).
- **Bearer:** `Authorization: Bearer …` also accepted (tests, scripts).
- **`COOKIE_SECURE`:** set `true` when the site is served over HTTPS.
- **`TRUSTED_PROXY_IPS`:** comma-separated IPs that may send `X-Forwarded-For` (default `127.0.0.1,::1`).

### CSRF (Origin check)

For mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`), `enforce_csrf` requires `Origin` or `Referer` to prefix-match an entry in `CORS_ORIGINS` (plus `FRONTEND_URL` if set). Requests with no Origin/Referer pass (same-origin tools, curl).

---

## Hardware allowlist (offline)

1. Backend builds JSON at `GET /api/hardware/allowlist` (header `X-Hardware-Token`).
2. ESP32 stores it in `allowlist.json` with `_synced_at`.
3. When WebSocket is down, `allowlist.py` evaluates RFID/PIN locally.
4. Stale allowlist (`max_stale_seconds`, default 86400) denies access until resync.
5. Buffered events flush via `POST /api/hardware/events` when online.

Payload includes: `tags` (rfid, pin_hash, expiry), `temp_pins`, `device_hmac_key`, duress flags, secure-hours settings.

---

## HMAC PIN

Server (`pin_crypto.py`) and firmware (`pin_hmac.py`) use the same scheme:

```
device_hmac_key = HMAC-SHA256(key=PIN_PEPPER, msg="door:" + HARDWARE_TOKEN)
pin_hash        = HMAC-SHA256(key=device_hmac_key, msg=pin_digits)
```

- **`PIN_PEPPER`** / **`PIN_PEPPER_ID`:** server-side secrets; pepper id is included in allowlist for rotation.
- Firmware receives `device_hmac_key` (hex) in the allowlist — never the raw pepper.
- PIN format: 4–8 digits. Failed PIN attempts trigger tiered lockout on device.

---

## WebSocket paths

| Client | Path | Auth |
|--------|------|------|
| Admin dashboard | `/ws/frontend` | Short-lived WS ticket (`POST /auth/ws-ticket`) or JWT (cookie/Bearer) |
| Door ESP32 | `/ws/hardware?token=…` | `HARDWARE_TOKEN` |

Single uvicorn worker (`--workers 1`) — in-memory WebSocket registry; do not scale workers without Redis pub/sub fanout.

---

## Database (door)

Core tables: admin users, RFID tags/users, access logs, temporary PINs, operators. Migrations via Alembic (`backend/alembic/`).
