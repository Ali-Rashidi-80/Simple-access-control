"""Redis helpers with bounded monotonic in-memory fallback."""

from __future__ import annotations

import logging
import os
import threading
import time
from collections import OrderedDict
from typing import Any, Optional

logger = logging.getLogger("uvicorn")

MAX_MEMORY_KEYS = 4096
REDIS_URL = os.getenv("REDIS_URL", "").strip()
_client: Any = None
_client_url: str = ""
_warned = False
_memory: OrderedDict[str, tuple[str, float]] = OrderedDict()
_lock = threading.Lock()


def _configured_redis_url() -> str:
    return os.getenv("REDIS_URL", REDIS_URL).strip()


def get_redis() -> Any:
    global _client, _client_url, _warned
    url = _configured_redis_url()
    if url.lower() == "memory://":
        return None
    if not url:
        if not _warned:
            logger.warning("REDIS_URL unset — using in-memory fallbacks")
            _warned = True
        return None
    if _client is not None and _client_url == url:
        return _client
    try:
        import redis

        client = redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        _client = client
        _client_url = url
        return _client
    except Exception as e:
        if not _warned:
            logger.warning("Redis unavailable (%s) — in-memory fallback", e)
            _warned = True
        _client = None
        _client_url = ""
        return None


def _prune_memory(now: float) -> None:
    expired = [k for k, (_, exp) in _memory.items() if exp <= now]
    for k in expired:
        _memory.pop(k, None)
    while len(_memory) >= MAX_MEMORY_KEYS:
        _memory.popitem(last=False)


def clear_memory() -> None:
    """Clear in-memory fallback store (primarily for tests)."""
    with _lock:
        _memory.clear()


def set_ex(key: str, value: str, ttl_seconds: int) -> None:
    ttl = max(1, int(ttl_seconds))
    r = get_redis()
    if r is not None:
        r.setex(key, ttl, value)
        return
    now = time.monotonic()
    with _lock:
        _memory.pop(key, None)
        _prune_memory(now)
        _memory[key] = (value, now + ttl)


def set_nx_ex(key: str, value: str, ttl_seconds: int) -> bool:
    """Atomically set key with TTL only if it does not already exist."""
    ttl = max(1, int(ttl_seconds))
    r = get_redis()
    if r is not None:
        return bool(r.set(key, value, nx=True, ex=ttl))
    now = time.monotonic()
    with _lock:
        existing = _memory.get(key)
        if existing is not None:
            if existing[1] > now:
                return False
            _memory.pop(key, None)
        _prune_memory(now)
        _memory[key] = (value, now + ttl)
        return True


def get_del(key: str) -> Optional[str]:
    r = get_redis()
    if r is not None:
        pipe = r.pipeline()
        pipe.get(key)
        pipe.delete(key)
        val, _ = pipe.execute()
        return str(val) if val is not None else None
    now = time.monotonic()
    with _lock:
        entry = _memory.pop(key, None)
        if entry is None or entry[1] <= now:
            return None
        return entry[0]


def get(key: str) -> Optional[str]:
    r = get_redis()
    if r is not None:
        val = r.get(key)
        return str(val) if val is not None else None
    now = time.monotonic()
    with _lock:
        entry = _memory.get(key)
        if entry is None:
            return None
        if entry[1] <= now:
            _memory.pop(key, None)
            return None
        return entry[0]


def delete(key: str) -> None:
    r = get_redis()
    if r is not None:
        r.delete(key)
        return
    with _lock:
        _memory.pop(key, None)


def incr_with_ttl(key: str, ttl_seconds: int) -> int:
    ttl = max(1, int(ttl_seconds))
    r = get_redis()
    if r is not None:
        n = r.incr(key)
        if n == 1:
            r.expire(key, ttl)
        return int(n)
    now = time.monotonic()
    with _lock:
        entry = _memory.get(key)
        if entry is None or entry[1] <= now:
            _memory.pop(key, None)
            _prune_memory(now)
            _memory[key] = ("1", now + ttl)
            return 1
        cur = int(entry[0]) + 1
        _memory[key] = (str(cur), entry[1])
        return cur
