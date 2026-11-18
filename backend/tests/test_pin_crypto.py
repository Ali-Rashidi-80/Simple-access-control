"""HMAC PIN helpers must match firmware contract."""

import os

os.environ.setdefault("PIN_PEPPER", "test-pepper")
os.environ.setdefault("HARDWARE_TOKEN", "hw-token-test")

from app.services.pin_crypto import (  # noqa: E402
    device_hmac_key_hex,
    hash_pin,
    validate_pin_format,
    verify_pin,
)


def test_hash_pin_deterministic():
    a = hash_pin("123456")
    b = hash_pin("123456")
    assert a == b
    assert len(a) == 64


def test_verify_pin_rejects_wrong():
    h = hash_pin("1234")
    assert verify_pin("1234", h)
    assert not verify_pin("1235", h)
    assert not verify_pin("1234", "")


def test_pin_format():
    assert validate_pin_format("1234")
    assert validate_pin_format("12345678")
    assert not validate_pin_format("123")
    assert not validate_pin_format("123456789")
    assert not validate_pin_format("12ab")


def test_device_key_depends_on_token():
    k1 = device_hmac_key_hex("token-a")
    k2 = device_hmac_key_hex("token-b")
    assert k1 != k2
    assert hash_pin("9999", "token-a") != hash_pin("9999", "token-b")
