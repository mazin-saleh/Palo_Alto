"""Test happy path: LLM returns valid analysis."""

import json
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from fastapi.testclient import TestClient

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from main import app
from data_store import load_initial_data

client = TestClient(app)

VALID_LLM_RESPONSE = json.dumps({
    "is_verified_incident": True,
    "incident_category": "Phishing",
    "severity": "medium",
    "actionable_checklist": [
        "Do not click the suspicious link",
        "Report the email to your provider",
        "Change your passwords immediately"
    ],
    "fake_news_indicators": []
})


@pytest.fixture(autouse=True)
def _reset_store():
    load_initial_data()
    yield


def _mock_openai_response(content: str):
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    return mock_response


@patch("ai_engine._get_client")
def test_create_incident_with_llm(mock_get_client):
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_mock_openai_response(VALID_LLM_RESPONSE)
    )
    mock_get_client.return_value = mock_client

    response = client.post("/api/incidents", json={
        "raw_text": "Got a phishing email pretending to be from my bank asking for credentials.",
        "source": "email_report",
        "reporter_id": "USR-TEST",
        "user_trust_score": 0.85,
        "location_zone": "Sector 4",
    })

    assert response.status_code == 201
    data = response.json()
    assert data["incident_category"] == "Phishing"
    assert data["severity"] == "medium"
    assert len(data["actionable_checklist"]) == 3
    assert data["analysis_method"] == "llama-3.1-8b-instruct"
    assert data["ai_processed"] is True


def test_list_incidents():
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_incident_detail():
    response = client.get("/api/incidents/INC-0001")
    assert response.status_code == 200
    assert response.json()["incident_id"] == "INC-0001"


def test_get_incident_not_found():
    response = client.get("/api/incidents/INC-9999")
    assert response.status_code == 404


def test_patch_incident():
    response = client.patch("/api/incidents/INC-0001", json={
        "is_verified_incident": True,
        "severity": "high",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_verified_incident"] is True
    assert data["severity"] == "high"


def test_delete_incident():
    response = client.delete("/api/incidents/INC-0001")
    assert response.status_code == 204

    response = client.get("/api/incidents/INC-0001")
    assert response.status_code == 404


def test_input_validation_too_short():
    response = client.post("/api/incidents", json={
        "raw_text": "short",
    })
    assert response.status_code == 422
