"""
Shared production-instrumentation helpers: process RSS + step timing.

Used by both the hero-video pipeline and the image upload pipeline so a
slow or memory-heavy step can be diagnosed from Railway logs alone — which
step it was, how long it took, and how much RSS it added or released.
Extracted out of hero_video_service (where this was first built after a
production OOM incident) once media_service needed the same instrumentation
to decide, from real Railway logs, whether AVIF encoding is worth its CPU
cost — rather than duplicating the same two functions in both modules.
"""

import logging
import time
from contextlib import contextmanager
from typing import Iterator


def current_rss_kb() -> int | None:
    """Current process RSS in kB, read straight from `/proc/self/status`
    (the kernel's own live figure — what the OOM killer actually acts on),
    not `resource.getrusage().ru_maxrss` (a monotonic high-water mark that
    only ever grows and can't show memory being released). Linux-only by
    construction (`/proc` doesn't exist elsewhere); returns None off Linux —
    e.g. local Windows/macOS dev — so instrumentation degrades silently
    instead of breaking non-production runs. Railway's containers are Linux,
    so this is live data in the environment that actually OOMs."""
    try:
        with open("/proc/self/status", "rb") as f:
            for line in f:
                if line.startswith(b"VmRSS:"):
                    return int(line.split()[1])  # kB, per /proc(5)
    except (OSError, IndexError, ValueError):
        return None
    return None


@contextmanager
def timed_step(logger: logging.Logger, tag: str, step: str) -> Iterator[None]:
    """Logs how long one pipeline step took under `[tag] step=... `, plus
    process RSS immediately before/after and the delta between them, so a
    memory spike can be attributed to a specific step from production logs
    alone. Uses try/finally (not try/except) so both duration and RSS are
    logged whether the step succeeds *or* raises. Never alters control flow:
    any exception raised inside the `with` block propagates unchanged."""
    start = time.perf_counter()
    rss_before = current_rss_kb()
    try:
        yield
    finally:
        duration_ms = (time.perf_counter() - start) * 1000
        rss_after = current_rss_kb()
        rss_delta = rss_after - rss_before if (rss_before is not None and rss_after is not None) else None
        logger.info(
            f"[{tag}] step={step} duration_ms={duration_ms:.1f} "
            f"rss_before_kb={rss_before} rss_after_kb={rss_after} rss_delta_kb={rss_delta}"
        )
