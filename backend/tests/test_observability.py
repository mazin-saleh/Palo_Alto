"""Tests for fallback observability metrics."""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from fastapi.testclient import TestClient
from main import app
from data_store import load_initial_data
from metrics import reset_metrics
from rate_limiter import reset_limiter

client = TestClient(app)

VALID_LLM_RESPONSE = json.dumps({
    "is_verified_incident": True,
    "incident_category": "Phishing",
    "severity": "medium",
    "actionable_checklist": ["Action 1", "Action 2", "Action 3"],
    "fake_news_indicators": [],
})


def _mock_openai_response(content: str):
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    return mock_response


@pytest.fixture(autouse=True)
def _reset_store():
    load_initial_data()
    reset_metrics()
    reset_limiter()
    yield


def test_metrics_endpoint_returns_counters():
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "ai_success_count" in data
    assert "regex_fallback_count" in data
    assert "total_analyzed" in data


@patch("ai_engine._get_client")
def test_ai_success_increments(mock_get_client):
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_mock_openai_response(VALID_LLM_RESPONSE)
    )
    mock_get_client.return_value = mock_client

    client.post("/api/incidents", json={
        "raw_text": "Got a phishing email pretending to be from my bank.",
        "location_zone": "Sector 1",
    })

    response = client.get("/api/metrics")
    data = response.json()
    assert data["ai_success_count"] >= 1


@patch("ai_engine._get_client")
def test_regex_fallback_increments(mock_get_client):
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=Exception("LLM unavailable")
    )
    mock_get_client.return_value = mock_client

    client.post("/api/incidents", json={
        "raw_text": "Got a phishing email pretending to be from my bank.",
        "location_zone": "Sector 1",
    })

    response = client.get("/api/metrics")
    data = response.json()
    assert data["regex_fallback_count"] >= 1


def test_demo_fallback_endpoint():
    response = client.post("/api/incidents/demo-fallback", json={
        "raw_text": "Suspicious phishing email received from unknown sender.",
        "location_zone": "Sector 1",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["analysis_method"] == "regex-fallback"
    assert data["ai_processed"] is True

    metrics = client.get("/api/metrics").json()
    assert metrics["regex_fallback_count"] >= 1
