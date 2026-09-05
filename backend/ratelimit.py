"""A small in-memory fixed-window rate limiter for auth-sensitive routes
(login, register, forgot-password) -- guards against credential-stuffing
and reset-link enumeration without adding a dependency (Redis, slowapi)
that this single-process project doesn't otherwise need. Matches the
project's existing "hand-rolled, no extra moving parts" ethos.

Per-process only: this resets on restart and isn't shared across workers
or instances -- documented in the README's Known Limitations, same as the
project's other disclosed scope boundaries.
"""

import os
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

_WINDOWS: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(route: str, max_requests: int, window_seconds: float):
    """Returns a FastAPI dependency that rejects the (max_requests + 1)th
    call from the same client IP within window_seconds with a 429."""

    def dependency(request: Request) -> None:
        if os.environ.get("RATE_LIMIT_DISABLED", "").lower() == "true":
            return
        key = f"{route}:{_client_ip(request)}"
        now = time.monotonic()
        cutoff = now - window_seconds
        recent = [t for t in _WINDOWS[key] if t > cutoff]
        if len(recent) >= max_requests:
            _WINDOWS[key] = recent
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="too many requests, try again later")
        recent.append(now)
        _WINDOWS[key] = recent

    return dependency
