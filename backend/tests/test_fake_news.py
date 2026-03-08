"""Test fake news detection and auto-quarantine."""

from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from fastapi.testclient import TestClient

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from main import app
from data_store import load_initial_data

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_store():
    load_initial_data()
    yield


@patch("ai_engine._get_client")
def test_fake_news_auto_quarantine(mock_get_client):
    """Low trust user + hyperbolic text = auto-quarantine."""
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=TimeoutError("timeout")
    )
    mock_get_client.return_value = mock_client

    response = client.post("/api/incidents", json={
        "raw_text": "EXPOSED!!! The city water supply has been CONTAMINATED with TOXIC CHEMICALS!!! They don't want you to know!!! 100% proven by independent scientists!!! Forward this to everyone you know BEFORE THEY DELETE THIS!!!",
        "source": "email_report",
        "reporter_id": "USR-FAKE",
        "user_trust_score": 0.10,
        "location_zone": "Sector 7",
    })

    assert response.status_code == 201
    data = response.json()
    assert data["is_verified_incident"] is False
    assert len(data["fake_news_indicators"]) > 0
    # Should have auto-quarantine marker
    markers_text = " ".join(data["fake_news_indicators"])
    assert "quarantine" in markers_text.lower() or "Auto-quarantined" in markers_text


@patch("ai_engine._get_client")
def test_high_trust_not_quarantined(mock_get_client):
    """High trust user with legitimate report should not be quarantined."""
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=TimeoutError("timeout")
    )
    mock_get_client.return_value = mock_client

    response = client.post("/api/incidents", json={
        "raw_text": "Gas leak detected on Elm Street near the elementary school. Fire department has been called.",
        "source": "neighborhood_portal",
        "reporter_id": "USR-LEGIT",
        "user_trust_score": 0.92,
        "location_zone": "Sector 2",
    })

    assert response.status_code == 201
    data = response.json()
    markers_text = " ".join(data.get("fake_news_indicators", []))
    assert "quarantine" not in markers_text.lower()


@patch("ai_engine._get_client")
def test_single_source_critical_flagged(mock_get_client):
    """Single-source critical event with no corroboration should be flagged."""
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=TimeoutError("timeout")
    )
    mock_get_client.return_value = mock_client

    response = client.post("/api/incidents", json={
        "raw_text": "Active shooter situation reported near the community center. Armed individual seen entering the building.",
        "source": "community_app",
        "reporter_id": "USR-SINGLE",
        "user_trust_score": 0.70,
        "location_zone": "Sector 9",
    })

    assert response.status_code == 201
    data = response.json()
    markers_text = " ".join(data.get("fake_news_indicators", []))
    assert "single-source" in markers_text.lower() or "no corroboration" in markers_text.lower()
