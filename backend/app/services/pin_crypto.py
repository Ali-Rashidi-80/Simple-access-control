"""Door PIN HMAC-SHA256 helpers (not bcrypt — must match MicroPython firmware)."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from typing import Optional

PIN_PEPPER = os.getenv("PIN_PEPPER", "change-me-pin-pepper")
PIN_PEPPER_ID = os.getenv("PIN_PEPPER_ID", "v1")
HARDWARE_TOKEN = os.getenv("HARDWARE_TOKEN", "")


def device_hmac_key(hardware_token: Optional[str] = None) -> bytes:
    token = (
        hardware_token
        if hardware_token is not None
        else os.getenv("HARDWARE_TOKEN", HARDWARE_TOKEN)
    ) or ""
    pepper = os.getenv("PIN_PEPPER", PIN_PEPPER)
    return hmac.new(
        pepper.encode("utf-8"),
        f"door:{token}".encode("utf-8"),
        hashlib.sha256,
    ).digest()


def device_hmac_key_hex(hardware_token: Optional[str] = None) -> str:
    return device_hmac_key(hardware_token).hex()


def hash_pin(pin_digits: str, hardware_token: Optional[str] = None) -> str:
    pin = (pin_digits or "").strip()
    digest = hmac.new(
        device_hmac_key(hardware_token),
        pin.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return digest.hex()


def verify_pin(pin_digits: str, pin_hash: str, hardware_token: Optional[str] = None) -> bool:
    if not pin_hash:
        return False
    expected = hash_pin(pin_digits, hardware_token)
    return hmac.compare_digest(expected, pin_hash)


def validate_pin_format(pin_digits: str) -> bool:
    return bool(pin_digits) and pin_digits.isdigit() and 4 <= len(pin_digits) <= 8


def generate_temp_pin(length: int = 6) -> str:
    length = max(4, min(8, length))
    return "".join(secrets.choice("0123456789") for _ in range(length))
