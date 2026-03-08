"""Test fallback: both LLMs fail, regex engine handles it."""

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
def test_fallback_on_llm_failure(mock_get_client):
    """When both LLMs timeout, regex fallback should still classify correctly."""
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=TimeoutError("LLM timeout")
    )
    mock_get_client.return_value = mock_client

    response = client.post("/api/incidents", json={
        "raw_text": "Gas leak detected near the school. Evacuate immediately. Fire department responding.",
        "source": "neighborhood_portal",
        "reporter_id": "USR-TEST",
        "user_trust_score": 0.90,
        "location_zone": "Sector 2",
    })

    assert response.status_code == 201
    data = response.json()
    assert data["analysis_method"] == "regex-fallback"
    assert data["incident_category"] == "Physical Hazard"
    assert data["severity"] in ("critical", "high")
    assert data["ai_processed"] is True
    assert len(data["actionable_checklist"]) >= 1


@patch("ai_engine._get_client")
def test_fallback_malware_detection(mock_get_client):
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=Exception("Connection refused")
    )
    mock_get_client.return_value = mock_client

    response = client.post("/api/incidents", json={
        "raw_text": "Multiple computers infected with ransomware at the library. Screens demanding Bitcoin payment.",
        "source": "community_app",
        "reporter_id": "USR-TEST",
        "user_trust_score": 0.85,
        "location_zone": "Sector 3",
    })

    assert response.status_code == 201
    data = response.json()
    assert data["analysis_method"] == "regex-fallback"
    assert data["incident_category"] == "Malware"


@patch("ai_engine._get_client")
def test_fallback_noise_classification(mock_get_client):
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=TimeoutError("timeout")
    )
    mock_get_client.return_value = mock_client

    response = client.post("/api/incidents", json={
        "raw_text": "The new pizza place on 5th street is terrible. Waited 45 minutes for cold pizza. Would not recommend.",
        "source": "community_app",
        "reporter_id": "USR-TEST",
        "user_trust_score": 0.55,
        "location_zone": "Sector 3",
    })

    assert response.status_code == 201
    data = response.json()
    assert data["analysis_method"] == "regex-fallback"
    assert data["incident_category"] == "Noise"
    assert data["severity"] == "noise"
