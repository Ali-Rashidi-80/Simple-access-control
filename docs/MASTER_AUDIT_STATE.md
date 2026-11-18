# SentryGate Door — Master Audit State (Phases 1–6)

Living engineering tracker for the door-only SentryGate build (`web/` Next.js static export + nginx, `backend/` FastAPI + PostgreSQL + Redis, `micro-python-esp32/` ESP32 MicroPython firmware, and `e2e/` Playwright suite).

> **Scope rule:** Door access control only. All cooler fleet models, endpoints, docs, and legacy Vite/monolithic artifacts are excluded per Gates **A** and **L**.

---

## 1. Phase Overview & Status Checklists

| Phase | Scope | Owner | Status |
|---|---|---|---|
| **Phase 1** | Repo hygiene, secret purge, asset recovery, docs & env templates | `hygiene-docs` | `[x]` Completed |
| **Phase 2** | Backend data integrity, cooler purge, Alembic fixes, security & tests | `backend` | `[x]` Completed |
| **Phase 3** | Edge nginx proxy fix, Next.js design system, theme & shared UX | `frontend` | `[x]` Completed |
| **Phase 4** | Frontend page wiring, CRUD, RBAC guards, i18n parity, ESLint & build | `frontend` | `[x]` Completed |
| **Phase 5** | ESP32 firmware epoch/Tehran/SoftAP/idempotency & CPython unit tests | `firmware` | `[x]` Completed |
| **Phase 6** | Integrated verification, Playwright E2E (`e2e/`), hygiene cleanup & gate sign-off | `qa-verifier-2` | `[x]` Completed |

### Phase 1 Checklist (`hygiene-docs`)
- [x] Extract `web/public/fonts/Vazirmatn-Regular.woff2` (`50684` bytes, `wOF2`) and `web/public/fonts/Vazirmatn-Bold.woff2` (`51020` bytes, `wOF2`) from `git HEAD:frontend/public/fonts/`
- [x] Delete legacy/cooler root directories: `cooler-web/`, `cooler-app/`, `frontend/`, `build/`, `_recovered/`, `_recovered2/`, `_recovered_pyc/`, `_snapshot_cooler_20260720_212051/`, `.pytest_cache/`, and stale root `data/`
- [x] Delete root debris files: `_patch_cooler_dod.py`, `_pytest_after_fmt.txt`, `_pytest_broader.txt`, `_pytest_cooler_out.txt`, root `Dockerfile`, root `nginx.conf`, and `test_remote_ws.py`
- [x] Remove obsolete `## Cooler multi-tenant (fleet)` section from [`docs/DEPLOYMENT.md`](DEPLOYMENT.md)
- [x] Refactor [`simulate_esp32.py`](../simulate_esp32.py) to read `WS_URL` and `HARDWARE_TOKEN` from `os.environ` (`?token=...`), redact tokens from console logs, and handle errors cleanly
- [x] Update `.gitignore`, `.dockerignore`, `.env.example`, `.env.local-mirror.example`, and `.env.chabokan.split.example` (`NEXT_PUBLIC_*`, `PIN_PEPPER`, `PIN_PEPPER_ID`, `COOKIE_SECURE`, `TRUSTED_PROXY_IPS`, build/test/cache ignore rules)
- [x] Create `docs/MASTER_AUDIT_STATE.md`

### Phase 2 Checklist (`backend`)
- [x] Purge backend debris (`backend/fix_env.py`, `backend/_force_door_only.py`, `backend/app/services/melipayamak_sdk/`, `backend/app/services/auth_service.py`, `backend/tests/test_cooler_*`, `.bak`/`.skip`/DB/cache files)
- [x] Strip cooler models/schemas (`models.py`, `schemas.py`), restore door-only `HardwareCommand`, add `local_decision`, `UserUpdate`, `UserResponse.has_pin`/`expires_at`, `HardwareEventsPayload`, and `BulkSettingsUpdate` validation
- [x] Fix Alembic chain (`8cec9d931ed4`, `5c60813a6ca3`, `e9f0a1b2c3d4`) for fresh Postgres & SQLite and gate `Base.metadata.create_all` in `main.py` (`Gate O`)
- [x] Fix security/ACID defects (`enforce_csrf` `urlsplit` host matching, `hmac.compare_digest` for `HARDWARE_TOKEN`, remove IP-fingerprint linking in `google_oauth.py`, `secrets.choice` + non-plaintext logging in `sms_otp.py`, atomic `uses_remaining` decrement + `event_id` dedup in `door_api.py`, `PATCH /users/{id}`, `DELETE /users/{id}/pin`, `/logs/export` CSV escaping, `POST /profile/avatar` magic-byte & path-containment hardening, bounded `redis_store.py`, `CursorResult` typing in `security.py`)
- [x] Harden `backend/Dockerfile` (non-root user `10001`, `--workers 1`) and `docker-compose*.yml` (`no-new-privileges`, `appdata`, configurable MTU)
- [x] Fix `backend/tests/conftest.py` (`test_engine.dispose()`, `SKIP_DOTENV=1`, `REDIS_URL=memory://`) and pass `ruff`, `black`, `isort`, `mypy`, `pylint`, `compileall`, and `pytest`

### Phases 3–4 Checklist (`frontend`)
- [x] Fix `web/nginx.conf` `/api/` proxy (remove `rewrite ^/api/(.*)$ /$1 break;`), serve static Next.js export `index.(html|txt)` & colliding HTML navigation routes (`/users/`, `/logs/`, `/settings/`, `/profile/`) before proxying API requests, proxy `/health` & `/logs/export`, add security headers/CSP, remove `strict-ssl false` from `web/Dockerfile`
- [x] Implement local `Vazirmatn` `@font-face`, 3-theme design tokens (`neon`, `matrix`, `light`), `ToastProvider`, native `<dialog>` modal, `app/error.tsx`, `Intl` Jalali/Gregorian formatting, `Idempotency-Key` + `AbortSignal` in `lib/api.ts`, `BroadcastChannel` sync
- [x] Remove hardcoded `admin`/`admin123` credentials & default-password hint from `web/app/login/page.tsx`; add Password + SMS OTP login tabs
- [x] Wire full CRUD, RBAC guards, search/filter/pagination, CSV export, avatar upload, and `fa`/`en` `TranslationKey` parity across `/dashboard`, `/users`, `/logs`, `/operators`, `/temporary-pins`, `/settings`, and `/profile`
- [x] Configure ESLint (`web/eslint.config.mjs` + `lint` script) and pass `npm run typecheck`, `npm run lint`, and static export in `web/out/`

### Phase 5 Checklist (`firmware`)
- [x] Fix MicroPython 2000-epoch vs 1970-epoch offset in `micro-python-esp32/ntp_time.py`
- [x] Fix `Asia/Tehran` (`+03:30`) hour calculation, `unlock_duration()`, and fail-closed `is_stale()` in `micro-python-esp32/allowlist.py`
- [x] Remove `"setup12345"` fallback, feed `WDT` inside SoftAP loop, and implement inline captive HTTP form (`GET /`, `POST /save`) in `micro-python-esp32/softap.py` (`Gate H`, `Gate W`)
- [x] Prevent online double-unlock/duplicate `AccessLog` rows (`local_decision` WS-first vs offline queue with `event_id`) and apply `unlock_duration()` in `micro-python-esp32/main.py`
- [x] Add CPython firmware unit suite `backend/tests/test_firmware_core.py` and pass `compileall`, core firmware `ruff check`, and `pytest` (`20/20` firmware tests)

### Phase 6 Checklist (Integration & E2E)
- [x] Update & pass `e2e/` Playwright suite against `web/out/` via `e2e/serve-stack.mjs` + FastAPI `uvicorn` (`sg_access` cookie auth, WS `simulate-scan` → `UNKNOWN_TAG`, `/users` create+edit, `/temporary-pins` create+revoke, `/operators` create+edit, `/logs` filter+`/logs/export` CSV, `/settings` save+reload, `/profile` update, logout, 0 `pageerror`s)
- [x] Run full integrated Python, Frontend static/asset, and Acceptance Gate **A–X** verification (see Section 5 verbatim outputs)
- [x] Update `TESTING.md`, `docs/ACCEPTANCE_GATES.md`, `docs/ARCHITECTURE.md`, and `docs/MASTER_AUDIT_STATE.md`, and remove temporary test/cache/DB artifacts
- [ ] Build & boot Docker Compose stack (`docker compose --env-file .env up -d --build`) *(Deferred to deployment target: `.env` purged from repo for secret hygiene; static `web/out/`, `web/nginx.conf`, and `e2e/serve-stack.mjs` parity verified locally)*

---

## 2. Architecture Inventory

### Active Repository Layout
| Path | Layer | Role |
|---|---|---|
| `web/app/` | Frontend UI | Next.js 15 App Router static export (`login`, `dashboard`, `users`, `logs`, `operators`, `temporary-pins`, `settings`, `profile`) |
| `web/components/` | Frontend UI | Shared shell (`app-shell.tsx`), providers (`providers.tsx`), dialogs, toasts |
| `web/lib/` | Frontend UI | API client (`api.ts`), auth context (`auth.tsx`), WS client (`websocket.tsx`), i18n (`i18n.tsx`), types (`types.ts`) |
| `web/public/fonts/` | Frontend Assets | Local self-hosted `Vazirmatn-Regular.woff2` (`50684` B) and `Vazirmatn-Bold.woff2` (`51020` B) |
| `web/nginx.conf`, `web/Dockerfile` | Edge Proxy | Multi-stage Next.js `out/` build served by nginx with colliding static route handling (`/users/`, `/logs/`, `/settings/`, `/profile/` `index.html`/`.txt`) and `/api`, `/auth`, `/users`, `/logs`, `/settings`, `/profile`, `/uploads`, `/health`, `/ws` proxying |
| `backend/app/main.py` | Backend API | FastAPI entrypoint, lifespan, `/health`, `/ws/{client_type}`, `/users/*`, `/logs/*`, `/settings/*`, `/profile/*`, `/api/debug/*` |
| `backend/app/models.py`, `schemas.py`, `database.py` | Backend Data | Async SQLAlchemy models (`User`, `AdminUser`, `AccessLog`, `SystemSettings`, `LoginAttempt`, `MobileOTP`, `TemporaryPin`) & Pydantic v2 schemas |
| `backend/app/services/` | Backend Services | `auth_deps.py`, `auth_router.py`, `door_api.py`, `processor.py`, `pin_crypto.py`, `redis_store.py`, `google_oauth.py`, `sms_otp.py`, `alert_sms.py`, `log_service.py`, `security.py`, `melipayamak/` |
| `backend/alembic/` | DB Migrations | Revision chain: `8cec9d931ed4` → `5c60813a6ca3` → `c7a1b2d3e4f5` → `d8e9f0a1b2c3` → `e9f0a1b2c3d4` → `f0a1b2c3d4e5` |
| `backend/tests/` | Backend Tests | Pytest async integration/unit suite (`conftest.py`, `test_api.py`, `test_allowlist_api.py`, `test_firmware_core.py`, `test_hardening.py`, `test_pin_crypto.py`, `test_websocket.py`, `test_security.py`, `test_otp.py`, `test_overnight_lock.py`, etc.) |
| `micro-python-esp32/` | Edge Firmware | Core runtime: `main.py`, `allowlist.py`, `ntp_time.py`, `pin_hmac.py`, `keypad.py`, `softap.py`, `boot.py`, `config.example.json` *(plus pre-existing legacy/vendor `lib/`, `test/`, `mfrc522.py`, `rfid.py`)* |
| `e2e/` | End-to-End | Playwright config, static+proxy stack server, and E2E test (`playwright.config.ts`, `serve-stack.mjs`, `tests/flow.spec.ts`) |
| `docker-compose.yml`, `docker-compose.local-mirror.yml` | Deployment | `db` (Postgres 16), `redis`, `backend` (`--workers 1`), `frontend` (nginx + `web/out`) |
| `.env.example`, `.env.local-mirror.example`, `.env.chabokan.split.example` | Config Templates | Placeholder-only env documentation |
| `simulate_esp32.py` | Dev Tool | Env-driven (`WS_URL`, `HARDWARE_TOKEN`) hardware WebSocket smoke simulator |

### Legacy Artifacts Purged in Phase 1
- Root directories removed: `cooler-web/`, `cooler-app/`, `frontend/`, `build/`, `_recovered/`, `_recovered2/`, `_recovered_pyc/`, `_snapshot_cooler_20260720_212051/`, `.pytest_cache/`, `data/`.
- Root files removed: `_patch_cooler_dod.py`, `_pytest_after_fmt.txt`, `_pytest_broader.txt`, `_pytest_cooler_out.txt`, root `Dockerfile`, root `nginx.conf`, `test_remote_ws.py`.

---

## 3. Cross-Stack Wiring Matrix

| Capability | Frontend (`web/`) | Nginx (`web/nginx.conf`) | Backend (`backend/`) | Firmware (`micro-python-esp32/`) |
|---|---|---|---|---|
| **Password Login & Cookie Session** | `POST /auth/login` (`auth.tsx`, `login/page.tsx`) | `/auth/` → `backend:8000` | `auth_router.login` sets HttpOnly `sg_access` cookie + JWT | N/A |
| **Session Validation & Logout** | `GET /auth/me`, `POST /auth/logout` | `/auth/` → `backend:8000` | `auth_router.get_me`, `logout` (`enforce_csrf` + `sg_access`) | N/A |
| **SMS OTP Login** | `POST /auth/otp/send`, `POST /auth/otp/verify` | `/auth/` → `backend:8000` | `auth_router` → `sms_otp.py` (`MobileOTP`, Melipayamak) | N/A |
| **Google OAuth** | `/auth/google` redirect / callback | `/auth/` → `backend:8000` | `auth_router` → `google_oauth.py` (`redis_store` state) | N/A |
| **Dashboard WebSocket** | `POST /auth/ws-ticket` → WS `/ws/frontend?ticket=…` (`websocket.tsx`) | `/ws/` Upgrade → `backend:8000` | `main.websocket_endpoint` → `consume_ws_ticket` → `ConnectionManager` | Sends `scan`, `telemetry`, `status` relayed to frontend |
| **Remote Door OPEN** | Dashboard button → WS `{cmd:"OPEN"}` | `/ws/` Upgrade | `ConnectionManager.process_frontend_message` → `_handle_frontend_open` | Receives `{cmd:"OPEN", duration}` → energizes GPIO 15 relay |
| **RFID Users & PINs** | `GET/POST /users/`, `PATCH /users/{id}`, `DELETE /users/{id}`, `PUT/DELETE /users/{id}/pin` | Static `index.(html\|txt)` / `Accept: text/html` UI; API → `backend:8000` | `main.py` + `door_api.set_user_pin` → `pin_crypto.hash_pin` + `invalidate_allowlist` | Receives `ALLOWLIST_INVALIDATE` → refreshes `allowlist.json` |
| **Access Logs & CSV Export** | `GET /logs/`, `GET /logs/export` (`logs/page.tsx`) | Static UI; `/logs/export` & API → `backend:8000` | `main.read_logs` + CSV export (`AccessLog`) | Online WS `scan` + offline `POST /api/hardware/events` |
| **Temporary Visitor PINs** | `GET/POST /api/temporary-pins`, `DELETE /api/temporary-pins/{id}` | `/api/` → `backend:8000` | `door_api.list_temp_pins`, `create_temp_pin`, `revoke_temp_pin` | Evaluates `temp_pins` in `allowlist.py` (NTP required) |
| **Operators (RBAC `admin`)** | `GET/POST /auth/admins`, `PATCH /auth/admins/{id}` | `/auth/` → `backend:8000` | `auth_router` (`require_roles("admin")`) | N/A |
| **System Settings & Duress** | `GET/PUT /settings/` (`settings/page.tsx`) | Static UI; API → `backend:8000` | `main.get_settings`, `update_settings` (`duress_pin` → `duress_pin_hash`) | Syncs `auto_lock_start/end`, `timer_duration`, `require_pin_with_rfid`, `duress_*` |
| **Profile & Avatar** | `PUT /profile/`, `PUT /profile/password`, `POST /profile/avatar` | Static UI; `/profile/avatar`, `/profile/password`, `/uploads/` → `backend:8000` | `main.update_profile`, `change_password`, `upload_avatar` (`AVATAR_DIR`) | N/A |
| **Hardware Sync & Events** | N/A (debug simulate only when `DEBUG_MODE=true`) | `/api/` → `backend:8000` | `GET /api/hardware/allowlist`, `POST /api/hardware/events` (`X-Hardware-Token`) | `main.py` + `allowlist.py` + `pin_hmac.py` + `ntp_time.py` |
| **SoftAP Provisioning** | N/A (device AP captive HTML) | N/A | N/A (no unlock in SoftAP) | `softap.py` (GPIO 33 hold ≥3s or Wi-Fi fail streak) |

---

## 4. Baseline Defect Catalog (Resolved)

Issues identified in the initial cross-stack audit and resolved across Phases 1–6:

### Critical — Security, Auth & Data Integrity
| ID | Layer | Location | Defect | Resolution | Gate |
|---|---|---|---|---|---|
| **D-01** | Edge / Nginx | `web/nginx.conf` | `location /api/` stripped `/api` prefix via `rewrite`, breaking `/api/temporary-pins`, `/api/hardware/*`, `/api/debug/*`; colliding `/users/`, `/logs/`, `/settings/`, `/profile/` paths also conflicted with Next.js static export HTML & `.txt` RSC payloads. | **Resolved (Phases 3 & 6):** Removed `/api/` rewrite, added static `index.(html\|txt)` + `Accept: text/html` handling on colliding routes, added `/health` & `/logs/export`. | **B, G** |
| **D-02** | Backend Auth | `backend/app/services/auth_deps.py` | `enforce_csrf` used `origin.startswith(a)` against `CORS_ORIGINS`, allowing subdomain/prefix bypass. | **Resolved (Phase 2):** Parses URLs with `urllib.parse.urlsplit` and enforces exact `(scheme, netloc)` match. | **D** |
| **D-03** | Backend OAuth | `backend/app/services/google_oauth.py` | IP/User-Agent fingerprint fallback auto-linked logins across shared NAT; email linking lacked `verified_email=True` check. | **Resolved (Phase 2):** Removed IP/UA auto-linking completely and required `verified_email=True`. | **I** |
| **D-04** | Backend Hardware Auth | `backend/app/main.py`, `door_api.py` | `HARDWARE_TOKEN` compared with `!=` (timing leak). | **Resolved (Phase 2):** Uses `hmac.compare_digest`. | **G** |
| **D-05** | Backend OTP / Secrets | `backend/app/services/sms_otp.py`, `backend/fix_env.py` | `generate_otp()` used `random.randint`; unconfigured SMS logged plaintext OTP/message; `fix_env.py` & `test_remote_ws.py` held hardcoded domains/secrets. | **Resolved (Phases 1–2):** Purged `fix_env.py` & `test_remote_ws.py`; uses `secrets.choice` + `hmac.compare_digest` and redacted SMS logs. | **W** |
| **D-06** | Backend RBAC / Uploads | `backend/app/main.py` | `PUT /settings/` and `POST /api/debug/backup` allowed `operator` role; `/profile/avatar` allowed 20MB without magic-byte verification and used `.lstrip("/uploads/")`. | **Resolved (Phase 2):** Restricted settings/backup to `require_roles("admin")`; added image magic-byte check, 5MB limit, `removeprefix`, `realpath` check. | **E** |
| **D-07** | Frontend Auth UX | `web/app/login/page.tsx` | Hardcoded `"admin"` / `"admin123"` initial state and `defaultCredentials` hint; missing SMS OTP tab. | **Resolved (Phase 4):** Removed hardcoded credentials & hint; added password visibility toggle + SMS OTP tabs. | **C** |
| **D-08** | Firmware SoftAP | `micro-python-esp32/softap.py` | Hardcoded fallback password `"setup12345"`, empty `run_loop`, and missing WDT feed during SoftAP mode. | **Resolved (Phase 5):** Removed `"setup12345"` fallback, added `wdt` feeding, and implemented inline captive HTTP form (`GET /`, `POST /save`). | **H, W** |

### High — Functional, Migrations & Cross-Stack Bugs
| ID | Layer | Location | Defect | Resolution | Gate |
|---|---|---|---|---|---|
| **D-09** | Backend Migrations | `backend/alembic/versions/`, `main.py` | `8cec9d931ed4` assumed `admin_users` existed on empty DB; `e9f0a1b2c3d4` emitted Postgres-only `CASCADE` on SQLite; `main.py` ran `create_all` unconditionally. | **Resolved (Phase 2):** Baseline tables created when absent, dialect-guarded `CASCADE`, `create_all` restricted to SQLite or `AUTO_CREATE_SCHEMA=true`. | **O** |
| **D-10** | Backend Cooler Leftovers | `backend/app/models.py`, `schemas.py`, `backend/tests/test_cooler_*` | Cooler models and WS/API schemas remained in door codebase. | **Resolved (Phases 1–2):** Purged cooler models, schemas, legacy tests, and cooler directories. | **A** |
| **D-11** | Backend / Firmware Events | `backend/app/services/door_api.py`, `micro-python-esp32/main.py` | Online scan risked double-unlock/duplicate `AccessLog`; `POST /api/hardware/events` lacked schema validation, dedup, and atomic `uses_remaining` decrement. | **Resolved (Phases 2 & 5):** Added `local_decision` on `HardwareMessage`, `event_id` dedup via `redis_store`, atomic SQL `WHERE uses_remaining > 0`, and WS-first vs offline queue logic. | **T, V** |
| **D-12** | Firmware Time / Epoch | `micro-python-esp32/ntp_time.py`, `allowlist.py` | 2000-epoch vs 1970-epoch mismatch; UTC vs `Asia/Tehran` (`+03:30`) hour; `is_stale()` returned `False` when `synced_at == 0`; `timer_duration` unused. | **Resolved (Phase 5):** Added `_EPOCH_OFFSET`, Tehran `+12600`s hour math, `unlock_duration()`, and fail-closed `is_stale()`. | **R, T** |
| **D-13** | Backend / Frontend Missing CRUD | `backend/app/main.py`, `door_api.py`, `web/app/*` | Missing `PATCH /users/{id}`, `DELETE /users/{id}/pin`, `GET /logs/export`, `UserResponse.has_pin`, `duress_mode` seed; frontend lacked edit dialogs, CSV export, search/pagination, mobile `/profile`, Light tokens, ESLint. | **Resolved (Phases 2–4):** Implemented missing endpoints/CSV escaping and accessible Next.js CRUD + 3-theme design system + ESLint config. | **F, M** |
| **D-14** | Backend Redis / Rate Limit / Conftest | `backend/app/services/redis_store.py`, `backend/tests/conftest.py`, `processor.py` | Unbounded in-memory `_memory` dict without TTL; missing `test_engine.dispose()`; incomplete `ping`→`PONG`, `timer_duration`, `duress_mode` guard. | **Resolved (Phase 2):** Bounded `_memory` with TTL + `set_nx_ex`, added `test_engine.dispose()`, completed `processor.py` door logic. | **I, R** |

### Medium / Low — Hygiene, Assets, Tooling & E2E
| ID | Layer | Location | Defect | Resolution | Gate |
|---|---|---|---|---|---|
| **D-15** | Frontend Assets | `web/public/fonts/` | Missing local `Vazirmatn-Regular.woff2` / `Vazirmatn-Bold.woff2`. | **Resolved (Phases 1 & 3):** Extracted both `.woff2` files and wired `@font-face` (`web/out/fonts/Vazirmatn-*.woff2` verified). | **X** |
| **D-16** | Frontend Design / UX | `web/app/globals.css`, `dashboard/page.tsx`, `temporary-pins/page.tsx`, `settings/page.tsx` | Static `"Unlock command sent"`, `window.confirm`, broken Light contrast, silent error catches, `send_sms` default `false`. | **Resolved (Phases 3–4):** Semantic theme tokens, native `<dialog>`, `ToastProvider`, honest WS feedback, `AbortController`. | **X** |
| **D-17** | Config & Env Templates | `.env.*.example`, `.gitignore`, `simulate_esp32.py`, `web/Dockerfile`, `docker-compose*.yml`, `e2e/` | Legacy `VITE_*` vars, `strict-ssl false`, MTU `576`, Vite-era Playwright selectors. | **Resolved (Phases 1–3 & 6):** Updated templates/Dockerfile/Compose; replaced `e2e/` with `serve-stack.mjs` + updated `playwright.config.ts` & `tests/flow.spec.ts`. | **B, P** |

---

## 5. Verification Outputs (Phase 6 Integrated Sign-Off)

All checks executed sequentially on `2026-11-18` after final code edits:

### Python & Firmware Gate (`backend/`)
- `python -m ruff check app tests ..\micro-python-esp32\main.py ..\micro-python-esp32\allowlist.py ..\micro-python-esp32\ntp_time.py ..\micro-python-esp32\pin_hmac.py ..\micro-python-esp32\keypad.py ..\micro-python-esp32\softap.py ..\micro-python-esp32\boot.py` → `All checks passed!` (exit `0`) *(Note: running `ruff check app tests ..\micro-python-esp32` over the full tree reports `Found 262 errors` exclusively inside pre-existing legacy/vendor files `micro-python-esp32/{lib,test,mfrc522.py,rfid.py}`, exit `1`.)*
- `python -m black --check app tests` → `31 files would be left unchanged.` (exit `0`)
- `python -m isort --check app tests` → `Skipped 13 files` (exit `0`)
- `python -m mypy app --cache-dir "$env:TEMP\sg_mypy"` → `Success: no issues found in 17 source files` (exit `0`)
- `python -m pylint app --ignore=melipayamak` → `Your code has been rated at 10.00/10` (exit `0`)
- `python -m compileall -q app tests ..\micro-python-esp32` → exit `0`
- `PYTHONNOUSERSITE=1 SKIP_DOTENV=1 REDIS_URL=memory:// python -m pytest -v` → `138 passed, 1 skipped in 101.06s (0:01:41)` (exit `0`; `tests/test_sms_simple.py::test_live_sms_send` opt-in skip)

### Frontend Static & Export Gate (`web/`)
- `npm run typecheck` (`tsc --noEmit`) → exit `0`
- `npm run lint` (`eslint . --max-warnings 0`) → exit `0`
- `web/out/` asset verification → `out\index.html` (`5971` B), `out\404\index.html` (`6661` B), `out\login\index.html` (`10308` B), `out\dashboard\index.html` (`6769` B), `out\users\index.html` (`6747` B), `out\logs\index.html` (`6744` B), `out\operators\index.html` (`6769` B), `out\temporary-pins\index.html` (`6794` B), `out\settings\index.html` (`6764` B), `out\profile\index.html` (`6759` B), `out\fonts\Vazirmatn-Regular.woff2` (`50684` B), `out\fonts\Vazirmatn-Bold.woff2` (`51020` B)
- CDN & secret scan across `web/out/**/*.{html,js,css}` → `0` external CDN URLs (`fonts.googleapis`, `fonts.gstatic`, `unpkg.com`, `jsdelivr`) and `0` occurrences of `admin123`

### Playwright E2E Gate (`e2e/`)
- `npx playwright test --workers=1` (against FastAPI on `:18000` + `node serve-stack.mjs` serving `web/out/` on `:15173`):
  - `ok 1 [chromium] › tests\flow.spec.ts:6:7 › SentryGate Door E2E Flow › full door access admin journey across login, WS scan, users, temp pins, operators, logs, settings, profile, and logout (22.8s)`
  - `1 passed (1.8m)` (exit `0`, `0` `pageerror`s)

---

## 6. Verification Command Reference

| Layer | Command |
|---|---|
| **Backend + Core Firmware Lint / Typecheck** | `ruff check app tests ..\micro-python-esp32\{main,allowlist,ntp_time,pin_hmac,keypad,softap,boot}.py && black --check app tests && isort --check app tests && mypy app && pylint app --ignore=melipayamak` (run in `backend/`) |
| **Backend & Firmware Tests** | `PYTHONNOUSERSITE=1 SKIP_DOTENV=1 REDIS_URL=memory:// pytest -v` (run in `backend/`) |
| **Firmware Bytecode Check** | `python -m compileall -q app tests ..\micro-python-esp32` (run in `backend/`) |
| **Frontend Check & Export** | `cd web && npm run typecheck && npm run lint && npm run build` |
| **E2E Suite** | `cd e2e && npx playwright test --workers=1` (against built `web/out/` via `serve-stack.mjs` + FastAPI backend) |
