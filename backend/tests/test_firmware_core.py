"""Unit tests for ESP32 MicroPython firmware core modules under CPython."""

from __future__ import annotations

import asyncio
import gc
import hashlib
import hmac as std_hmac
import importlib.util
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

os.environ.setdefault("PIN_PEPPER", "test-pepper")
os.environ.setdefault("HARDWARE_TOKEN", "hw-token-test")

from app.services import pin_crypto  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
FW_DIR = REPO_ROOT / "micro-python-esp32"


def _make_hardware_mocks():
    """Build isolated CPython mock modules for MicroPython ESP32 hardware."""

    class FakePin:
        IN = 0
        OUT = 1
        PULL_UP = 2

        def __init__(self, pin_no, mode=OUT, pull=None, value=0):
            self.pin_no = pin_no
            self.mode = mode
            self.pull = pull
            self._val = value

        def value(self, val=None):
            if val is None:
                return self._val
            self._val = int(val)
            return self._val

        def on(self):
            self._val = 1

        def off(self):
            self._val = 0

    class FakePWM:
        def __init__(self, pin):
            self.pin = pin
            self._freq = 0
            self._duty = 0

        def freq(self, val=None):
            if val is not None:
                self._freq = val
            return self._freq

        def duty_u16(self, val=None):
            if val is not None:
                self._duty = val
            return self._duty

    class FakeADC:
        ATTN_11DB = 3

        def __init__(self, pin):
            self.pin = pin
            self.reading = 3400

        def atten(self, _):
            return None

        def read(self):
            return self.reading

    class FakeSPI:
        def __init__(self, *args, **kwargs):
            pass

        def init(self):
            pass

    class FakeWDT:
        def __init__(self, timeout=15000):
            self.timeout = timeout
            self.feeds = 0

        def feed(self):
            self.feeds += 1

    class FakeWLAN:
        def __init__(self, if_id):
            self.if_id = if_id
            self.is_active = False
            self.connected = False
            self.cfg = {}

        def active(self, state=None):
            if state is not None:
                self.is_active = bool(state)
            return self.is_active

        def isconnected(self):
            return self.connected

        def connect(self, ssid, password):
            self.cfg["sta_ssid"] = ssid
            self.cfg["sta_password"] = password

        def config(self, **kwargs):
            self.cfg.update(kwargs)

        def ifconfig(self):
            return ("192.168.4.1", "255.255.255.0", "192.168.4.1", "8.8.8.8")

    class FakeMFRC522:
        OK = 0
        NOTAGERR = 1
        ERR = 2
        REQIDL = 0x26

        def __init__(self, spi=None, cs=None):
            self.spi = spi
            self.cs = cs

        def request(self, _mode):
            return self.NOTAGERR, 0

        def anticoll(self):
            return self.ERR, []

    machine_mod = ModuleType("machine")
    machine_mod.Pin = FakePin
    machine_mod.PWM = FakePWM
    machine_mod.ADC = FakeADC
    machine_mod.SPI = FakeSPI
    machine_mod.WDT = FakeWDT
    machine_mod.reset_calls = 0

    def _fake_reset():
        machine_mod.reset_calls += 1

    machine_mod.reset = _fake_reset

    network_mod = ModuleType("network")
    network_mod.STA_IF = 0
    network_mod.AP_IF = 1
    network_mod._ifaces = {0: FakeWLAN(0), 1: FakeWLAN(1)}
    network_mod.WLAN = lambda if_id: network_mod._ifaces[if_id]

    mfrc_mod = ModuleType("mfrc522")
    mfrc_mod.MFRC522 = FakeMFRC522

    return {
        "machine": machine_mod,
        "network": network_mod,
        "mfrc522": mfrc_mod,
        "uasyncio": asyncio,
    }


def _load_module_from_path(name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(name, str(file_path))
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def fw(tmp_path, monkeypatch):
    """Load MicroPython firmware modules with mocked hardware & full sys cleanup."""
    mocks = _make_hardware_mocks()
    managed_names = [
        "machine",
        "network",
        "mfrc522",
        "uasyncio",
        "pin_hmac",
        "ntp_time",
        "allowlist",
        "keypad",
        "softap",
        "fw_main",
        "urequests",
    ]
    saved = {k: sys.modules.get(k) for k in managed_names}
    try:
        for k, v in mocks.items():
            sys.modules[k] = v

        pin_hmac = _load_module_from_path("pin_hmac", FW_DIR / "pin_hmac.py")
        ntp_time = _load_module_from_path("ntp_time", FW_DIR / "ntp_time.py")
        allowlist = _load_module_from_path("allowlist", FW_DIR / "allowlist.py")
        keypad = _load_module_from_path("keypad", FW_DIR / "keypad.py")
        softap = _load_module_from_path("softap", FW_DIR / "softap.py")

        monkeypatch.setattr(allowlist, "ALLOWLIST_FILE", str(tmp_path / "allowlist.json"))
        monkeypatch.setattr(softap, "CONFIG_FILE", str(tmp_path / "config.json"))

        yield SimpleNamespace(
            pin_hmac=pin_hmac,
            ntp_time=ntp_time,
            allowlist=allowlist,
            keypad=keypad,
            softap=softap,
            machine=mocks["machine"],
            network=mocks["network"],
            tmp_path=tmp_path,
            load_main=lambda: _load_module_from_path("fw_main", FW_DIR / "main.py"),
        )
    finally:
        for k, prev in saved.items():
            if prev is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = prev


# =============================================================================
# 1. PIN HMAC & BACKEND PARITY
# =============================================================================


def test_pin_hmac_matches_backend_pin_crypto(fw):
    for token in ("hw-token-test", "door-alpha-99", ""):
        key_bytes = pin_crypto.device_hmac_key(token)
        for pin in ("0000", "1234", "567890", "87654321"):
            fw_hash = fw.pin_hmac.pin_hash_hex(key_bytes, pin)
            be_hash = pin_crypto.hash_pin(pin, token)
            assert fw_hash == be_hash
            assert len(fw_hash) == 64
            assert fw.pin_hmac.verify_pin_hash(key_bytes, pin, be_hash) is True
            assert fw.pin_hmac.verify_pin_hash(key_bytes, "9999", be_hash) is False


def test_pin_hmac_rfc_vectors_and_long_key(fw):
    # RFC 4231 Test Case 1
    key1 = b"\x0b" * 20
    data1 = b"Hi There"
    expected1 = "b0344c61d8db38535ca8afceaf0bf12b" "881dc200c9833da726e9376c2e32cff7"
    assert fw.pin_hmac.pin_hash_hex(key1, data1) == expected1

    # RFC 4231 Test Case 2
    key2 = b"Jefe"
    data2 = b"what do ya want for nothing?"
    expected2 = "5bdcc146bf60754e6a042426089575c7" "5a003f089d2739839dec58b964ec3843"
    assert fw.pin_hmac.pin_hash_hex(key2, data2) == expected2

    # Key longer than 64-byte HMAC block size must be SHA-256 hashed first
    long_key = b"K" * 100
    msg = b"123456"
    assert (
        fw.pin_hmac.pin_hash_hex(long_key, msg)
        == std_hmac.new(long_key, msg, hashlib.sha256).hexdigest()
    )


def test_constant_time_compare_hex_and_hex_to_bytes(fw):
    cmp_hex = fw.pin_hmac.constant_time_compare_hex
    sample = "ab" * 32
    assert cmp_hex(sample, " " + sample.upper() + "\n") is True
    assert cmp_hex(sample, "ac" + "ab" * 31) is False
    assert cmp_hex(sample, "ab" * 31) is False
    assert cmp_hex("", sample) is False
    assert cmp_hex(None, sample) is False

    assert fw.pin_hmac.hex_to_bytes("0a1b") == b"\x0a\x1b"
    assert fw.pin_hmac.hex_to_bytes("not-hex") == b""
    assert fw.pin_hmac.verify_pin_hash(b"", "1234", sample) is False
    assert fw.pin_hmac.verify_pin_hash(b"k", None, sample) is False


# =============================================================================
# 2. NTP TIME & 2000-EPOCH OFFSET
# =============================================================================


def test_parse_iso_utc_variants(fw):
    clock = fw.ntp_time.NtpClock()
    expected = int(datetime(2026, 11, 18, 12, 30, 45, tzinfo=timezone.utc).timestamp())

    assert clock.parse_iso_utc("2026-11-18T12:30:45Z") == expected
    assert clock.parse_iso_utc("2026-11-18T12:30:45.987654+00:00") == expected
    assert clock.parse_iso_utc("2026-11-18 12:30:45") == expected
    assert clock.parse_iso_utc("2026-11-18T16:00:45+03:30") == expected

    assert clock.parse_iso_utc("") is None
    assert clock.parse_iso_utc("not-a-timestamp") is None
    assert clock.parse_iso_utc("2026-13-01T00:00:00Z") is None


def test_2000_epoch_offset_handling(fw, monkeypatch):
    # Simulate MicroPython ESP32 where gmtime(0) returns year 2000
    monkeypatch.setattr(time, "gmtime", lambda *_args: (2000, 1, 1, 0, 0, 0, 5, 1))
    mp_ntp = _load_module_from_path("ntp_time_mp2000", FW_DIR / "ntp_time.py")
    try:
        assert mp_ntp._EPOCH_OFFSET == 946684800

        # Suppose Unix target is 2026-11-18T00:00:00Z
        clock = mp_ntp.NtpClock()
        unix_target = clock.parse_iso_utc("2026-11-18T00:00:00Z")
        esp32_rtc = unix_target - 946684800
        monkeypatch.setattr(time, "time", lambda: float(esp32_rtc))

        assert clock.utc_epoch() is None  # not synced yet
        clock.synced = True
        assert clock.utc_epoch() == unix_target
        assert mp_ntp.utc_now() == unix_target
    finally:
        sys.modules.pop("ntp_time_mp2000", None)


def test_ntp_maybe_resync_uses_monotonic_across_jump(fw, monkeypatch):
    clock = fw.ntp_time.NtpClock()
    mono_val = 100.0
    wall_val = 10.0
    sync_calls = 0

    def fake_settime():
        nonlocal wall_val, sync_calls
        sync_calls += 1
        wall_val = 1795046400.0  # +26 year jump after NTP sync

    monkeypatch.setattr(fw.ntp_time, "ntptime", SimpleNamespace(settime=fake_settime))
    monkeypatch.setattr(fw.ntp_time, "monotonic_epoch", lambda: mono_val)
    monkeypatch.setattr(time, "time", lambda: wall_val)

    clock.maybe_resync()
    assert sync_calls == 1
    assert clock.synced is True

    # 10s later, wall clock jumped by +26 years, must NOT re-sync immediately
    mono_val = 110.0
    clock.maybe_resync()
    assert sync_calls == 1

    # After sync_interval (3600s), should re-sync
    mono_val = 3800.0
    clock.maybe_resync()
    assert sync_calls == 2


# =============================================================================
# 3. ALLOWLIST, TEHRAN TZ, GATES T/U/V, LOCKOUT, UNLOCK DURATION
# =============================================================================


def _make_payload(
    *,
    token="hw-token-test",
    pin="1234",
    duress_pin="9999",
    duress_rfid="0xDEAD0001",
    require_pin_with_rfid=False,
    temp_pins=None,
    timer_duration=5,
    auto_lock_start=22,
    auto_lock_end=6,
    expires_at=None,
):
    return {
        "device_hmac_key": pin_crypto.device_hmac_key_hex(token),
        "max_stale_seconds": 86400,
        "auto_lock_start": auto_lock_start,
        "auto_lock_end": auto_lock_end,
        "require_pin_with_rfid": require_pin_with_rfid,
        "duress_rfid": duress_rfid,
        "duress_pin_hash": pin_crypto.hash_pin(duress_pin, token) if duress_pin else None,
        "duress_mode": True,
        "timer_duration": timer_duration,
        "tags": [
            {
                "name": "Alice",
                "rfid": "0xAABBCCDD",
                "pin_hash": pin_crypto.hash_pin(pin, token) if pin else None,
                "expires_at": expires_at,
            }
        ],
        "temp_pins": temp_pins or [],
    }


def _synced_clock(fw, utc_epoch_sec: float, mono_sec: float = 1000.0):
    clock = fw.ntp_time.NtpClock()
    clock.synced = True
    clock.utc_epoch = lambda: int(utc_epoch_sec)
    clock.utc_now = lambda: int(utc_epoch_sec)
    clock.monotonic_epoch = lambda: float(mono_sec)
    return clock


def test_tehran_timezone_and_overnight_secure_window(fw):
    assert fw.allowlist.TEHRAN_OFFSET_SECONDS == 12600
    # 18:29 UTC -> 21:59 Tehran (unlocked); 18:31 UTC -> 22:01 Tehran (locked)
    base_1829_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T18:29:00Z")
    clock = _synced_clock(fw, base_1829_utc)
    store = fw.allowlist.AllowlistStore(clock=clock)
    store.apply_payload(_make_payload(auto_lock_start=22, auto_lock_end=6))

    assert store._current_hour() == 21
    assert store.evaluate_rfid("0xAABBCCDD")["granted"] is True

    # Cross 22:00 Tehran (18:30 UTC)
    clock.utc_epoch = lambda: int(base_1829_utc + 120)
    clock.utc_now = clock.utc_epoch
    assert store._current_hour() == 22
    res_night = store.evaluate_rfid("0xAABBCCDD")
    assert res_night["granted"] is False
    assert res_night["reason"] == "secure_hours"

    # 02:29 UTC -> 05:59 Tehran (still locked); 02:31 UTC -> 06:01 Tehran (unlocked)
    t_0229 = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-19T02:29:00Z")
    clock.utc_epoch = lambda: int(t_0229)
    clock.utc_now = clock.utc_epoch
    assert store._current_hour() == 5
    assert store.evaluate_rfid("0xAABBCCDD")["granted"] is False

    clock.utc_epoch = lambda: int(t_0229 + 120)
    clock.utc_now = clock.utc_epoch
    assert store._current_hour() == 6
    assert store.evaluate_rfid("0xAABBCCDD")["granted"] is True

    # Same-day window and disabled 0..0 window
    store.data["auto_lock_start"] = 9
    store.data["auto_lock_end"] = 17
    assert store.in_secure_window(9) is True
    assert store.in_secure_window(16) is True
    assert store.in_secure_window(17) is False

    store.data["auto_lock_start"] = 0
    store.data["auto_lock_end"] = 0
    assert store.in_secure_window(0) is False
    assert store.in_secure_window(23) is False


def test_stale_allowlist_fail_closed_and_ntp_jump_safe(fw):
    now_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T10:00:00Z")
    clock = _synced_clock(fw, now_utc, mono_sec=100.0)
    store = fw.allowlist.AllowlistStore(clock=clock)

    # Empty store fails closed
    assert store.is_stale() is True
    assert store.evaluate_rfid("0xAABBCCDD")["reason"] == "allowlist_stale"
    assert store.evaluate_pin("1234")["reason"] == "allowlist_stale"

    # File without _synced_at fails closed
    raw = _make_payload()
    with open(fw.allowlist.ALLOWLIST_FILE, "w", encoding="utf-8") as f:
        json.dump(raw, f)
    assert store.load_file() is True
    assert store.is_stale() is True

    # apply_payload does not mutate caller dict
    caller_copy = dict(raw)
    assert store.apply_payload(caller_copy) is True
    assert "_synced_at" not in caller_copy
    assert store.is_stale() is False

    # Aging beyond max_stale_seconds fails closed
    clock.utc_epoch = lambda: int(now_utc + 86401)
    clock.utc_now = clock.utc_epoch
    assert store.is_stale() is True
    assert store.evaluate_rfid("0xAABBCCDD")["granted"] is False

    # Pre-NTP payload followed by +26y NTP jump must NOT falsely mark stale
    unsynced_clock = fw.ntp_time.NtpClock()
    unsynced_clock.synced = False
    unsynced_clock.utc_now = lambda: 946684810
    mono = 10.0
    unsynced_clock.monotonic_epoch = lambda: mono
    pre_store = fw.allowlist.AllowlistStore(clock=unsynced_clock)
    pre_store.apply_payload(_make_payload())
    assert pre_store.is_stale() is False

    # Simulate NTP sync finishing 5s later with +26 year wall-clock jump
    mono = 15.0
    unsynced_clock.synced = True
    unsynced_clock.utc_epoch = lambda: int(now_utc)
    unsynced_clock.utc_now = lambda: int(now_utc)
    assert pre_store.is_stale() is False


def test_permanent_pin_and_expired_tag(fw):
    now_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T10:00:00Z")
    clock = _synced_clock(fw, now_utc)
    store = fw.allowlist.AllowlistStore(clock=clock)
    store.apply_payload(_make_payload(pin="4321"))

    ok = store.evaluate_pin("4321")
    assert ok["granted"] is True
    assert ok["reason"] == "pin"
    assert ok["event_type"] == "GRANTED"

    bad = store.evaluate_pin("0000")
    assert bad["granted"] is False
    assert bad["event_type"] == "PIN_DENIED"

    # Expired user tag denies both RFID and permanent PIN
    store.apply_payload(_make_payload(pin="4321", expires_at="2026-11-18T09:59:59Z"))
    assert store.evaluate_rfid("0xAABBCCDD")["granted"] is False
    assert store.evaluate_pin("4321")["granted"] is False


def test_rfid_pin_10s_window_gate_u(fw):
    now_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T10:00:00Z")
    mono = 500.0
    clock = _synced_clock(fw, now_utc, mono_sec=mono)
    clock.monotonic_epoch = lambda: mono
    store = fw.allowlist.AllowlistStore(clock=clock)
    store.apply_payload(_make_payload(pin="2580", require_pin_with_rfid=True))

    # Card scan enters await_pin state
    scan = store.evaluate_rfid("0xAABBCCDD")
    assert scan["granted"] is False
    assert scan["needs_pin"] is True
    assert scan["reason"] == "await_pin"

    # Wrong PIN within window fails
    mono = 504.0
    wrong = store.evaluate_pin("1111")
    assert wrong["granted"] is False
    assert wrong["reason"] == "pin_mismatch"

    # Matching PIN within 10s window grants access
    mono = 509.0
    ok = store.evaluate_pin("2580")
    assert ok["granted"] is True
    assert ok["reason"] == "rfid_pin"

    # New scan, then wait >10s -> window expires and PIN alone is denied
    mono = 600.0
    assert store.evaluate_rfid("0xAABBCCDD")["needs_pin"] is True
    mono = 611.0
    expired = store.evaluate_pin("2580")
    assert expired["granted"] is False


def test_temp_pin_offline_consume_and_no_ntp_fail_closed_gate_t(fw):
    now_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T10:00:00Z")
    tp_hash = pin_crypto.hash_pin("654321", "hw-token-test")
    payload = _make_payload(
        temp_pins=[
            {
                "pin_hash": tp_hash,
                "expires_at": "2026-11-18T11:00:00Z",
                "uses_remaining": 1,
            }
        ]
    )

    # Gate T: Without synced NTP, temp PIN MUST fail closed (DENY)
    unsynced = fw.ntp_time.NtpClock()
    unsynced.synced = False
    store_no_ntp = fw.allowlist.AllowlistStore(clock=unsynced)
    store_no_ntp.apply_payload(payload)
    assert store_no_ntp.evaluate_pin("654321")["granted"] is False

    # With synced NTP, temp PIN succeeds once, decrements uses_remaining & persists
    clock = _synced_clock(fw, now_utc)
    store = fw.allowlist.AllowlistStore(clock=clock)
    store.apply_payload(payload)

    res1 = store.evaluate_pin("654321")
    assert res1["granted"] is True
    assert res1["event_type"] == "TEMP_PIN_USED"
    assert res1["pin_hash"] == tp_hash

    # Persisted uses_remaining must be 0
    reloaded = fw.allowlist.AllowlistStore(clock=clock)
    assert reloaded.load_file() is True
    assert reloaded.data["temp_pins"][0]["uses_remaining"] == 0
    assert reloaded.evaluate_pin("654321")["granted"] is False

    # Expired temp PIN beyond TEMP_SKEW_SECONDS (120s) is rejected
    payload_exp = _make_payload(
        temp_pins=[
            {
                "pin_hash": tp_hash,
                "expires_at": "2026-11-18T09:57:00Z",
                "uses_remaining": 2,
            }
        ]
    )
    store.apply_payload(payload_exp)
    assert store.evaluate_pin("654321")["granted"] is False


def test_duress_rfid_and_duress_pin_gate_v(fw):
    # Even during Tehran overnight secure hours (23:00 Tehran = 19:30 UTC), duress unlocks
    night_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T19:30:00Z")
    clock = _synced_clock(fw, night_utc)
    store = fw.allowlist.AllowlistStore(clock=clock)
    store.apply_payload(_make_payload(duress_rfid="0xDEAD0001", duress_pin="9999"))

    d_rfid = store.evaluate_rfid("dead0001")
    assert d_rfid["granted"] is True
    assert d_rfid["is_duress"] is True
    assert d_rfid["reason"] == "duress_rfid"

    d_pin = store.evaluate_pin("9999")
    assert d_pin["granted"] is True
    assert d_pin["is_duress"] is True
    assert d_pin["reason"] == "duress_pin"

    # Disabled duress_mode ignores duress credentials
    payload_off = _make_payload(duress_rfid="0xDEAD0001", duress_pin="9999")
    payload_off["duress_mode"] = False
    store.apply_payload(payload_off)
    assert store.evaluate_rfid("0xDEAD0001")["granted"] is False
    assert store.evaluate_pin("9999")["granted"] is False


def test_tiered_pin_lockout(fw):
    now_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T10:00:00Z")
    mono = 100.0
    clock = _synced_clock(fw, now_utc, mono_sec=mono)
    clock.monotonic_epoch = lambda: mono
    store = fw.allowlist.AllowlistStore(clock=clock)
    store.apply_payload(_make_payload(pin="1234"))

    # 5 bad PINs -> Tier 0 lockout = 60s
    for _ in range(5):
        assert store.evaluate_pin("0000")["granted"] is False
    assert store.pin_lockout.tier == 1
    assert store.evaluate_pin("1234")["reason"] == "lockout"

    # Still locked at +59s, unlocked at +61s
    mono = 159.0
    assert store.evaluate_pin("1234")["reason"] == "lockout"
    mono = 161.0

    # Next 5 failures -> Tier 1 lockout = 300s
    for _ in range(5):
        assert store.evaluate_pin("0000")["granted"] is False
    mono = 460.0
    assert store.evaluate_pin("1234")["reason"] == "lockout"

    mono = 462.0
    ok = store.evaluate_pin("1234")
    assert ok["granted"] is True
    assert store.pin_lockout.tier == 0
    assert store.pin_lockout.consecutive_fails == 0


def test_unlock_duration_clamping(fw):
    clock = _synced_clock(fw, 1795046400)
    store = fw.allowlist.AllowlistStore(clock=clock)
    assert store.unlock_duration() == 5

    for raw, expected in (
        (None, 5),
        (0, 5),
        (-3, 1),
        (1, 1),
        (12, 12),
        ("15", 15),
        (120, 60),
        ("invalid", 5),
    ):
        store.data = {"timer_duration": raw}
        assert store.unlock_duration() == expected


# =============================================================================
# 4. KEYPAD MATRIX, DEBOUNCE & BUFFER
# =============================================================================


def test_keypad_buffer_cap_clear_submit_and_debounce(fw):
    kp = fw.keypad.Keypad()
    pressed = {"rc": None}

    # Wire simulated col pin response when row is driven low (0)
    for col_idx, col_pin in enumerate(kp._cols):

        def _make_col_val(c_idx):
            def _val(_v=None):
                if pressed["rc"] is None:
                    return 1
                pr, pc = pressed["rc"]
                if pc == c_idx and kp._rows[pr].value() == 0:
                    return 0
                return 1

            return _val

        col_pin.value = _make_col_val(col_idx)

    # Key coordinates in KEYS: '1'=(0,0), '2'=(0,1), '*'=(3,0), '#'=(3,2)
    pressed["rc"] = (0, 0)
    assert kp.poll(1000, debounce_ms=200) == ("digit", "1")
    # Same key within debounce window ignored
    assert kp.poll(1100, debounce_ms=200) is None
    # Same key after debounce window accepted
    assert kp.poll(1250, debounce_ms=200) == ("digit", "1")

    # Release clears _last_key
    pressed["rc"] = None
    assert kp.poll(1260, debounce_ms=200) is None

    # '*' clears buffer
    pressed["rc"] = (3, 0)
    assert kp.poll(1270, debounce_ms=200) == ("clear",)
    assert kp.buffer == ""

    # 8-digit cap (MAX_DIGITS = 8)
    pressed["rc"] = (0, 1)  # '2'
    t = 2000
    for _ in range(10):
        kp.poll(t, debounce_ms=200)
        t += 250
    assert kp.buffer == "22222222"
    assert len(kp.buffer) == 8

    # '#' submits and resets buffer
    pressed["rc"] = (3, 2)
    assert kp.poll(t, debounce_ms=200) == ("submit", "22222222")
    assert kp.buffer == ""


# =============================================================================
# 5. SOFTAP SECURITY, MEMORY GUARD, CAPTIVE PORTAL & WATCHDOG
# =============================================================================


def test_softap_memory_guard_and_no_hardcoded_fallback(fw, monkeypatch):
    softap_src = (FW_DIR / "softap.py").read_text(encoding="utf-8")
    assert "setup12345" not in softap_src

    # Memory < 32KB cancels SoftAP
    monkeypatch.setattr(gc, "mem_free", lambda: 16384, raising=False)
    assert fw.softap.can_enter_softap() is False
    ap_low = fw.softap.SoftAPMode("SentryGate-Setup", "ValidPass123")
    assert ap_low.start() is False

    # Memory >= 32KB allows SoftAP
    monkeypatch.setattr(gc, "mem_free", lambda: 65536, raising=False)
    assert fw.softap.can_enter_softap() is True

    # Missing, short, or placeholder passwords trigger random >=8 char password
    for bad_pw in (None, "", "short", "setup12345", "change-me-setup-pass"):
        ap = fw.softap.SoftAPMode("SentryGate-Setup", bad_pw)
        assert ap.password != "setup12345"
        assert ap.password != bad_pw
        assert len(ap.password) >= 8

    ap_good = fw.softap.SoftAPMode("SentryGate-Setup", "MySecurePass99")
    assert ap_good.password == "MySecurePass99"
    assert ap_good.start() is True
    assert ap_good.active is True
    ap_good.stop()
    assert ap_good.active is False


def test_softap_captive_portal_and_wdt_feed(fw, monkeypatch):
    monkeypatch.setattr(gc, "mem_free", lambda: 65536, raising=False)
    ap = fw.softap.SoftAPMode("SentryGate-Setup", "MySecurePass99")
    assert ap.start() is True

    # HTML form must be self-contained with zero external links
    html = ap.render_portal_html()
    assert "<form method='POST' action='/save'>" in html
    assert "http://" not in html and "https://" not in html

    wdt = fw.machine.WDT(timeout=15000)

    async def _exercise():
        server = await asyncio.start_server(ap._handle_http_client, "127.0.0.1", 0)
        port = server.sockets[0].getsockname()[1]

        async def _raw_http(req: bytes) -> bytes:
            reader, writer = await asyncio.open_connection("127.0.0.1", port)
            writer.write(req)
            await writer.drain()
            resp = await reader.read()
            writer.close()
            await writer.wait_closed()
            return resp

        try:
            # GET / renders provisioning form
            r_get = await _raw_http(b"GET / HTTP/1.1\r\nHost: 192.168.4.1\r\n\r\n")
            assert b"200 OK" in r_get
            assert b"SentryGate Door Provisioning" in r_get

            # POST /save invalid port -> 400 Bad Request, no config write, no reboot
            bad_body = (
                b"wifi_ssid=HomeNet&wifi_pass=secret&server_host=door.example.com"
                b"&server_port=70000&use_ssl=true&hardware_token=tok-abc&keypad_enabled=true"
            )
            r_bad = await _raw_http(
                f"POST /save HTTP/1.1\r\nHost: 192.168.4.1\r\n"
                f"Content-Length: {len(bad_body)}\r\n\r\n".encode() + bad_body
            )
            assert b"400 Bad Request" in r_bad
            assert fw.machine.reset_calls == 0

            # POST /save valid payload -> writes config.json & triggers reset
            good_body = (
                b"wifi_ssid=OfficeWiFi&wifi_pass=pass1234&server_host=door.example.com"
                b"&server_port=8443&use_ssl=true&hardware_token=tok-xyz&keypad_enabled=false"
            )
            r_ok = await _raw_http(
                f"POST /save HTTP/1.1\r\nHost: 192.168.4.1\r\n"
                f"Content-Length: {len(good_body)}\r\n\r\n".encode() + good_body
            )
            assert b"200 OK" in r_ok
            assert b"Configuration saved" in r_ok
        finally:
            server.close()
            await server.wait_closed()

        await asyncio.sleep(0.3)
        saved_cfg = json.loads(Path(fw.softap.CONFIG_FILE).read_text(encoding="utf-8"))
        assert saved_cfg["wifi_ssid"] == "OfficeWiFi"
        assert saved_cfg["wifi_pass"] == "pass1234"
        assert saved_cfg["server_host"] == "door.example.com"
        assert saved_cfg["server_port"] == 8443
        assert saved_cfg["use_ssl"] is True
        assert saved_cfg["hardware_token"] == "tok-xyz"
        assert saved_cfg["keypad_enabled"] is False
        assert fw.machine.reset_calls == 1

        # Verify run_loop feeds WDT on every tick
        ap2 = fw.softap.SoftAPMode("SentryGate-Setup", "MySecurePass99")
        ap2.active = True

        async def _stop_soon():
            await asyncio.sleep(0.15)
            ap2.active = False

        await asyncio.gather(
            ap2.run_loop(wdt=wdt, host="127.0.0.1", port=0),
            _stop_soon(),
        )
        assert wdt.feeds >= 1

    asyncio.run(_exercise())


# =============================================================================
# 6. MAIN FIRMWARE INTEGRATION (NO DOUBLE UNLOCK / IDEMPOTENCY / SOFTAP LOCKOUT)
# =============================================================================


def test_main_rfid_no_duplicate_queue_and_dynamic_duration(fw, monkeypatch):
    fw_main = fw.load_main()
    now_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T10:00:00Z")
    fw_main.RUNTIME.clock.synced = True
    fw_main.RUNTIME.clock.utc_epoch = lambda: int(now_utc)
    fw_main.RUNTIME.clock.utc_now = lambda: int(now_utc)
    fw_main.RUNTIME.store.apply_payload(_make_payload(timer_duration=9))

    opened_calls = []
    denied_calls = []

    class FakeHW:
        def read_temp(self):
            return 24.5

        async def open_door(self, duration=3, silent=False):
            opened_calls.append((duration, silent))

        async def access_denied(self):
            denied_calls.append(True)

        async def play_key_beep(self):
            pass

    class FakeWS:
        def __init__(self, is_open=True, fail_send=False):
            self.open = is_open
            self.fail_send = fail_send
            self.sent = []

        async def send(self, payload):
            if not self.open or self.fail_send:
                self.open = False
                return False
            self.sent.append(json.loads(payload.decode("utf-8")))
            return True

    async def _run():
        hw = FakeHW()

        # Online WS scan -> sends WS with local_decision, does NOT queue to events
        ws_ok = FakeWS(is_open=True)
        await fw_main.handle_rfid_scan(hw, ws_ok, "0xAABBCCDD")
        assert opened_calls == [(9, False)]
        assert len(ws_ok.sent) == 1
        assert ws_ok.sent[0]["local_decision"] == "GRANTED"
        assert ws_ok.sent[0]["type"] == "scan"
        assert fw_main.RUNTIME.events.events == []

        # Offline WS -> falls back to event queue with unique event_id
        ws_off = FakeWS(is_open=False)
        await fw_main.handle_rfid_scan(hw, ws_off, "0xAABBCCDD")
        queued = fw_main.RUNTIME.events.drain()
        assert len(queued) == 1
        assert queued[0]["type"] == "GRANTED"
        assert "-" in queued[0]["event_id"]

        # WS send failure -> falls back to event queue
        ws_fail = FakeWS(is_open=True, fail_send=True)
        await fw_main.handle_rfid_scan(hw, ws_fail, "0xDEADBEEF")
        assert len(denied_calls) == 1
        queued_fail = fw_main.RUNTIME.events.drain()
        assert len(queued_fail) == 1
        assert queued_fail[0]["type"] == "DENIED"
        assert "-" in queued_fail[0]["event_id"]

    asyncio.run(_run())


def test_main_pin_submit_duration_event_id_and_flush(fw, monkeypatch):
    fw_main = fw.load_main()
    now_utc = fw.ntp_time.NtpClock().parse_iso_utc("2026-11-18T10:00:00Z")
    fw_main.RUNTIME.clock.synced = True
    fw_main.RUNTIME.clock.utc_epoch = lambda: int(now_utc)
    fw_main.RUNTIME.clock.utc_now = lambda: int(now_utc)

    tp_hash = pin_crypto.hash_pin("778899", "hw-token-test")
    fw_main.RUNTIME.store.apply_payload(
        _make_payload(
            pin="1234",
            timer_duration=11,
            temp_pins=[
                {
                    "pin_hash": tp_hash,
                    "expires_at": "2026-11-18T12:00:00Z",
                    "uses_remaining": 1,
                }
            ],
        )
    )

    opened = []
    denied = []
    posted_batches = []

    class FakeHW:
        def read_temp(self):
            return 22.0

        async def open_door(self, duration=3, silent=False):
            opened.append((duration, silent))

        async def access_denied(self):
            denied.append(True)

    monkeypatch.setattr(
        fw_main.allowlist,
        "post_events",
        lambda *_args: posted_batches.append(list(_args[-1])) or True,
    )

    async def _run():
        hw = FakeHW()
        sta = fw.network.WLAN(fw.network.STA_IF)

        # Offline PIN submit queues event with unique event_id and opens for 11s
        sta.connected = False
        await fw_main.handle_pin_submit(hw, "1234")
        await fw_main.handle_pin_submit(hw, "0000")
        assert opened == [(11, False)]
        assert len(denied) == 1
        q = fw_main.RUNTIME.events.drain()
        assert len(q) == 2
        assert q[0]["type"] == "GRANTED"
        assert q[1]["type"] == "PIN_DENIED"
        assert q[0]["event_id"] and q[1]["event_id"]

        # Online temp PIN submit flushes promptly via post_events
        sta.connected = True
        await fw_main.handle_pin_submit(hw, "778899")
        await asyncio.sleep(0.05)
        assert opened[-1] == (11, False)
        assert len(posted_batches) == 1
        assert posted_batches[0][0]["type"] == "TEMP_PIN_USED"
        assert posted_batches[0][0]["pin_hash"] == tp_hash
        assert "-" in posted_batches[0][0]["event_id"]
        assert fw_main.RUNTIME.events.events == []

    asyncio.run(_run())


def test_main_softap_blocks_hardware_open_and_feeds_wdt(fw, monkeypatch):
    monkeypatch.setattr(gc, "mem_free", lambda: 65536, raising=False)
    fw_main = fw.load_main()
    hw = fw_main.HardwareManager()
    wdt = fw.machine.WDT(timeout=15000)

    async def _run():
        # Mock SoftAPMode.run_loop to verify wdt is passed & unlock stays disabled
        captured = {}

        async def fake_run_loop(self, wdt=None, host="0.0.0.0", port=80):
            captured["wdt"] = wdt
            if wdt:
                wdt.feed()

        monkeypatch.setattr(fw.softap.SoftAPMode, "run_loop", fake_run_loop)
        await fw_main.enter_softap_mode(wdt=wdt)

        assert captured["wdt"] is wdt
        assert wdt.feeds >= 1
        assert fw_main.RUNTIME.unlock_enabled is False

        # Gate H & Gate W: open_door must refuse to energize relay in SoftAP mode
        await hw.open_door(duration=5)
        assert hw.relay.value() == 0

    asyncio.run(_run())
