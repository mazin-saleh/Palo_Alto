"""Fake news / authenticity detection pipeline.

Runs AFTER AI or regex categorization to overlay verification status.
"""

from __future__ import annotations

import re
from datetime import datetime

HYPERBOLIC_PHRASES = re.compile(
    r"(?i)(100% proven|they don't want you to know|exposed|wake up|"
    r"not a drill|forward this|share before|covering it up|"
    r"before they delete|insider information|before they silence)"
)

LINGUISTIC_THRESHOLD = 5  # combined marker count to flag


def compute_linguistic_score(text: str) -> tuple[int, list[str]]:
    """Return (score, list_of_markers) for fake-news linguistic analysis."""
    markers: list[str] = []
    score = 0

    # ALL CAPS words (3+ chars)
    caps_words = [w for w in text.split() if w.isupper() and len(w) >= 3]
    if len(caps_words) >= 3:
        markers.append(f"Excessive ALL-CAPS ({len(caps_words)} words)")
        score += len(caps_words)

    # Exclamation marks
    excl = text.count("!")
    if excl >= 3:
        markers.append(f"Excessive exclamation marks ({excl})")
        score += excl // 2

    # Hyperbolic phrases
    for m in HYPERBOLIC_PHRASES.finditer(text):
        markers.append(f"Hyperbolic phrase: \"{m.group(0).strip()}\"")
        score += 2

    return score, markers


def find_correlated_incidents(
    incident: dict,
    all_incidents: list[dict],
    time_window_hours: int = 24,
    cross_zone: bool = False,
) -> list[str]:
    """Find existing incidents with similar category within a time window.

    If cross_zone is False (default), only matches within the same zone.
    If cross_zone is True, matches across all zones.
    """
    correlated: list[str] = []
    try:
        inc_time = datetime.fromisoformat(incident["timestamp"].replace("Z", "+00:00"))
    except (ValueError, KeyError):
        return correlated

    zone = incident.get("location_zone")
    category = incident.get("incident_category")
    inc_id = incident.get("incident_id")

    if not category:
        return correlated
    if not cross_zone and not zone:
        return correlated

    for other in all_incidents:
        if other["incident_id"] == inc_id:
            continue
        if not cross_zone and other.get("location_zone") != zone:
            continue
        if other.get("incident_category") != category:
            continue
        try:
            other_time = datetime.fromisoformat(other["timestamp"].replace("Z", "+00:00"))
        except (ValueError, KeyError):
            continue
        if abs((inc_time - other_time).total_seconds()) <= time_window_hours * 3600:
            correlated.append(other["incident_id"])

    return correlated


def apply_fake_news_overlay(
    incident: dict,
    analysis: dict,
    all_incidents: list[dict],
) -> dict:
    """Apply fake-news detection on top of existing AI/regex analysis.

    Modifies `analysis` in place and returns it.
    """
    raw_text = incident.get("raw_text", "")
    trust_score = incident.get("user_trust_score", 0.5)

    ling_score, ling_markers = compute_linguistic_score(raw_text)

    # Merge linguistic markers into analysis
    existing_markers = analysis.get("fake_news_indicators", [])
    # Deduplicate
    all_markers = list(dict.fromkeys(existing_markers + ling_markers))
    analysis["fake_news_indicators"] = all_markers

    # Correlation check
    correlated = find_correlated_incidents(incident, all_incidents)
    analysis["correlated_incident_ids"] = correlated

    # Auto-quarantine: low trust + high linguistic score
    if trust_score < 0.3 and ling_score >= LINGUISTIC_THRESHOLD:
        analysis["is_verified_incident"] = False
        if "Auto-quarantined: low trust + fake news markers" not in all_markers:
            analysis["fake_news_indicators"].append(
                "Auto-quarantined: low trust + fake news markers"
            )

    # Single-source critical/high with no correlation → flag as unverified
    severity = analysis.get("severity", "")
    if severity in ("critical", "high") and len(correlated) == 0:
        analysis["is_verified_incident"] = False
        if "Single-source high-severity report (no corroboration)" not in analysis["fake_news_indicators"]:
            analysis["fake_news_indicators"].append(
                "Single-source high-severity report (no corroboration)"
            )

    return analysis
