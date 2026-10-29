import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services.gemini_service import GeminiTimeoutError, GeminiRateLimitError, GeminiUpstreamError

client = TestClient(app)


def test_status_endpoint_never_leaks_api_key():
    """Verify that the status endpoint returns metadata but never leaks credentials."""
    response = client.get("/api/v1/conversation/status")
    assert response.status_code == 200
    data = response.json()
    assert "gemini_configured" in data
    assert "model" in data
    # Ensure key is not in response
    assert "GEMINI_API_KEY" not in data
    assert "api_key" not in data


def test_conversation_validation_empty_message():
    """Verify that empty or whitespace-only messages are rejected with 422."""
    response = client.post(
        "/api/v1/conversation",
        json={"message": ""},
    )
    assert response.status_code == 422

    response_ws = client.post(
        "/api/v1/conversation",
        json={"message": "    "},
    )
    assert response_ws.status_code == 422


def test_conversation_validation_oversized_message():
    """Verify that messages exceeding 2000 characters are rejected with 422."""
    oversized = "a" * 2001
    response = client.post(
        "/api/v1/conversation",
        json={"message": oversized},
    )
    assert response.status_code == 422


def test_conversation_validation_oversized_history():
    """Verify that conversation history exceeding 20 items is rejected with 422."""
    history = [{"role": "user", "content": f"message {i}"} for i in range(21)]
    response = client.post(
        "/api/v1/conversation",
        json={"message": "hello", "history": history},
    )
    assert response.status_code == 422


def test_conversation_unconfigured_api_key():
    """When GEMINI_API_KEY is missing or placeholder, returns 503 setup error."""
    with patch.object(settings, "GEMINI_API_KEY", None):
        response = client.post(
            "/api/v1/conversation",
            json={"message": "Hello AI"},
        )
        assert response.status_code == 503
        data = response.json()
        assert "Gemini API key is not configured" in data["detail"]


def test_conversation_successful_gemini_response_mocked():
    """Test successful Gemini conversation reply with mocked SDK."""
    mock_response = MagicMock()
    mock_response.text = "Hello! I am Alex, your automated Voxora assistant."

    with patch.object(settings, "GEMINI_API_KEY", "test-secret-key-12345"), \
         patch("app.services.gemini_service.get_gemini_client") as mock_get_client:

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        payload = {
            "message": "Hello, how can you help me today?",
            "history": [
                {"role": "user", "content": "Hi"},
                {"role": "model", "content": "Welcome to Voxora."},
            ],
            "system_instruction": "Be concise.",
            "temperature": 0.5,
        }

        response = client.post("/api/v1/conversation", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "success"
        assert data["response"] == "Hello! I am Alex, your automated Voxora assistant."
        assert "turn_id" in data
        assert data["model"] == settings.GEMINI_MODEL
        # Assert API key is never in the response payload
        assert "test-secret-key-12345" not in response.text


def test_conversation_timeout_handling_mocked():
    """Test that upstream timeouts return a clean 504 Gateway Timeout."""
    with patch("app.api.v1.endpoints.conversation.generate_conversation_reply") as mock_reply:
        mock_reply.side_effect = GeminiTimeoutError("Upstream Gemini API request timed out.")

        response = client.post(
            "/api/v1/conversation",
            json={"message": "Will this time out?"},
        )
        assert response.status_code == 504
        assert "timed out" in response.json()["detail"]


def test_conversation_rate_limit_handling_mocked():
    """Test that rate limit / quota exhaustion returns 429 Too Many Requests."""
    with patch("app.api.v1.endpoints.conversation.generate_conversation_reply") as mock_reply:
        mock_reply.side_effect = GeminiRateLimitError("Gemini API rate limit or quota exceeded.")

        response = client.post(
            "/api/v1/conversation",
            json={"message": "High volume request"},
        )
        assert response.status_code == 429
        assert "rate limit or quota exceeded" in response.json()["detail"]


def test_conversation_upstream_error_handling_mocked():
    """Test that unexpected upstream 5xx errors return a clean 502 Bad Gateway."""
    with patch("app.api.v1.endpoints.conversation.generate_conversation_reply") as mock_reply:
        mock_reply.side_effect = GeminiUpstreamError("Upstream AI service encountered an error processing the conversation.")

        response = client.post(
            "/api/v1/conversation",
            json={"message": "Test upstream failure"},
        )
        assert response.status_code == 502
        assert "Upstream AI service encountered an error" in response.json()["detail"]
