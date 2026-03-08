"""Analytics computation engine for Community Guardian.

Pure functions that compute aggregated statistics from incident data.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from collections import Counter


SEVERITY_WEIGHTS = {
    "critical": 10,
    "high": 6,
    "medium": 3,
    "low": 1,
    "noise": 0,
}

VALID_ZONES = [f"Sector {i}" for i in range(1, 10)]


def _parse_timestamp(ts: str) -> datetime | None:
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def compute_zone_safety_scores(incidents: list[dict]) -> dict:
    """Score 0-100 per zone using severity weights, recency bias, and resolution rate.

    Returns {zone: {score, level, incident_count, trend}}.
    """
    now = datetime.now().astimezone()
    scores: dict = {}

    for zone in VALID_ZONES:
        zone_incidents = [i for i in incidents if i.get("location_zone") == zone]
        total = len(zone_incidents)

        if total == 0:
            scores[zone] = {"score": 100, "level": "safe", "incident_count": 0, "trend": "stable"}
            continue

        # Compute weighted penalty
        penalty = 0.0
        resolved_count = 0
        recent_count = 0
        older_count = 0

        for inc in zone_incidents:
            sev = inc.get("severity", "noise")
            weight = SEVERITY_WEIGHTS.get(sev, 0)

            # Recency bias: incidents within 24h count double
            ts = _parse_timestamp(inc.get("timestamp", ""))
            if ts and (now - ts).total_seconds() <= 86400:
                weight *= 2
                recent_count += 1
            else:
                older_count += 1

            # Resolved incidents reduce penalty by half
            if inc.get("status") == "resolved":
                weight *= 0.5
                resolved_count += 1

            penalty += weight

        # Normalize: cap at 100 penalty points
        score = max(0, int(100 - min(penalty, 100)))

        if score >= 80:
            level = "safe"
        elif score >= 50:
            level = "caution"
        else:
            level = "danger"

        # Trend: more recent than older = worsening
        if recent_count > older_count:
            trend = "worsening"
        elif recent_count < older_count:
            trend = "improving"
        else:
            trend = "stable"

        scores[zone] = {
            "score": score,
            "level": level,
            "incident_count": total,
            "trend": trend,
        }

    return scores


def compute_category_distribution(incidents: list[dict]) -> list[dict]:
    """Return [{category, count, percentage}]."""
    total = len(incidents)
    if total == 0:
        return []

    counts = Counter(i.get("incident_category", "Noise") for i in incidents)
    return [
        {
            "category": cat,
            "count": count,
            "percentage": round(count / total * 100, 1),
        }
        for cat, count in counts.most_common()
    ]


def compute_severity_breakdown(incidents: list[dict]) -> dict:
    """Return {critical: N, high: N, medium: N, low: N, noise: N}."""
    counts = Counter(i.get("severity", "noise") for i in incidents)
    return {
        "critical": counts.get("critical", 0),
        "high": counts.get("high", 0),
        "medium": counts.get("medium", 0),
        "low": counts.get("low", 0),
        "noise": counts.get("noise", 0),
    }


def compute_analysis_method_ratio(incidents: list[dict]) -> dict:
    """Return {ai: N, regex: N, ai_percentage: F}."""
    regex_count = sum(1 for i in incidents if "regex" in (i.get("analysis_method") or ""))
    ai_count = sum(1 for i in incidents if i.get("analysis_method") and "regex" not in i["analysis_method"])
    total = ai_count + regex_count
    return {
        "ai": ai_count,
        "regex": regex_count,
        "ai_percentage": round(ai_count / total * 100, 1) if total > 0 else 0.0,
    }


def detect_trending_threats(incidents: list[dict], window_hours: int = 48) -> list[dict]:
    """Categories with rising frequency in the given window vs. the prior period."""
    now = datetime.now().astimezone()
    cutoff_recent = now - timedelta(hours=window_hours)
    cutoff_prior = cutoff_recent - timedelta(hours=window_hours)

    recent: Counter = Counter()
    prior: Counter = Counter()

    for inc in incidents:
        ts = _parse_timestamp(inc.get("timestamp", ""))
        if ts is None:
            continue
        cat = inc.get("incident_category", "Noise")
        if ts >= cutoff_recent:
            recent[cat] += 1
        elif ts >= cutoff_prior:
            prior[cat] += 1

    trending = []
    for cat in set(list(recent.keys()) + list(prior.keys())):
        r = recent.get(cat, 0)
        p = prior.get(cat, 0)
        if r > p and r >= 2:
            change = ((r - p) / max(p, 1)) * 100
            trending.append({
                "category": cat,
                "recent_count": r,
                "prior_count": p,
                "change_percentage": round(change, 1),
                "direction": "up",
            })
        elif p > r and p >= 2:
            change = ((p - r) / max(p, 1)) * 100
            trending.append({
                "category": cat,
                "recent_count": r,
                "prior_count": p,
                "change_percentage": round(-change, 1),
                "direction": "down",
            })

    return sorted(trending, key=lambda t: abs(t["change_percentage"]), reverse=True)


def compute_quiet_hours(incidents: list[dict], zone: str) -> float:
    """Return the longest gap (in hours) without incidents in a zone."""
    zone_incidents = [
        i for i in incidents
        if i.get("location_zone") == zone
    ]

    timestamps = []
    for inc in zone_incidents:
        ts = _parse_timestamp(inc.get("timestamp", ""))
        if ts:
            timestamps.append(ts)

    if len(timestamps) < 2:
        return 0.0

    timestamps.sort()
    max_gap = 0.0
    for i in range(1, len(timestamps)):
        gap = (timestamps[i] - timestamps[i - 1]).total_seconds() / 3600
        if gap > max_gap:
            max_gap = gap

    return round(max_gap, 1)


def find_cross_zone_correlations(incidents: list[dict], time_window_hours: int = 168) -> list[dict]:
    """Find same category appearing in 3+ zones within a time window (default 7 days)."""
    now = datetime.now().astimezone()
    cutoff = now - timedelta(hours=time_window_hours)

    # Group by category → set of zones
    cat_zones: dict[str, set[str]] = {}
    cat_incidents: dict[str, list[str]] = {}

    for inc in incidents:
        ts = _parse_timestamp(inc.get("timestamp", ""))
        if ts is None or ts < cutoff:
            continue
        cat = inc.get("incident_category", "Noise")
        zone = inc.get("location_zone", "")
        if cat == "Noise":
            continue

        if cat not in cat_zones:
            cat_zones[cat] = set()
            cat_incidents[cat] = []
        cat_zones[cat].add(zone)
        cat_incidents[cat].append(inc.get("incident_id", ""))

    correlations = []
    for cat, zones in cat_zones.items():
        if len(zones) >= 3:
            correlations.append({
                "category": cat,
                "zones": sorted(zones),
                "incident_ids": cat_incidents[cat],
                "zone_count": len(zones),
            })

    return sorted(correlations, key=lambda c: c["zone_count"], reverse=True)
