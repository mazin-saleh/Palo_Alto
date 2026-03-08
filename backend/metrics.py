"""Fallback observability metrics."""

from __future__ import annotations

_counters: dict[str, int] = {"ai_success": 0, "regex_fallback": 0}


def increment_ai_success() -> None:
    _counters["ai_success"] += 1


def increment_regex_fallback() -> None:
    _counters["regex_fallback"] += 1


def get_metrics() -> dict:
    return {
        "ai_success_count": _counters["ai_success"],
        "regex_fallback_count": _counters["regex_fallback"],
        "total_analyzed": _counters["ai_success"] + _counters["regex_fallback"],
    }


def reset_metrics() -> None:
    _counters["ai_success"] = 0
    _counters["regex_fallback"] = 0
