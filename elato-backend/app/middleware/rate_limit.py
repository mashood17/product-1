"""
Simple in-memory sliding-window rate limiter for auth-sensitive endpoints
(login, refresh, password reset, cron sync) — the surfaces most valuable to
brute force since they gate account access or a shared secret.

Single-process, in-memory only. That's sufficient for the current
single-instance Render deployment; if the app ever scales to multiple
instances the counters won't be shared across them and this must move to a
shared store (e.g. Redis) instead.
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

_hits: dict[str, deque[float]] = defaultdict(deque)

# Every currently rate-limited endpoint uses a window well under this many
# seconds (60s, at the time of writing). A key whose most recent hit is
# older than this is stale for *any* real window in use, so it's always
# safe to drop — this constant only needs to stay bigger than the largest
# `window_seconds` ever passed to `rate_limit()`, not match any one of them.
_STALE_AFTER_SECONDS = 3600.0
_SWEEP_INTERVAL_SECONDS = 300.0
_last_sweep = 0.0


def _sweep_stale_keys(now: float) -> None:
    """Bounds `_hits`' memory growth from clients that hit a limited endpoint
    once and never return — without this, each distinct IP (or an attacker
    cycling IPs) leaves a permanent entry behind for the life of the process.
    Runs at most once per `_SWEEP_INTERVAL_SECONDS`, piggybacking on a normal
    request rather than a separate background task, so it never runs when
    there's no traffic to amortize its cost against."""
    global _last_sweep
    if now - _last_sweep < _SWEEP_INTERVAL_SECONDS:
        return
    _last_sweep = now
    stale = [key for key, window in _hits.items() if not window or now - window[-1] > _STALE_AFTER_SECONDS]
    for key in stale:
        _hits.pop(key, None)


def rate_limit(key_prefix: str, max_requests: int, window_seconds: float):
    async def _dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{key_prefix}:{client_ip}"
        now = time.monotonic()
        _sweep_stale_keys(now)
        window = _hits[key]
        while window and now - window[0] > window_seconds:
            window.popleft()
        if len(window) >= max_requests:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests. Try again later."
            )
        window.append(now)

    return _dependency
