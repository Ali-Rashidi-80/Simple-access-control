# Testing Suite Instructions

This project includes a comprehensive 3-layer testing suite.

## 1. Backend Integration Tests (Pytest)
Tests API endpoints using a real file-based SQLite database (`test.db`) and mocks external services.

```bash
cd backend
# Install dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx respx aiosqlite

# Run Tests
pytest
```

## 2. Frontend Component Tests (Vitest)
Tests React components in isolation using MSW (Mock Service Worker).

```bash
cd frontend
# Install dependencies
npm install

# Run Tests
npm test
```

## 3. End-to-End Tests (Playwright)
Tests the full flow from UI to Database.

**Prerequisites:**
- Backend must be running (e.g., on port 8000).
- Frontend Dev Server must be running (e.g., on port 5173).

```bash
cd e2e
# Install Playwright Browsers (First time only)
npx playwright install --with-deps

# Run Tests
npx playwright test
```

## Notes
- **Database**: E2E tests expect a running backend. To isolate data, run the backend with `DATABASE_URL` pointing to a test file:
  `$env:DATABASE_URL="sqlite+aiosqlite:///./e2e_test.db"; python -m uvicorn app.main:app`
