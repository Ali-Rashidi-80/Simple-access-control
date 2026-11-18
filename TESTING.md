# Testing Suite Instructions

This project has a 3-layer verification suite covering the FastAPI backend + MicroPython ESP32 core modules, the Next.js (`web/`) static frontend, and the Playwright end-to-end (`e2e/`) suite.

## 1. Backend & Firmware Tests (`pytest` & Python Quality Gate)

Run from `backend/` (using isolated test settings so local `.env` and external Redis are not required):

```powershell
Set-Location backend
$env:PYTHONNOUSERSITE = "1"
$env:SKIP_DOTENV = "1"
$env:REDIS_URL = "memory://"
python -m pytest -v
```

- Runs all backend API/database/security/OTP/WebSocket/allowlist tests plus `tests/test_firmware_core.py` (138 tests pass; `test_live_sms_send` skips unless live SMS opt-in env vars are set).
- Firmware core tests can also be run standalone without `conftest.py`:

```powershell
python -m pytest --noconftest tests/test_firmware_core.py -v
```

### Python Static Checks (from `backend/`)

```powershell
python -m ruff check app tests ..\micro-python-esp32\main.py ..\micro-python-esp32\allowlist.py ..\micro-python-esp32\ntp_time.py ..\micro-python-esp32\pin_hmac.py ..\micro-python-esp32\keypad.py ..\micro-python-esp32\softap.py ..\micro-python-esp32\boot.py
python -m black --check app tests
python -m isort --check app tests
python -m mypy app
python -m pylint app --ignore=melipayamak
python -m compileall -q app tests ..\micro-python-esp32
```

## 2. Frontend Static & Asset Checks (`web/`)

The UI is a Next.js 15 App Router static export in `web/` (built into `web/out/`):

```bash
cd web
npm ci
npm run typecheck   # tsc --noEmit
npm run lint        # eslint . --max-warnings 0
npm run build       # next build -> static export in web/out/
```

## 3. End-to-End Tests (`e2e/` with Playwright + `serve-stack.mjs`)

`e2e/playwright.config.ts` starts two `webServer` processes automatically on dedicated ports (`18000` for FastAPI and `15173` for the frontend proxy):

1. **Backend:** `uvicorn app.main:app --host 127.0.0.1 --port 18000` with `DATABASE_URL=sqlite+aiosqlite:///./e2e_runtime.db`, `REDIS_URL=memory://`, `SEED_DEFAULT_ADMIN=true`, `DEBUG_MODE=true`.
2. **Frontend Static + Reverse Proxy (`e2e/serve-stack.mjs`):** Serves `../web/out/` statically (including `/route/index.html` and Next.js App Router `/route/index.txt` RSC payloads) and reverse-proxies `/api/*`, `/auth/*`, `/users/*`, `/logs/*`, `/settings/*`, `/profile/*`, `/uploads/*`, `/health`, and WebSocket `Upgrade` `/ws/*` to `127.0.0.1:18000` (mirroring `web/nginx.conf`).

**Prerequisites:**
- `web/out/` is built (`cd web && npm run build`)
- `cd e2e && npm ci` and Playwright browser installed (`npx playwright install chromium`, or system Edge/Chrome fallback configured in `playwright.config.ts`)

**Run E2E:**

```bash
cd e2e
npx playwright test --workers=1
```

- Uses `--workers=1` because all flows share a single SQLite runtime database (`backend/e2e_runtime.db`).
- Remove temporary E2E artifacts (`backend/e2e_runtime.db*`, `e2e/test-results/`, `e2e/playwright-report/`) after test runs if keeping a clean git working tree.
