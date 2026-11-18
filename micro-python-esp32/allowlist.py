"""Local allowlist storage, sync, and offline access decisions."""
import json
import time

import pin_hmac

try:
    import ntp_time
except ImportError:
    ntp_time = None

ALLOWLIST_FILE = "allowlist.json"
TEMP_SKEW_SECONDS = 120
TEHRAN_OFFSET_SECONDS = 12600
_LOCAL_EPOCH_OFFSET = 946684800 if time.gmtime(0)[0] == 2000 else 0


def _mono_now():
    if ntp_time is not None:
        return ntp_time.monotonic_epoch()
    if hasattr(time, "monotonic"):
        return float(time.monotonic())
    return float(time.time())


def _utc_now_fallback():
    if ntp_time is not None:
        return float(ntp_time.utc_now())
    return float(int(time.time()) + _LOCAL_EPOCH_OFFSET)


def normalize_rfid(rfid):
    if not rfid:
        return ""
    s = rfid.strip().upper()
    if s.startswith("0X"):
        s = s[2:]
    return s.replace(":", "").replace("-", "")


class PinLockout:
    def __init__(self):
        self.consecutive_fails = 0
        self.tier = 0
        self.locked_until = 0.0

    def is_locked(self, now=None):
        now = now if now is not None else _mono_now()
        return now < self.locked_until

    def record_fail(self, now=None):
        now = now if now is not None else _mono_now()
        self.consecutive_fails += 1
        if self.consecutive_fails >= 5:
            if self.tier == 0:
                self.locked_until = now + 60
                self.tier = 1
            else:
                self.locked_until = now + 300
            self.consecutive_fails = 0

    def record_success(self):
        self.consecutive_fails = 0
        self.tier = 0
        self.locked_until = 0.0


class AllowlistStore:
    def __init__(self, clock=None):
        self.data = {}
        self.synced_at = 0.0
        self._synced_mono = None
        self._synced_with_ntp = False
        self.clock = clock
        self.pending_rfid = None
        self.pending_tag = None
        self.pending_until = 0.0
        self.pin_lockout = PinLockout()
        self._hmac_key = b""

    def _current_mono(self):
        if self.clock is not None and hasattr(self.clock, "monotonic_epoch"):
            return float(self.clock.monotonic_epoch())
        return _mono_now()

    def _current_epoch(self):
        if self.clock is not None:
            if self.clock.synced:
                ep = self.clock.utc_epoch()
                if ep is not None:
                    return float(ep)
            if hasattr(self.clock, "utc_now"):
                return float(self.clock.utc_now())
        return _utc_now_fallback()

    def load_file(self):
        try:
            with open(ALLOWLIST_FILE, "r") as f:
                loaded = json.load(f)
            if not isinstance(loaded, dict):
                return False
            self.synced_at = float(loaded.pop("_synced_at", 0) or 0)
            self._synced_mono = None
            self._synced_with_ntp = bool(self.synced_at and self.synced_at > 1500000000)
            self.data = loaded
            self._refresh_key()
            return True
        except Exception as e:
            print("[AL] load failed:", e)
            return False

    def save_file(self):
        try:
            payload = dict(self.data)
            if self.synced_at:
                payload["_synced_at"] = self.synced_at
            with open(ALLOWLIST_FILE, "w") as f:
                json.dump(payload, f)
            return True
        except Exception as e:
            print("[AL] save failed:", e)
            return False

    def apply_payload(self, payload):
        if not payload or not isinstance(payload, dict):
            return False
        clean = dict(payload)
        clean.pop("_synced_at", None)
        self.data = clean
        self.synced_at = self._current_epoch()
        self._synced_mono = self._current_mono()
        self._synced_with_ntp = bool(self.clock and self.clock.synced)
        self._refresh_key()
        self.save_file()
        return True

    def _refresh_key(self):
        hex_key = self.data.get("device_hmac_key") or ""
        self._hmac_key = pin_hmac.hex_to_bytes(hex_key)

    def unlock_duration(self):
        """Return clamped unlock relay duration in seconds (1..60, default 5)."""
        raw = self.data.get("timer_duration") if self.data else None
        try:
            val = int(raw or 5)
        except (TypeError, ValueError):
            val = 5
        return max(1, min(60, val))

    def is_stale(self):
        if not self.data or not self.synced_at:
            return True
        try:
            max_stale = int(self.data.get("max_stale_seconds") or 86400)
        except (TypeError, ValueError):
            max_stale = 86400
        if max_stale <= 0:
            return True

        now_mono = self._current_mono()
        # Rebase pre-NTP synced_at once NTP completes so RTC jump does not mark fresh data stale.
        if (
            not self._synced_with_ntp
            and self._synced_mono is not None
            and self.clock is not None
            and self.clock.synced
        ):
            ep = self.clock.utc_epoch()
            if ep is not None:
                elapsed = max(0.0, now_mono - self._synced_mono)
                self.synced_at = float(ep) - elapsed
                self._synced_with_ntp = True
                self.save_file()

        now_epoch = self._current_epoch()
        if self._synced_mono is not None and not self._synced_with_ntp:
            if (now_mono - self._synced_mono) > max_stale:
                return True
            return (now_epoch - self.synced_at) > max_stale

        if now_epoch < self.synced_at and (self.synced_at - now_epoch) > 300:
            if self.clock is None or not self.clock.synced:
                return now_mono > max_stale
            return True

        return (now_epoch - self.synced_at) > max_stale

    def in_secure_window(self, hour):
        raw_start = self.data.get("auto_lock_start")
        raw_end = self.data.get("auto_lock_end")
        try:
            start = int(22 if raw_start is None else raw_start)
            end = int(6 if raw_end is None else raw_end)
        except (TypeError, ValueError):
            start, end = 22, 6
        if start == end:
            return False
        if start > end:
            return hour >= start or hour < end
        return start <= hour < end

    def _current_hour(self):
        if self.clock and self.clock.synced:
            epoch = self.clock.utc_epoch()
            if epoch is not None:
                return ((int(epoch) + TEHRAN_OFFSET_SECONDS) // 3600) % 24
        return ((int(self._current_epoch()) + TEHRAN_OFFSET_SECONDS) // 3600) % 24

    def _tag_expired(self, tag):
        exp = tag.get("expires_at")
        if not exp:
            return False
        if not self.clock or not self.clock.synced:
            return False
        epoch = self.clock.parse_iso_utc(exp)
        if epoch is None:
            return False
        now = self.clock.utc_epoch()
        return now is not None and now >= epoch

    def find_tag(self, rfid):
        target = normalize_rfid(rfid)
        for tag in self.data.get("tags") or []:
            if normalize_rfid(tag.get("rfid")) == target:
                return tag
        return None

    def _duress_enabled(self):
        val = self.data.get("duress_mode")
        if val is None:
            return True
        if isinstance(val, str):
            return val.strip().lower() not in ("false", "0", "no", "off")
        return bool(val)

    def check_duress_rfid(self, rfid):
        if not self._duress_enabled():
            return False
        duress = self.data.get("duress_rfid")
        if not duress:
            return False
        return normalize_rfid(duress) == normalize_rfid(rfid)

    def check_duress_pin(self, pin_digits):
        if not self._duress_enabled():
            return False
        d_hash = self.data.get("duress_pin_hash")
        if not d_hash:
            return False
        return pin_hmac.verify_pin_hash(self._hmac_key, pin_digits, d_hash)

    def evaluate_rfid(self, rfid):
        """Returns dict: granted, is_duress, reason, user_name, needs_pin."""
        if self.is_stale():
            return {"granted": False, "reason": "allowlist_stale", "is_duress": False}

        if self.check_duress_rfid(rfid):
            return {
                "granted": True,
                "is_duress": True,
                "reason": "duress_rfid",
                "user_name": "Duress",
                "needs_pin": False,
            }

        hour = self._current_hour()
        if self.in_secure_window(hour):
            return {
                "granted": False,
                "reason": "secure_hours",
                "is_duress": False,
                "user_name": "Unknown",
            }

        tag = self.find_tag(rfid)
        if not tag or self._tag_expired(tag):
            return {
                "granted": False,
                "reason": "unknown_tag",
                "is_duress": False,
                "user_name": "Unknown",
            }

        require_pin = bool(self.data.get("require_pin_with_rfid"))
        if require_pin:
            self.pending_rfid = rfid
            self.pending_tag = tag
            self.pending_until = self._current_mono() + 10
            return {
                "granted": False,
                "reason": "await_pin",
                "is_duress": False,
                "user_name": tag.get("name") or "User",
                "needs_pin": True,
            }

        return {
            "granted": True,
            "is_duress": False,
            "reason": "rfid",
            "user_name": tag.get("name") or "User",
            "needs_pin": False,
            "rfid": rfid,
        }

    def _match_tag_pin(self, tag, pin_digits):
        p_hash = tag.get("pin_hash") if tag else None
        if not p_hash:
            return False
        return pin_hmac.verify_pin_hash(self._hmac_key, pin_digits, p_hash)

    def _match_temp_pin(self, pin_digits):
        if not self.clock or not self.clock.synced:
            return None
        now = self.clock.utc_epoch()
        if now is None:
            return None
        for tp in self.data.get("temp_pins") or []:
            p_hash = tp.get("pin_hash")
            if not p_hash:
                continue
            if not pin_hmac.verify_pin_hash(self._hmac_key, pin_digits, p_hash):
                continue
            uses = int(tp.get("uses_remaining") or 0)
            if uses <= 0:
                continue
            exp = tp.get("expires_at")
            exp_epoch = self.clock.parse_iso_utc(exp) if exp else None
            if exp_epoch is not None and now > (exp_epoch + TEMP_SKEW_SECONDS):
                continue
            return tp
        return None

    def consume_temp_pin(self, tp):
        if not tp:
            return None
        uses = int(tp.get("uses_remaining") or 0)
        if uses <= 0:
            return None
        tp["uses_remaining"] = uses - 1
        self.save_file()
        return tp.get("pin_hash")

    def evaluate_pin(self, pin_digits):
        """Returns dict with granted, is_duress, reason, pin_hash (temp), event_type."""
        if self.is_stale():
            return {"granted": False, "reason": "allowlist_stale", "event_type": "PIN_DENIED"}

        now_mono = self._current_mono()
        if self.pin_lockout.is_locked(now=now_mono):
            return {"granted": False, "reason": "lockout", "event_type": "PIN_DENIED"}

        if len(pin_digits) < 4 or len(pin_digits) > 8 or not pin_digits.isdigit():
            self.pin_lockout.record_fail(now=now_mono)
            return {"granted": False, "reason": "bad_format", "event_type": "PIN_DENIED"}

        if self.check_duress_pin(pin_digits):
            self.pin_lockout.record_success()
            return {
                "granted": True,
                "is_duress": True,
                "reason": "duress_pin",
                "event_type": "GRANTED",
                "user_name": "Duress",
            }

        hour = self._current_hour()
        if self.in_secure_window(hour):
            self.pin_lockout.record_fail(now=now_mono)
            return {"granted": False, "reason": "secure_hours", "event_type": "PIN_DENIED"}

        if self.pending_tag and now_mono <= self.pending_until:
            tag = self.pending_tag
            rfid = self.pending_rfid
            if self._match_tag_pin(tag, pin_digits):
                self.pin_lockout.record_success()
                self.pending_rfid = None
                self.pending_tag = None
                self.pending_until = 0.0
                return {
                    "granted": True,
                    "is_duress": False,
                    "reason": "rfid_pin",
                    "event_type": "GRANTED",
                    "user_name": tag.get("name") or "User",
                    "rfid": rfid,
                }
            self.pin_lockout.record_fail(now=now_mono)
            return {"granted": False, "reason": "pin_mismatch", "event_type": "PIN_DENIED"}

        if now_mono > self.pending_until:
            self.pending_rfid = None
            self.pending_tag = None
            self.pending_until = 0.0

        if not self.data.get("require_pin_with_rfid"):
            for tag in self.data.get("tags") or []:
                if self._tag_expired(tag):
                    continue
                if self._match_tag_pin(tag, pin_digits):
                    self.pin_lockout.record_success()
                    return {
                        "granted": True,
                        "is_duress": False,
                        "reason": "pin",
                        "event_type": "GRANTED",
                        "user_name": tag.get("name") or "User",
                        "rfid": tag.get("rfid"),
                    }

        tp = self._match_temp_pin(pin_digits)
        if tp:
            pin_hash = tp.get("pin_hash")
            consumed = self.consume_temp_pin(tp)
            self.pin_lockout.record_success()
            return {
                "granted": True,
                "is_duress": False,
                "reason": "temp_pin",
                "event_type": "TEMP_PIN_USED",
                "pin_hash": consumed or pin_hash,
                "user_name": "Temp PIN",
            }

        self.pin_lockout.record_fail(now=now_mono)
        return {"granted": False, "reason": "pin_denied", "event_type": "PIN_DENIED"}


class EventQueue:
    MAX_EVENTS = 50

    def __init__(self):
        self.events = []

    def push(self, ev):
        self.events.append(ev)
        if len(self.events) > self.MAX_EVENTS:
            self.events = self.events[-self.MAX_EVENTS :]

    def prepend_batch(self, batch):
        if not batch:
            return
        self.events = (list(batch) + self.events)[-self.MAX_EVENTS :]

    def drain(self):
        out = self.events[:]
        self.events = []
        return out


def fetch_allowlist(server_host, server_port, use_ssl, hardware_token):
    try:
        import urequests as requests
    except ImportError:
        print("[AL] urequests not available")
        return None

    scheme = "https" if use_ssl else "http"
    port_part = ""
    if use_ssl and server_port != 443:
        port_part = ":" + str(server_port)
    elif not use_ssl and server_port != 80:
        port_part = ":" + str(server_port)
    url = scheme + "://" + server_host + port_part + "/api/hardware/allowlist"
    headers = {"X-Hardware-Token": hardware_token}
    resp = None
    try:
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            print("[AL] fetch status:", resp.status_code)
            return None
        return resp.json()
    except Exception as e:
        print("[AL] fetch error:", e)
        return None
    finally:
        if resp is not None:
            try:
                resp.close()
            except Exception as e:
                print("[AL] close error:", e)


def post_events(server_host, server_port, use_ssl, hardware_token, events):
    if not events:
        return True
    try:
        import urequests as requests
    except ImportError:
        return False

    scheme = "https" if use_ssl else "http"
    port_part = ""
    if use_ssl and server_port != 443:
        port_part = ":" + str(server_port)
    elif not use_ssl and server_port != 80:
        port_part = ":" + str(server_port)
    url = scheme + "://" + server_host + port_part + "/api/hardware/events"
    headers = {
        "X-Hardware-Token": hardware_token,
        "Content-Type": "application/json",
    }
    body = json.dumps({"events": events})
    resp = None
    try:
        resp = requests.post(url, data=body, headers=headers)
        return 200 <= resp.status_code < 300
    except Exception as e:
        print("[EV] post error:", e)
        return False
    finally:
        if resp is not None:
            try:
                resp.close()
            except Exception as e:
                print("[EV] close error:", e)
