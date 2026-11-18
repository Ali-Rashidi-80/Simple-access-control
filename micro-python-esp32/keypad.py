"""4x3 matrix keypad — rows out, cols in."""
import time
from machine import Pin

ROWS = (13, 14, 16, 27)
COLS = (25, 26, 32)

KEYS = (
    ("1", "2", "3"),
    ("4", "5", "6"),
    ("7", "8", "9"),
    ("*", "0", "#"),
)

MAX_DIGITS = 8


def _ticks_diff(a, b):
    if hasattr(time, "ticks_diff"):
        return time.ticks_diff(a, b)
    return a - b


class Keypad:
    def __init__(self):
        self._rows = [Pin(p, Pin.OUT, value=1) for p in ROWS]
        self._cols = [Pin(p, Pin.IN, Pin.PULL_UP) for p in COLS]
        self._buffer = ""
        self._last_key = None
        self._last_at = 0

    @property
    def buffer(self):
        return self._buffer

    def clear_buffer(self):
        self._buffer = ""

    def _scan_once(self):
        for ri, row in enumerate(self._rows):
            for r in self._rows:
                r.value(1)
            row.value(0)
            for ci, col in enumerate(self._cols):
                if col.value() == 0:
                    for r in self._rows:
                        r.value(1)
                    return KEYS[ri][ci]
        for r in self._rows:
            r.value(1)
        return None

    def poll(self, now_ms, debounce_ms=200):
        """Return None, a digit/special key tuple, ('submit', pin), or ('clear',)."""
        key = self._scan_once()
        if key is None:
            self._last_key = None
            return None
        if key == self._last_key and _ticks_diff(now_ms, self._last_at) < debounce_ms:
            return None
        self._last_key = key
        self._last_at = now_ms

        if key == "#":
            pin = self._buffer
            self._buffer = ""
            return ("submit", pin)
        if key == "*":
            self._buffer = ""
            return ("clear",)
        if key.isdigit():
            if len(self._buffer) < MAX_DIGITS:
                self._buffer += key
            return ("digit", key)
        return None
