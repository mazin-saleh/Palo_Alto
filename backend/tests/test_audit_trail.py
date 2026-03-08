"""Tests for SOC audit trail on incidents."""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from fastapi.testclient import TestClient
from main import app
from data_store import load_initial_data

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
    yield


@patch("ai_engine._get_client")
def test_create_incident_has_empty_audit_history(mock_get_client):
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_mock_openai_response(VALID_LLM_RESPONSE)
    )
    mock_get_client.return_value = mock_client

    response = client.post("/api/incidents", json={
        "raw_text": "Suspicious email received from unknown sender with link.",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["audit_history"] == []


def test_patch_verification_creates_audit_entry():
    response = client.patch("/api/incidents/INC-0001", json={
        "is_verified_incident": True,
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["audit_history"]) == 1
    entry = data["audit_history"][0]
    assert entry["action"] == "is_verified_incident_changed"
    assert entry["new_value"] is True
    assert "timestamp" in entry


def test_patch_severity_creates_audit_entry():
    response = client.patch("/api/incidents/INC-0001", json={
        "severity": "critical",
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["audit_history"]) >= 1
    entry = data["audit_history"][-1]
    assert entry["action"] == "severity_changed"
    assert entry["new_value"] == "critical"


def test_multiple_patches_accumulate_history():
    client.patch("/api/incidents/INC-0001", json={
        "is_verified_incident": True,
    })
    response = client.patch("/api/incidents/INC-0001", json={
        "severity": "high",
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["audit_history"]) == 2


def test_raw_text_immutable():
    """Confirm raw_text cannot be PATCHed (IncidentPatch model excludes it)."""
    response = client.patch("/api/incidents/INC-0001", json={
        "raw_text": "Overwritten text should not work",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["raw_text"] != "Overwritten text should not work"
