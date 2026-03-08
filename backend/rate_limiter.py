"""In-memory rate limiter for FastAPI.

Limits requests per IP address using a sliding window approach.
"""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import Request, HTTPException


class RateLimiter:
    """Sliding-window rate limiter: max_requests per window_seconds per IP."""

    def __init__(self, max_requests: int = 10, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _cleanup(self, ip: str, now: float) -> None:
        cutoff = now - self.window_seconds
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]

    def check(self, ip: str) -> bool:
        """Return True if request is allowed, False if rate-limited."""
        now = time.time()
        self._cleanup(ip, now)
        if len(self._requests[ip]) >= self.max_requests:
            return False
        self._requests[ip].append(now)
        return True


# Singleton instance
_limiter = RateLimiter(max_requests=10, window_seconds=60)


async def rate_limit_dependency(request: Request) -> None:
    """FastAPI dependency that enforces rate limiting."""
    client_ip = request.client.host if request.client else "unknown"
    if not _limiter.check(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before submitting again.",
        )


def get_limiter() -> RateLimiter:
    """Return the singleton limiter instance (for testing)."""
    return _limiter


def reset_limiter() -> None:
    """Reset the limiter state (for testing)."""
    _limiter._requests.clear()
