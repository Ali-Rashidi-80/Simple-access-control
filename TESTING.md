# 🧪 SentryGate Comprehensive Testing & Verification Suite

**[English](TESTING.md)** • **[فارسی](TESTING.fa.md)**

SentryGate employs a layered, deterministic testing methodology encompassing static analysis, unit testing, integration workflows, hardware protocol simulation, and end-to-end verification.

---

## 1. Test Architecture Overview

| Testing Layer | Tooling & Framework | Scope & Focus |
| :--- | :--- | :--- |
| **Static Analysis** | `ruff`, `black`, `isort`, `mypy`, `pylint` | Linting, code formatting, PEP 8, static typing, and AST sanity |
| **Backend Unit & Flow** | `pytest`, `pytest-asyncio`, `httpx` | REST routes, token verification, OTP flow, role permissions |
| **Database Isolation** | `SQLAlchemy 2.0`, `aiosqlite`, `NullPool` | Transaction rollbacks, schema migrations, and concurrency safety |
| **Hardware Simulation** | `starlette.testclient`, WebSocket | ESP32 scan payloads, ping/pong heartbeats, and relay timings |
| **Frontend Components** | `Vitest`, React Testing Library | Component state, UI error boundaries, and WebSocket reconnects |
| **End-to-End (E2E)** | `Playwright` | Complete multi-tier user journeys from card scan to UI table update |

---

## 2. Running Backend Tests (Pytest)

The backend test suite contains **112 automated tests** covering all modules:

```bash
cd backend

# Execute all tests with detailed terminal reporting
python -m pytest tests/ -v

# Run with coverage report
python -m pytest tests/ --cov=app --cov-report=term-missing

# Run a specific test suite
python -m pytest tests/test_websocket.py -v
python -m pytest tests/test_esp32_simulation.py -v
python -m pytest tests/test_security.py -v
```

---

## 3. Running Static Code Quality Gates

Execute the full deterministic validation pipeline:

```bash
# 1. Bytecode compilation verification
python -m compileall backend

# 2. Ruff high-speed linter
python -m ruff check backend

# 3. Code formatting compliance
python -m black backend --check
python -m isort backend --check-only

# 4. Mypy strict type checking
python -m mypy backend/app

# 5. Pylint structural integrity
python -m pylint backend/app --errors-only
```

---

## 4. Frontend Component Tests (Vitest)

```bash
cd frontend

# Run component test suites
npm test

# Run tests with UI watch mode
npm run test:ui
```

---

## 5. End-to-End Tests (Playwright)

**Prerequisites:**
1. Backend running on `http://localhost:8000` with test database.
2. Frontend dev server running on `http://localhost:5173`.

```bash
cd e2e

# Install Playwright browser binaries (first run only)
npx playwright install --with-deps

# Execute E2E integration journeys
npx playwright test
```
