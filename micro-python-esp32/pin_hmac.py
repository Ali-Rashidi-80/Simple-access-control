"""Manual HMAC-SHA256 (RFC 2104) for PIN verification — no hmac module."""
import hashlib

try:
    import ubinascii
except ImportError:
    import binascii as ubinascii

_BLOCK = 64


def _hmac_sha256(key, msg):
    if len(key) > _BLOCK:
        key = hashlib.sha256(key).digest()
    if len(key) < _BLOCK:
        key = key + (b"\x00" * (_BLOCK - len(key)))
    o_pad = bytes((b ^ 0x5C) for b in key)
    i_pad = bytes((b ^ 0x36) for b in key)
    inner = hashlib.sha256(i_pad + msg).digest()
    return hashlib.sha256(o_pad + inner).digest()


def pin_hash_hex(device_hmac_key_bytes, pin_digits):
    if isinstance(pin_digits, bytes):
        msg = pin_digits
    else:
        msg = (pin_digits or "").encode("utf-8")
    digest = _hmac_sha256(device_hmac_key_bytes, msg)
    return ubinascii.hexlify(digest).decode("ascii")


def hex_to_bytes(hex_str):
    if not hex_str:
        return b""
    try:
        return ubinascii.unhexlify(hex_str.strip())
    except Exception as e:
        print("[HMAC] invalid hex:", e)
        return b""


def constant_time_compare_hex(a, b):
    if not a or not b:
        return False
    sa = a.strip().lower()
    sb = b.strip().lower()
    if len(sa) != len(sb):
        return False
    diff = 0
    for i in range(len(sa)):
        diff |= ord(sa[i]) ^ ord(sb[i])
    return diff == 0


def verify_pin_hash(device_hmac_key_bytes, pin_digits, expected_hex):
    if not pin_digits or not expected_hex or not device_hmac_key_bytes:
        return False
    computed = pin_hash_hex(device_hmac_key_bytes, pin_digits)
    return constant_time_compare_hex(computed, expected_hex)
