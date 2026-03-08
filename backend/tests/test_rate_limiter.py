"""Tests for the rate limiter."""

import pytest

from rate_limiter import RateLimiter


class TestRateLimiter:
    def test_normal_traffic_passes(self):
        """Requests under the limit should pass."""
        limiter = RateLimiter(max_requests=5, window_seconds=60)
        for _ in range(5):
            assert limiter.check("127.0.0.1") is True

    def test_burst_blocked(self):
        """Requests exceeding the limit should be blocked."""
        limiter = RateLimiter(max_requests=3, window_seconds=60)
        for _ in range(3):
            assert limiter.check("127.0.0.1") is True
        assert limiter.check("127.0.0.1") is False

    def test_different_ips_independent(self):
        """Different IPs should have independent limits."""
        limiter = RateLimiter(max_requests=2, window_seconds=60)
        assert limiter.check("10.0.0.1") is True
        assert limiter.check("10.0.0.1") is True
        assert limiter.check("10.0.0.1") is False
        # Different IP should still be allowed
        assert limiter.check("10.0.0.2") is True

    def test_window_expiry(self):
        """After the window expires, requests should be allowed again."""
        import time
        limiter = RateLimiter(max_requests=1, window_seconds=1)
        assert limiter.check("127.0.0.1") is True
        assert limiter.check("127.0.0.1") is False
        time.sleep(1.1)
        assert limiter.check("127.0.0.1") is True
