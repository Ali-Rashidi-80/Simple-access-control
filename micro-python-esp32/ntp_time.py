"""NTP sync helper for temp PIN expiry and epoch-safe clock checks."""
import time

try:
    import ntptime
except ImportError:
    ntptime = None

# MicroPython on ESP32 uses 2000-01-01 as epoch 0; Unix / ISO8601 uses 1970-01-01.
_EPOCH_OFFSET = 946684800 if time.gmtime(0)[0] == 2000 else 0

_mono_accum_ms = 0
_mono_last_ms = None


def utc_now():
    """Return current wall-clock time in Unix 1970-epoch seconds."""
    return int(time.time()) + _EPOCH_OFFSET


def monotonic_epoch():
    """Return monotonic seconds immune to NTP wall-clock jumps."""
    global _mono_accum_ms, _mono_last_ms
    if hasattr(time, "monotonic"):
        return float(time.monotonic())
    if hasattr(time, "ticks_ms") and hasattr(time, "ticks_diff"):
        now_ms = time.ticks_ms()
        if _mono_last_ms is None:
            _mono_last_ms = now_ms
        delta = time.ticks_diff(now_ms, _mono_last_ms)
        if delta > 0:
            _mono_accum_ms += delta
            _mono_last_ms = now_ms
        return _mono_accum_ms / 1000.0
    return float(time.time())


class NtpClock:
    def __init__(self):
        self.synced = False
        self._last_sync = 0.0
        self.sync_interval = 3600

    def sync(self):
        if ntptime is None:
            self.synced = False
            return False
        try:
            ntptime.settime()
            self.synced = True
            self._last_sync = self.monotonic_epoch()
            return True
        except Exception as e:
            print("[NTP] sync failed:", e)
            self.synced = False
            return False

    def maybe_resync(self):
        if not self.synced or (self.monotonic_epoch() - self._last_sync) > self.sync_interval:
            self.sync()

    def utc_now(self):
        """Return wall-clock time normalized to Unix 1970-epoch seconds."""
        return utc_now()

    def monotonic_epoch(self):
        """Return monotonic seconds immune to NTP wall-clock jumps."""
        return monotonic_epoch()

    def utc_epoch(self):
        """Return Unix epoch seconds when NTP is synced, otherwise None."""
        if not self.synced:
            return None
        return self.utc_now()

    def parse_iso_utc(self, iso_str):
        """Parse ISO8601 UTC/offset timestamp to Unix 1970-epoch seconds."""
        if not iso_str or not isinstance(iso_str, str):
            return None
        s = iso_str.strip()
        if not s:
            return None
        if s.endswith("Z") or s.endswith("z"):
            s = s[:-1]
        if "T" in s:
            date_part, time_part = s.split("T", 1)
        elif " " in s:
            date_part, time_part = s.split(" ", 1)
        else:
            return None

        tz_offset = 0
        tz_sign = 0
        tz_str = None
        if "+" in time_part:
            time_part, tz_str = time_part.split("+", 1)
            tz_sign = 1
        elif "-" in time_part:
            time_part, tz_str = time_part.split("-", 1)
            tz_sign = -1

        if tz_str:
            tz_parts = tz_str.split(":")
            try:
                tz_h = int(tz_parts[0])
                tz_m = int(tz_parts[1]) if len(tz_parts) > 1 else 0
                tz_offset = tz_sign * (tz_h * 3600 + tz_m * 60)
            except (ValueError, IndexError):
                return None

        time_part = time_part.split(".")[0]
        try:
            y, mo, d = [int(x) for x in date_part.split("-")]
            if mo < 1 or mo > 12 or d < 1 or d > 31:
                return None
            t_parts = time_part.split(":")
            if len(t_parts) < 2 or len(t_parts) > 3:
                return None
            hh = int(t_parts[0])
            mm = int(t_parts[1])
            ss = int(t_parts[2]) if len(t_parts) == 3 else 0
            if hh < 0 or hh > 23 or mm < 0 or mm > 59 or ss < 0 or ss > 59:
                return None
        except (ValueError, IndexError):
            return None

        days = self._ymd_to_days(y, mo, d)
        return days * 86400 + hh * 3600 + mm * 60 + ss - tz_offset

    def _ymd_to_days(self, y, m, d):
        if m <= 2:
            y -= 1
            m += 12
        era = y // 400
        yoe = y - era * 400
        doy = (153 * (m - 3) + 2) // 5 + d - 1
        doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
        return era * 146097 + doe - 719468
