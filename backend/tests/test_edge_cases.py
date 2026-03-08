"""Edge case tests for robustness."""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from main import app
from analytics import (
    compute_zone_safety_scores,
    compute_category_distribution,
    compute_severity_breakdown,
    compute_analysis_method_ratio,
    detect_trending_threats,
    find_cross_zone_correlations,
)


@pytest.fixture(autouse=True)
def reset_store():
    import data_store
    data_store._incidents = []
    data_store._next_id = 1
    yield
    data_store._incidents = []
    data_store._next_id = 1


class TestEmptyStoreAnalytics:
    def test_zone_scores_all_safe(self):
        """Empty store should report all zones as safe."""
        scores = compute_zone_safety_scores([])
        for zone, data in scores.items():
            assert data["score"] == 100
            assert data["level"] == "safe"

    def test_category_distribution_empty(self):
        assert compute_category_distribution([]) == []

    def test_severity_breakdown_zeros(self):
        breakdown = compute_severity_breakdown([])
        for key in ("critical", "high", "medium", "low", "noise"):
            assert breakdown[key] == 0

    def test_analysis_ratio_empty(self):
        ratio = compute_analysis_method_ratio([])
        assert ratio["ai"] == 0
        assert ratio["regex"] == 0

    def test_trending_threats_empty(self):
        assert detect_trending_threats([]) == []

    def test_cross_zone_empty(self):
        assert find_cross_zone_correlations([]) == []


class TestMalformedTimestamps:
    def test_bad_timestamp_in_analytics(self):
        """Malformed timestamps should not crash analytics."""
        incidents = [{
            "incident_id": "INC-0001",
            "location_zone": "Sector 1",
            "severity": "high",
            "incident_category": "Phishing",
            "status": "active",
            "timestamp": "not-a-date",
            "analysis_method": "primary_llm",
        }]
        # Should not raise
        scores = compute_zone_safety_scores(incidents)
        assert "Sector 1" in scores
        dist = compute_category_distribution(incidents)
        assert len(dist) == 1
        trends = detect_trending_threats(incidents)
        assert isinstance(trends, list)


class TestMaxLengthText:
    @pytest.mark.asyncio
    async def test_max_length_text_accepted(self):
        """2000 character text should be accepted."""
        mock_result = {
            "is_verified_incident": True,
            "incident_category": "Noise",
            "severity": "noise",
            "actionable_checklist": [],
            "analysis_method": "regex_fallback",
            "correlated_incident_ids": [],
            "fake_news_indicators": [],
            "alert_title": "Noise Report",
        }
        with patch("routes.analyze_incident", new_callable=AsyncMock, return_value=mock_result):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/api/incidents", json={
                    "raw_text": "A" * 2000,
                    "location_zone": "Sector 1",
                })
                assert resp.status_code == 201


class TestUnicodeHandling:
    @pytest.mark.asyncio
    async def test_unicode_text_accepted(self):
        """Unicode characters should be handled properly."""
        mock_result = {
            "is_verified_incident": True,
            "incident_category": "Noise",
            "severity": "noise",
            "actionable_checklist": [],
            "analysis_method": "regex_fallback",
            "correlated_incident_ids": [],
            "fake_news_indicators": [],
            "alert_title": "Noise Report",
        }
        with patch("routes.analyze_incident", new_callable=AsyncMock, return_value=mock_result):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/api/incidents", json={
                    "raw_text": "Reportamos un incidente sospechoso en el parque. Vimos a alguien actuar extraño cerca del 公園",
                    "location_zone": "Sector 1",
                })
                assert resp.status_code == 201
                data = resp.json()
                assert "公園" in data["raw_text"]


class TestHTMLInjection:
    @pytest.mark.asyncio
    async def test_html_tags_stripped(self):
        """HTML tags should be stripped from raw_text."""
        mock_result = {
            "is_verified_incident": True,
            "incident_category": "Noise",
            "severity": "noise",
            "actionable_checklist": [],
            "analysis_method": "regex_fallback",
            "correlated_incident_ids": [],
            "fake_news_indicators": [],
            "alert_title": "Noise Report",
        }
        with patch("routes.analyze_incident", new_callable=AsyncMock, return_value=mock_result):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/api/incidents", json={
                    "raw_text": "<script>alert('xss')</script> Someone reported a safety concern in the park",
                    "location_zone": "Sector 1",
                })
                assert resp.status_code == 201
                data = resp.json()
                assert "<script>" not in data["raw_text"]
                assert "</script>" not in data["raw_text"]


class TestInputValidation:
    @pytest.mark.asyncio
    async def test_invalid_zone_rejected(self):
        """Invalid zone should be rejected with 422."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/incidents", json={
                "raw_text": "A suspicious person was spotted near the park area",
                "location_zone": "Invalid Zone",
            })
            assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_too_short_text_rejected(self):
        """Text under minimum length should be rejected."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/incidents", json={
                "raw_text": "short",
                "location_zone": "Sector 1",
            })
            assert resp.status_code == 422
