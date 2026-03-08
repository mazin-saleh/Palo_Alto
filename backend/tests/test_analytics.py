"""Tests for the analytics computation engine."""

import pytest
from datetime import datetime, timezone, timedelta

from analytics import (
    compute_zone_safety_scores,
    compute_category_distribution,
    compute_severity_breakdown,
    compute_analysis_method_ratio,
    detect_trending_threats,
    compute_quiet_hours,
    find_cross_zone_correlations,
)


def _make_incident(
    incident_id: str = "INC-0001",
    zone: str = "Sector 1",
    severity: str = "medium",
    category: str = "Phishing",
    status: str = "active",
    analysis_method: str = "primary_llm",
    hours_ago: float = 12,
) -> dict:
    ts = (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()
    return {
        "incident_id": incident_id,
        "location_zone": zone,
        "severity": severity,
        "incident_category": category,
        "status": status,
        "analysis_method": analysis_method,
        "timestamp": ts,
    }


class TestZoneSafetyScores:
    def test_all_clear(self):
        """0 incidents = score 100 for all zones."""
        scores = compute_zone_safety_scores([])
        for zone, data in scores.items():
            assert data["score"] == 100
            assert data["level"] == "safe"
            assert data["incident_count"] == 0
            assert data["trend"] == "stable"

    def test_critical_incident_drops_score(self):
        """A critical incident should significantly lower the score."""
        incidents = [_make_incident(severity="critical", zone="Sector 1")]
        scores = compute_zone_safety_scores(incidents)
        assert scores["Sector 1"]["score"] < 100
        assert scores["Sector 2"]["score"] == 100  # Other zones unaffected

    def test_resolved_reduces_penalty(self):
        """Resolved incidents have less impact than active ones."""
        active = [_make_incident(severity="high", status="active")]
        resolved = [_make_incident(severity="high", status="resolved")]
        score_active = compute_zone_safety_scores(active)["Sector 1"]["score"]
        score_resolved = compute_zone_safety_scores(resolved)["Sector 1"]["score"]
        assert score_resolved > score_active

    def test_recency_bias(self):
        """Recent incidents (within 24h) have higher weight."""
        recent = [_make_incident(severity="medium", hours_ago=6)]
        old = [_make_incident(severity="medium", hours_ago=72)]
        score_recent = compute_zone_safety_scores(recent)["Sector 1"]["score"]
        score_old = compute_zone_safety_scores(old)["Sector 1"]["score"]
        assert score_old > score_recent


class TestCategoryDistribution:
    def test_counts(self):
        """Correct counting and percentages."""
        incidents = [
            _make_incident(category="Phishing"),
            _make_incident(category="Phishing", incident_id="INC-0002"),
            _make_incident(category="Malware", incident_id="INC-0003"),
        ]
        dist = compute_category_distribution(incidents)
        phishing = next(d for d in dist if d["category"] == "Phishing")
        assert phishing["count"] == 2
        assert abs(phishing["percentage"] - 66.7) < 0.1

    def test_empty(self):
        assert compute_category_distribution([]) == []


class TestSeverityBreakdown:
    def test_all_levels_present(self):
        """All severity levels should be present in output."""
        incidents = [
            _make_incident(severity="critical"),
            _make_incident(severity="high", incident_id="INC-0002"),
        ]
        breakdown = compute_severity_breakdown(incidents)
        assert "critical" in breakdown
        assert "high" in breakdown
        assert "medium" in breakdown
        assert "low" in breakdown
        assert "noise" in breakdown
        assert breakdown["critical"] == 1
        assert breakdown["high"] == 1
        assert breakdown["medium"] == 0


class TestAnalysisRatio:
    def test_ai_vs_regex(self):
        """AI vs regex counting works correctly."""
        incidents = [
            _make_incident(analysis_method="primary_llm"),
            _make_incident(analysis_method="fallback_llm", incident_id="INC-0002"),
            _make_incident(analysis_method="regex_fallback", incident_id="INC-0003"),
        ]
        ratio = compute_analysis_method_ratio(incidents)
        assert ratio["ai"] == 2
        assert ratio["regex"] == 1
        assert abs(ratio["ai_percentage"] - 66.7) < 0.1

    def test_empty(self):
        ratio = compute_analysis_method_ratio([])
        assert ratio["ai"] == 0
        assert ratio["regex"] == 0
        assert ratio["ai_percentage"] == 0.0


class TestTrendingThreats:
    def test_rising_category_detected(self):
        """A category with more recent incidents than prior should trend up."""
        now = datetime.now(timezone.utc)
        incidents = [
            # Recent window: 3 phishing
            _make_incident(category="Phishing", hours_ago=6, incident_id="INC-0001"),
            _make_incident(category="Phishing", hours_ago=12, incident_id="INC-0002"),
            _make_incident(category="Phishing", hours_ago=24, incident_id="INC-0003"),
            # Prior window: 1 phishing
            _make_incident(category="Phishing", hours_ago=60, incident_id="INC-0004"),
        ]
        trends = detect_trending_threats(incidents)
        phishing_trend = next((t for t in trends if t["category"] == "Phishing"), None)
        assert phishing_trend is not None
        assert phishing_trend["direction"] == "up"

    def test_no_trends_when_stable(self):
        """Empty list should return no trends."""
        assert detect_trending_threats([]) == []


class TestQuietHours:
    def test_correct_gap(self):
        """Should find the longest gap between incidents."""
        incidents = [
            _make_incident(hours_ago=48, incident_id="INC-0001"),
            _make_incident(hours_ago=24, incident_id="INC-0002"),
            _make_incident(hours_ago=2, incident_id="INC-0003"),
        ]
        gap = compute_quiet_hours(incidents, "Sector 1")
        assert gap >= 20  # ~24 hour gap between INC-0001 and INC-0002

    def test_single_incident(self):
        """Single incident should return 0."""
        incidents = [_make_incident()]
        assert compute_quiet_hours(incidents, "Sector 1") == 0.0

    def test_no_incidents(self):
        assert compute_quiet_hours([], "Sector 1") == 0.0


class TestCrossZoneCorrelations:
    def test_same_category_in_3_zones(self):
        """Same category in 3+ zones within 24h should be detected."""
        incidents = [
            _make_incident(zone="Sector 1", category="Phishing", hours_ago=2, incident_id="INC-0001"),
            _make_incident(zone="Sector 3", category="Phishing", hours_ago=4, incident_id="INC-0002"),
            _make_incident(zone="Sector 5", category="Phishing", hours_ago=6, incident_id="INC-0003"),
        ]
        correlations = find_cross_zone_correlations(incidents)
        assert len(correlations) >= 1
        assert correlations[0]["category"] == "Phishing"
        assert correlations[0]["zone_count"] >= 3

    def test_no_correlation_with_2_zones(self):
        """2 zones is not enough for correlation."""
        incidents = [
            _make_incident(zone="Sector 1", category="Phishing", hours_ago=2, incident_id="INC-0001"),
            _make_incident(zone="Sector 3", category="Phishing", hours_ago=4, incident_id="INC-0002"),
        ]
        correlations = find_cross_zone_correlations(incidents)
        assert len(correlations) == 0

    def test_empty(self):
        assert find_cross_zone_correlations([]) == []
