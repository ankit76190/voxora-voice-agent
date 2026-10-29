import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.db import AsyncSessionLocal
from app.db.models import CallSession, ContactModel
from app.services.telephony.security import security_manager
from app.core.config import settings

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db_and_security_reset():
    security_manager.reset()
    with TestClient(app) as test_c:
        yield test_c
    security_manager.reset()


def test_telephony_config_status_never_exposes_secrets():
    """Verify provider configuration status, regulatory findings, and zero credential leakage."""
    res = client.get("/api/v1/telephony/config")
    assert res.status_code == 200
    data = res.json()

    assert data["provider"] in ("mock", "twilio")
    assert data["active_mode"] in ("mock", "live")
    assert "regulatory_restrictions" in data
    assert "India (TRAI / DoT)" in data["regulatory_restrictions"]
    assert "safety_guardrails" in data
    assert len(data["safety_guardrails"]) >= 4

    # Ensure no secrets leak
    text_content = res.text.lower()
    assert "auth_token" not in text_content
    assert "secret" not in text_content
    assert "password" not in text_content


def test_mock_mode_call_initiation_success():
    """Verify safe mock-mode outbound call creation with database persistence."""
    payload = {
        "to_number": "+1 (555) 234-5678",
        "consent_confirmed": True,
        "authorization_confirmed": True,
        "agent_name": "Voxora Concierge",
    }
    res = client.post("/api/v1/telephony/calls", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert "call_id" in data
    assert data["provider"] == "mock"
    assert data["is_mock"] is True
    assert data["to_number"] == "+15552345678"
    assert data["status"] in ("IN_PROGRESS", "INITIATED")

    # Verify session exists in CallSession database
    get_res = client.get(f"/api/v1/telephony/calls/{data['call_id']}")
    assert get_res.status_code == 200
    session_data = get_res.json()
    assert session_data["id"] == data["call_id"]
    assert session_data["direction"] == "OUTBOUND"


def test_rejection_of_emergency_numbers():
    """Verify that calling emergency or crisis response numbers is strictly blocked."""
    emergency_targets = ["911", "112", "100", "999", "988"]
    for num in emergency_targets:
        res = client.post(
            "/api/v1/telephony/calls",
            json={
                "to_number": num,
                "consent_confirmed": True,
                "authorization_confirmed": True,
            },
        )
        assert res.status_code == 400
        assert "emergency" in res.json()["detail"].lower()


def test_rejection_of_premium_rate_numbers():
    """Verify that calling premium-rate numbers (e.g. 1-900) is blocked."""
    res = client.post(
        "/api/v1/telephony/calls",
        json={
            "to_number": "+1 (900) 555-0199",
            "consent_confirmed": True,
            "authorization_confirmed": True,
        },
    )
    assert res.status_code == 400
    assert "premium-rate" in res.json()["detail"].lower()


def test_rejection_when_consent_or_authorization_missing():
    """Verify that outbound calls cannot be placed without explicit consent and authorization."""
    # Missing consent
    res1 = client.post(
        "/api/v1/telephony/calls",
        json={
            "to_number": "+15552345678",
            "consent_confirmed": False,
            "authorization_confirmed": True,
        },
    )
    assert res1.status_code == 422

    # Missing authorization
    res2 = client.post(
        "/api/v1/telephony/calls",
        json={
            "to_number": "+15552345678",
            "consent_confirmed": True,
            "authorization_confirmed": False,
        },
    )
    assert res2.status_code == 422


def test_duplicate_active_call_protection():
    """Verify that initiating a duplicate concurrent call to the same number is blocked with 409."""
    payload = {
        "to_number": "+1 (555) 888-9999",
        "consent_confirmed": True,
        "authorization_confirmed": True,
    }

    # First call succeeds
    res1 = client.post("/api/v1/telephony/calls", json=payload)
    assert res1.status_code == 201

    # Second call to same destination while active triggers 409 Conflict
    res2 = client.post("/api/v1/telephony/calls", json=payload)
    assert res2.status_code == 409
    assert "already in progress" in res2.json()["detail"]


def test_rate_limiting_enforcement():
    """Verify that calling frequency is restricted to safe operator test limits."""
    # Limit is 5 per minute
    for i in range(5):
        res = client.post(
            "/api/v1/telephony/calls",
            json={
                "to_number": f"+1555000000{i}",
                "consent_confirmed": True,
                "authorization_confirmed": True,
            },
        )
        assert res.status_code == 201

    # 6th call exceeds rate limit
    res_overflow = client.post(
        "/api/v1/telephony/calls",
        json={
            "to_number": "+15550000099",
            "consent_confirmed": True,
            "authorization_confirmed": True,
        },
    )
    assert res_overflow.status_code == 429
    assert "Rate limit exceeded" in res_overflow.json()["detail"]


def test_call_termination_and_lock_release():
    """Verify manual call termination and release of active destination lock."""
    payload = {
        "to_number": "+1 (555) 777-6666",
        "consent_confirmed": True,
        "authorization_confirmed": True,
    }
    create_res = client.post("/api/v1/telephony/calls", json=payload)
    assert create_res.status_code == 201
    call_id = create_res.json()["call_id"]

    # Terminate call
    term_res = client.post(f"/api/v1/telephony/calls/{call_id}/terminate")
    assert term_res.status_code == 200
    term_data = term_res.json()
    assert term_data["status"] == "COMPLETED"

    # Now that call is terminated, lock is released and number can be called again
    retry_res = client.post("/api/v1/telephony/calls", json=payload)
    assert retry_res.status_code == 201


def test_webhook_status_processing_and_signature_validation():
    """Verify provider webhook processing and signature checks."""
    # 1. Create a call
    create_res = client.post(
        "/api/v1/telephony/calls",
        json={
            "to_number": "+15553334444",
            "consent_confirmed": True,
            "authorization_confirmed": True,
        },
    )
    assert create_res.status_code == 201
    call_info = create_res.json()
    provider_id = call_info["provider_call_id"]
    call_id = call_info["call_id"]

    # 2. Test invalid signature rejected with 403
    bad_webhook_res = client.post(
        "/api/v1/telephony/webhooks/status",
        data={"CallSid": provider_id, "CallStatus": "completed", "CallDuration": "45"},
        headers={"x-mock-signature": "invalid-test-signature"},
    )
    assert bad_webhook_res.status_code == 403

    # 3. Test valid signature updates call status to completed
    good_webhook_res = client.post(
        "/api/v1/telephony/webhooks/status",
        data={"CallSid": provider_id, "CallStatus": "completed", "CallDuration": "45"},
    )
    assert good_webhook_res.status_code == 200

    # 4. Check CallSession was updated
    session_res = client.get(f"/api/v1/telephony/calls/{call_id}")
    assert session_res.status_code == 200
    session_data = session_res.json()
    assert session_data["status"] == "COMPLETED"
    assert session_data["duration_seconds"] == 45


def test_idempotent_webhook_handling():
    """Verify that duplicate or unknown CallSids are handled idempotently without crashing."""
    dup_res = client.post(
        "/api/v1/telephony/webhooks/status",
        data={"CallSid": "unknown_call_sid_12345", "CallStatus": "completed"},
    )
    assert dup_res.status_code == 200


def test_telephony_direct_aliases():
    """Verify /api/telephony/* direct spec aliases."""
    r1 = client.get("/api/telephony/config")
    assert r1.status_code == 200

    r2 = client.post(
        "/api/telephony/calls",
        json={
            "to_number": "+15551112222",
            "consent_confirmed": True,
            "authorization_confirmed": True,
        },
    )
    assert r2.status_code == 201
    cid = r2.json()["call_id"]

    r3 = client.get(f"/api/telephony/calls/{cid}")
    assert r3.status_code == 200


def test_unconfigured_real_provider_rejection():
    """Verify that when real calls are requested without valid credentials, request is safely rejected."""
    with patch.object(settings, "TELEPHONY_ENABLE_REAL_CALLS", True), \
         patch.object(settings, "TELEPHONY_PROVIDER", "twilio"), \
         patch.object(settings, "TELEPHONY_ACCOUNT_SID", "placeholder_sid"):

        res = client.post(
            "/api/v1/telephony/calls",
            json={
                "to_number": "+15559998888",
                "consent_confirmed": True,
                "authorization_confirmed": True,
            },
        )
        assert res.status_code == 503
        assert "not configured" in res.json()["detail"].lower()

