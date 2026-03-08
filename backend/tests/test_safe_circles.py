"""Tests for Privacy-First Safe Circles."""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from main import app
from data_store import load_initial_data, reset_circles, _circle_statuses

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_store():
    load_initial_data()
    reset_circles()
    yield


def test_create_circle():
    response = client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Family Safety",
        "member_ids": ["USR-002", "USR-003"],
    })
    assert response.status_code == 201
    data = response.json()
    assert data["circle_id"].startswith("CIRCLE-")
    assert data["owner_id"] == "USR-001"
    assert len(data["member_ids"]) == 2


def test_create_circle_validation():
    response = client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Empty Circle",
        "member_ids": [],
    })
    assert response.status_code == 422


def test_list_circles_for_member():
    client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Test Circle",
        "member_ids": ["USR-002"],
    })
    # Owner sees it
    response = client.get("/api/circles?user_id=USR-001")
    assert len(response.json()) == 1
    # Member sees it
    response = client.get("/api/circles?user_id=USR-002")
    assert len(response.json()) == 1


def test_list_circles_excludes_non_member():
    client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Private Circle",
        "member_ids": ["USR-002"],
    })
    response = client.get("/api/circles?user_id=USR-099")
    assert len(response.json()) == 0


def test_broadcast_status():
    circle = client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Emergency Group",
        "member_ids": ["USR-002"],
    }).json()

    response = client.post(f"/api/circles/{circle['circle_id']}/broadcast", json={
        "sender_id": "USR-001",
        "plaintext_message": "I am safe, sheltering at home.",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["encrypted_payload"] != "I am safe, sheltering at home."
    assert data["status_id"].startswith("STATUS-")


def test_broadcast_non_member_rejected():
    circle = client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Restricted",
        "member_ids": ["USR-002"],
    }).json()

    response = client.post(f"/api/circles/{circle['circle_id']}/broadcast", json={
        "sender_id": "USR-099",
        "plaintext_message": "Trying to sneak in.",
    })
    assert response.status_code == 403


def test_read_statuses_member():
    circle = client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Family",
        "member_ids": ["USR-002"],
    }).json()

    client.post(f"/api/circles/{circle['circle_id']}/broadcast", json={
        "sender_id": "USR-001",
        "plaintext_message": "All clear in Sector 4.",
    })

    response = client.get(f"/api/circles/{circle['circle_id']}/statuses?user_id=USR-002")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["decrypted_message"] == "All clear in Sector 4."


def test_read_statuses_non_member_forbidden():
    circle = client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Private",
        "member_ids": ["USR-002"],
    }).json()

    response = client.get(f"/api/circles/{circle['circle_id']}/statuses?user_id=USR-099")
    assert response.status_code == 403


def test_broadcast_linked_incident():
    circle = client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Neighborhood Watch",
        "member_ids": ["USR-002"],
    }).json()

    response = client.post(f"/api/circles/{circle['circle_id']}/broadcast", json={
        "sender_id": "USR-001",
        "plaintext_message": "Phishing alert in our area.",
        "linked_incident_id": "INC-0001",
    })
    assert response.status_code == 201
    assert response.json()["linked_incident_id"] == "INC-0001"


def test_server_never_stores_plaintext():
    """Verify the server only stores ciphertext, never the original message."""
    circle = client.post("/api/circles", json={
        "owner_id": "USR-001",
        "circle_name": "Privacy Test",
        "member_ids": ["USR-002"],
    }).json()

    secret_message = "My secret location is 123 Main St."
    client.post(f"/api/circles/{circle['circle_id']}/broadcast", json={
        "sender_id": "USR-001",
        "plaintext_message": secret_message,
    })

    # Inspect raw in-memory store — plaintext must NOT appear
    for status in _circle_statuses:
        assert secret_message not in status.get("encrypted_payload", "")
        # Ensure no field contains the plaintext
        for value in status.values():
            if isinstance(value, str):
                assert value != secret_message
