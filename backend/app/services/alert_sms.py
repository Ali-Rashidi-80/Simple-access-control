"""Alert SMS via Melipayamak — never log plaintext PIN/OTP/body."""

from __future__ import annotations

import logging
import os

logger = logging.getLogger("uvicorn")

SMS_USERNAME = os.getenv("SMS_USERNAME")
SMS_PASSWORD = os.getenv("SMS_PASSWORD")
SMS_SENDER_NUMBER = os.getenv("SMS_SENDER_NUMBER")
SMS_ENABLED = bool(SMS_USERNAME and SMS_PASSWORD and SMS_SENDER_NUMBER)


async def send_alert_sms(phone: str, body: str) -> bool:
    """Send SMS. Logs only destination mask + length, never body content."""
    if not phone:
        return False
    if not SMS_ENABLED:
        logger.warning("SMS alert skipped: Melipayamak not configured")
        return False
    try:
        from .melipayamak import Api

        api = Api(SMS_USERNAME, SMS_PASSWORD)
        sms = api.sms()
        # Melipayamak sync client — run in thread if needed; keep simple for now
        result = sms.send(phone, SMS_SENDER_NUMBER, body)
        masked = phone[:4] + "****" + phone[-2:] if len(phone) >= 6 else "****"
        logger.info("SMS alert sent to %s (len=%s)", masked, len(body or ""))
        return bool(result)
    except Exception as e:
        logger.error("SMS alert failed: %s", type(e).__name__)
        return False
