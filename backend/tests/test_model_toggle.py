"""Tests for dynamic model toggling."""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from main import app
from data_store import load_initial_data
from config import PRIMARY_MODEL, set_active_model

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_store():
    load_initial_data()
    set_active_model(PRIMARY_MODEL)
    yield


def test_get_active_model_default():
    response = client.get("/api/config/model")
    assert response.status_code == 200
    data = response.json()
    assert data["active_model"] == "llama-3.1-8b-instruct"
    assert "allowed_models" in data


def test_set_active_model():
    response = client.post("/api/config/model", json={
        "model": "mistral-7b-instruct",
    })
    assert response.status_code == 200

    response = client.get("/api/config/model")
    data = response.json()
    assert data["active_model"] == "mistral-7b-instruct"


def test_invalid_model_rejected():
    response = client.post("/api/config/model", json={
        "model": "gpt-4-turbo",
    })
    assert response.status_code == 400
