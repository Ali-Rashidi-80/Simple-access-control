# 🤝 Contributing to SentryGate

**[English](CONTRIBUTING.md)** • **[فارسی](CONTRIBUTING.fa.md)**

Thank you for your interest in contributing to SentryGate! We welcome contributions that uphold high software engineering rigor, test coverage, and code hygiene.

---

## 1. Prerequisites & Tooling

To develop and test SentryGate locally, ensure the following toolchains are installed:

- **Python:** Version `3.11` or `3.12`
- **Node.js:** Version `18.x` or `20.x LTS` with `npm`
- **Git:** Standard CLI
- **Docker & Docker Compose:** (Optional, for containerized integration testing)
- **MicroPython Toolchain:** `mpremote` or `esptool.py` (if modifying firmware)

---

## 2. Local Development Workflow

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/Simple-access-control.git
cd Simple-access-control

# 2. Set up virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3. Install backend dependencies and QA tools
pip install -r backend/requirements.txt
pip install ruff black isort mypy pylint pytest pytest-asyncio respx httpx Faker coverage

# 4. Copy sanitized environment
cp .env.example .env
```

---

## 3. Quality Assurance & Static Checks

All Pull Requests must pass the deterministic verification pipeline prior to review:

```bash
# 1. Syntax Compilation Check
python -m compileall backend

# 2. Fast Linter (Ruff)
python -m ruff check backend

# 3. Code Formatting (Black & isort)
python -m black backend --check
python -m isort backend --check-only

# 4. Static Type Verification (Mypy)
python -m mypy backend/app

# 5. Static Integrity (Pylint)
python -m pylint backend/app --errors-only

# 6. Automated Unit & Integration Tests (Pytest)
python -m pytest backend/tests -v
```

---

## 4. Git Commit & Branching Conventions

We enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

- `feat: add dual-tone acoustic feedback for badge scan events`
- `fix: prevent race condition on WebSocket disconnection during database flush`
- `refactor: extract authentication verification into dedicated service class`
- `docs: update hardware wiring pinout for ESP32 GPIO 16`
- `test: add unit coverage for unknown RFID broadcast event`

Branch naming convention:
- `feat/<feature-slug>`
- `fix/<bug-slug>`
- `refactor/<refactor-slug>`

---

## 5. Security & Sensitive Files Policy

- **NEVER** commit live credentials, API keys, database `.db` files, or `.env` files.
- The `.gitignore` is configured to exclude local sqlite databases and secrets. Always inspect `git status` before staging changes.
- If you discover an unpatched security vulnerability, consult [SECURITY.md](../SECURITY.md) for private disclosure instructions.

---

## 6. Pull Request Checklist

Before opening a PR, ensure:
1. `python -m pytest backend/tests` passes 100% green.
2. `ruff check`, `black`, `isort`, and `mypy` produce zero errors.
3. Relevant documentation in `docs/` is updated in both English and Persian if user-facing behavior changed.
4. Changes are focused, atomic, and well-described.
