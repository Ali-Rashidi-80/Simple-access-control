# Changelog

All notable changes to the SentryGate Access Control System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-02

### Added
- **Asynchronous FastAPI Core:** Production-grade REST API and WebSocket hub for dual-client orchestration (`/ws/hardware` and `/ws/frontend`).
- **ESP32 Edge MicroPython Firmware:** RC522 RFID reader SPI interface, hardware Watchdog Timer (WDT), dynamic WiFi reconnect loop, and buzzer audio telemetry.
- **Bi-directional WebSocket Protocol:** Real-time event streaming with Pydantic v2 validation (`HardwareMessage`, `BroadcastMessage`, `HardwareCommand`).
- **Authentication & Authorization:** JWT bearer token auth, Argon2 password hashing, SMS OTP verification (MeliPayamak integration), and Google OAuth2 support.
- **Telemetry & Environmental Monitoring:** Real-time DS18B20 digital temperature telemetry ingestion and broadcast to the dashboard.
- **Automated Scheduling:** APScheduler background worker for automated weekly SQLite backups and audit log cleanup.
- **Comprehensive Quality Gates:** 112-test automated Pytest suite covering API, database, security, integration, and ESP32 hardware simulation.
- **Linting & Formatting Standard:** Unified configuration for `ruff`, `black`, `isort`, `mypy`, and `pylint`.

### Changed
- Refactored WebSocket test sessions to eliminate bare exception catches and non-standard keyword arguments.
- Standardized database session management using `async_sessionmaker` and `NullPool` for clean multi-threaded test isolation.
- Decoupled secrets from ESP32 firmware into external `config.json` with secure fallback handling.

### Fixed
- Fixed unhandled exception paths and silent `pass` anti-patterns across backend processor and ESP32 boot routine.
- Fixed SQLite multi-threading lockup during Starlette WebSocket test client teardown.
- Fixed RFID UID schema mismatch between hardware payload and backend authorization resolver.
