import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    # Trigger startup events
    with TestClient(app) as test_c:
        yield test_c


def test_create_call_session():
    """Verify that a new call session is initialized in IN_PROGRESS state."""
    payload = {
        "contact_name": "Dr. Sarah Mitchell",
        "phone_number": "+1 (555) 349-1029",
        "direction": "BROWSER",
        "agent_name": "Voxora Voice AI",
    }
    response = client.post("/api/v1/calls", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert "id" in data
    assert data["contact_name"] == "Dr. Sarah Mitchell"
    assert data["direction"] == "BROWSER"
    assert data["status"] == "IN_PROGRESS"
    assert data["duration_seconds"] == 0
    assert "started_at" in data
    assert data["transcripts"] == []


def test_create_call_via_alias_endpoint():
    """Verify that /api/calls endpoint alias functions identically."""
    payload = {
        "contact_name": "Alias Test Contact",
        "phone_number": "+1 (555) 999-0000",
        "direction": "INBOUND",
    }
    response = client.post("/api/calls", json=payload)
    assert response.status_code == 201
    assert response.json()["contact_name"] == "Alias Test Contact"


def test_get_call_details_and_not_found():
    """Verify retrieval of call details and 404 for invalid IDs."""
    # 1. Invalid ID returns 404
    res_404 = client.get("/api/v1/calls/00000000-0000-0000-0000-000000000000")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()

    # 2. Create valid call
    create_res = client.post("/api/v1/calls", json={"contact_name": "Audit Target"})
    call_id = create_res.json()["id"]

    # 3. Retrieve valid call
    get_res = client.get(f"/api/v1/calls/{call_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == call_id


def test_complete_call_session_with_transcripts():
    """Verify session completion, status update, duration and attached transcript turns."""
    # Create call
    create_res = client.post("/api/v1/calls", json={"contact_name": "Marcus Aurelius"})
    call_id = create_res.json()["id"]

    # Complete call with turns and summary
    update_payload = {
        "status": "COMPLETED",
        "duration_seconds": 145,
        "summary": "Customer confirmed shipment schedule.",
        "sentiment": "Positive",
        "transcripts": [
            {"role": "user", "content": "Hello, is my delivery on track?", "timestamp": "14:02:10", "sequence": 1},
            {"role": "agent", "content": "Yes, your batch is scheduled for delivery today.", "timestamp": "14:02:14", "sequence": 2},
        ],
    }

    patch_res = client.patch(f"/api/v1/calls/{call_id}/complete", json=update_payload)
    assert patch_res.status_code == 200
    data = patch_res.json()

    assert data["status"] == "COMPLETED"
    assert data["duration_seconds"] == 145
    assert data["summary"] == "Customer confirmed shipment schedule."
    assert data["sentiment"] == "Positive"
    assert len(data["transcripts"]) == 2
    assert data["transcripts"][0]["content"] == "Hello, is my delivery on track?"
    assert data["transcripts"][1]["role"] == "agent"


def test_complete_call_invalid_id():
    """Verify 404 when attempting to complete non-existent call."""
    res = client.patch(
        "/api/v1/calls/invalid-call-id-9999/complete",
        json={"status": "COMPLETED"},
    )
    assert res.status_code == 404


def test_call_validation_errors():
    """Verify validation on negative durations and malformed payloads."""
    create_res = client.post("/api/v1/calls", json={"contact_name": "Validation Target"})
    call_id = create_res.json()["id"]

    # Negative duration is rejected
    res = client.patch(
        f"/api/v1/calls/{call_id}/complete",
        json={"duration_seconds": -10},
    )
    assert res.status_code == 422

    # Empty transcript content is rejected
    res_empty_transcript = client.patch(
        f"/api/v1/calls/{call_id}/complete",
        json={
            "transcripts": [
                {"role": "user", "content": "   ", "timestamp": "10:00:00"}
            ]
        },
    )
    assert res_empty_transcript.status_code == 422


def test_list_calls_pagination_and_filters():
    """Verify list filtering by search term, status, and pagination metadata."""
    # Seed specific records
    client.post("/api/v1/calls", json={"contact_name": "Zeta Contact Alpha", "phone_number": "+1 (800) 111-2222"})
    client.post("/api/v1/calls", json={"contact_name": "Beta Contact Gamma", "phone_number": "+1 (800) 333-4444"})

    # 1. Test pagination
    list_res = client.get("/api/v1/calls?page=1&page_size=2")
    assert list_res.status_code == 200
    data = list_res.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total_pages"] >= 1

    # 2. Test search filter
    search_res = client.get("/api/v1/calls?search=Zeta Contact")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert any("Zeta" in item["contact_name"] for item in search_data["items"])

    # 3. Test status filter
    status_res = client.get("/api/v1/calls?status=IN_PROGRESS")
    assert status_res.status_code == 200
    assert all(item["status"] == "IN_PROGRESS" for item in status_res.json()["items"])


def test_database_failure_handling():
    """Verify safe 500 error response without stack trace leakage on database error."""
    with patch("app.services.call_service.CallService.create_call") as mock_create:
        mock_create.side_effect = Exception("Simulated database connection failure")

        response = client.post("/api/v1/calls", json={"contact_name": "Crash Test"})
        assert response.status_code == 500
        assert "Failed to create call session" in response.json()["detail"]


def test_call_records_contain_no_secrets():
    """Verify that call record representations never store or leak credentials."""
    create_res = client.post("/api/v1/calls", json={"contact_name": "Privacy Check"})
    call_id = create_res.json()["id"]

    get_res = client.get(f"/api/v1/calls/{call_id}")
    text_content = get_res.text.lower()
    assert "api_key" not in text_content
    assert "secret" not in text_content
    assert "password" not in text_content

