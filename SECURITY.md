# Security Policy

## Supported Versions

Only the latest release branch of SentryGate receives security patches and vulnerability updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability within SentryGate, please report it privately. **Do not disclose security vulnerabilities publicly through public GitHub issues or discussions.**

### Reporting Channels
- **Security Contact:** `ali.rashidi.dev@gmail.com`
- **PGP / Encrypted Inquiries:** Available upon request.
- **Response SLA:** Initial acknowledgment within 48 hours; status updates provided within 5 business days until resolution.

### Information to Include
1. Exact commit hash or release tag tested.
2. Step-by-step reproduction instructions or proof-of-concept (PoC).
3. Impact assessment (e.g., unauthorized door actuation, privilege escalation, bypass of RFID check).
4. Any proposed patches or mitigations.

---

## Defensive Security Architecture

SentryGate is architected following zero-trust edge principles:
- **Asynchronous SQLAlchemy ORM:** All SQL interactions are parameterized and sanitized via SQLAlchemy 2.0 ORM; raw unescaped string concatenations are strictly forbidden.
- **Hardware Isolation:** The ESP32 edge microcontroller connects via dedicated WebSocket channel (`/ws/hardware`) with explicit payload validation through Pydantic v2 models.
- **Authentication & Secret Boundaries:** Passwords and OTP hashes are secured using Argon2/bcrypt; session tokens utilize signed JWTs; environmental variables are kept strictly out of git version control.
- **Hardware Watchdog:** The ESP32 firmware enforces a 15-second hardware watchdog timer (WDT) and flyback diode circuit suppression to guarantee fail-secure state under transient brownout conditions.
