"""Integration tests for the full incident pipeline."""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from main import app
from data_store import _incidents, load_initial_data


@pytest.fixture(autouse=True)
def reset_store():
    """Reset incident store for each test."""
    import data_store
    data_store._incidents = []
    data_store._next_id = 1
    yield
    data_store._incidents = []
    data_store._next_id = 1


@pytest.fixture
def mock_ai():
    """Mock AI engine to return a deterministic result."""
    with patch("routes.analyze_incident", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "is_verified_incident": True,
            "incident_category": "Phishing",
            "severity": "high",
            "actionable_checklist": ["Do not click links", "Report to IT", "Change passwords"],
            "analysis_method": "primary_llm",
            "correlated_incident_ids": [],
            "fake_news_indicators": [],
            "alert_title": "Phishing Alert — Sector 1",
        }
        yield mock


@pytest.mark.asyncio
async def test_create_analyze_pipeline(mock_ai):
    """Full create → analyze → read pipeline."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create
        resp = await client.post("/api/incidents", json={
            "raw_text": "Suspicious phishing email received from unknown sender",
            "location_zone": "Sector 1",
        })
        assert resp.status_code == 201
        data = resp.json()
        inc_id = data["incident_id"]

        # Read back
        resp = await client.get(f"/api/incidents/{inc_id}")
        assert resp.status_code == 200
        detail = resp.json()
        assert detail["ai_processed"] is True
        assert detail["incident_category"] == "Phishing"
        assert detail["severity"] == "high"


@pytest.mark.asyncio
async def test_create_resolve_digest_pipeline(mock_ai):
    """Create → resolve → digest shows resolved."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create
        resp = await client.post("/api/incidents", json={
            "raw_text": "Gas leak reported near intersection of University Ave",
            "location_zone": "Sector 1",
        })
        inc_id = resp.json()["incident_id"]

        # Resolve
        resp = await client.post(f"/api/incidents/{inc_id}/resolve")
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"

        # Digest should not have this as active
        resp = await client.get("/api/digest")
        assert resp.status_code == 200
        digest = resp.json()
        active_ids = [a["incident_id"] for a in digest["active_alerts"]]
        assert inc_id not in active_ids


@pytest.mark.asyncio
async def test_analytics_overview_endpoint(mock_ai):
    """Analytics overview returns valid structure."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a few incidents
        for i in range(3):
            await client.post("/api/incidents", json={
                "raw_text": f"Test incident number {i} with enough characters",
                "location_zone": f"Sector {i + 1}",
            })

        resp = await client.get("/api/analytics/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "zone_scores" in data
        assert "category_distribution" in data
        assert "severity_breakdown" in data
        assert "analysis_method_ratio" in data
        assert "trending_threats" in data
        assert "cross_zone_correlations" in data


@pytest.mark.asyncio
async def test_health_endpoint():
    """Health endpoint returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "version" in data


@pytest.mark.asyncio
async def test_resources_endpoint():
    """Resources endpoint returns structured data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/resources", params={"zone": "Sector 4", "category": "Phishing"})
        assert resp.status_code == 200
        data = resp.json()
        assert "general" in data
        assert "category_specific" in data
        assert "zone_specific" in data
        assert len(data["general"]) > 0
