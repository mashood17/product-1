"""Smoke test for the /health endpoint — the one thing CI/deploy platforms
(Railway) actually probe to decide if the service is up."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_is_unauthenticated():
    # No Authorization header sent — /health must never require auth, or
    # Railway's health check (which sends no credentials) would mark the
    # service unhealthy.
    response = client.get("/health")
    assert response.status_code != 401
    assert response.status_code != 403
