"""Tests for the scraper FastAPI HTTP cloud ingestion service."""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from config import Config
from server import app


@pytest.fixture
def client():
    return TestClient(app)


class TestScraperServer:
    """Tests for GET /health and POST /run endpoints."""

    def test_health_endpoint(self, client):
        """GET /health returns service status and reports database connection."""
        response = client.get("/health")
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
        assert data["service"] == "news-pulse-scraper"
        assert "database" in data

    def test_run_missing_job_id(self, client):
        """POST /run requires a valid jobId."""
        response = client.post("/run", json={})
        assert response.status_code == 422

    def test_run_empty_job_id(self, client):
        """POST /run rejects empty jobId string."""
        response = client.post("/run", json={"jobId": ""})
        assert response.status_code == 422

    def test_run_authentication_rejected_when_secret_invalid(self, client):
        """POST /run rejects requests with invalid secret when INGESTION_SERVICE_SECRET is set."""
        with patch.object(Config, "INGESTION_SERVICE_SECRET", "super-secret-token"):
            # Missing header
            res1 = client.post("/run", json={"jobId": "test_job_1"})
            assert res1.status_code == 401

            # Incorrect header
            res2 = client.post(
                "/run",
                json={"jobId": "test_job_1"},
                headers={"X-Ingestion-Secret": "wrong-token"},
            )
            assert res2.status_code == 401

    def test_run_authentication_accepted_with_valid_secret(self, client):
        """POST /run accepts requests with valid secret and returns HTTP 202."""
        with patch.object(Config, "INGESTION_SERVICE_SECRET", "super-secret-token"):
            with patch("server.run_pipeline_task") as mock_pipeline:
                response = client.post(
                    "/run",
                    json={"jobId": "test_job_auth_ok"},
                    headers={"X-Ingestion-Secret": "super-secret-token"},
                )
                assert response.status_code == 202
                data = response.json()
                assert data["jobId"] == "test_job_auth_ok"
                assert data["status"] == "accepted"

    def test_run_accepted_via_bearer_token(self, client):
        """POST /run accepts valid secret supplied via Authorization: Bearer <token>."""
        with patch.object(Config, "INGESTION_SERVICE_SECRET", "super-secret-token"):
            with patch("server.run_pipeline_task"):
                response = client.post(
                    "/run",
                    json={"jobId": "test_job_bearer_ok"},
                    headers={"Authorization": "Bearer super-secret-token"},
                )
                assert response.status_code == 202
                assert response.json()["status"] == "accepted"
