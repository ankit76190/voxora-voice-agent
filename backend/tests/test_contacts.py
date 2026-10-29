import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    with TestClient(app) as test_c:
        yield test_c


def test_create_contact_success():
    """Verify contact creation with normalized phone number and default consent status."""
    payload = {
        "name": "Dr. Aris Thorne",
        "phone": "+1 (415) 555-0199",
        "email": "aris.thorne@meridian.io",
        "company": "Meridian Health",
        "notes": "Interested in automated voice triage.",
        "status": "Active",
    }
    response = client.post("/api/v1/contacts", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert "id" in data
    assert data["name"] == "Dr. Aris Thorne"
    assert data["phone"] == "+1 (415) 555-0199"
    assert data["email"] == "aris.thorne@meridian.io"
    assert data["company"] == "Meridian Health"
    assert data["consent_status"] == "PENDING_VERIFICATION"
    assert data["call_count"] == 0


def test_create_contact_via_alias_endpoint():
    """Verify that /api/contacts alias behaves identically."""
    payload = {
        "name": "Alias Person",
        "phone": "+1 (212) 555-4321",
    }
    response = client.post("/api/contacts", json=payload)
    assert response.status_code == 201
    assert response.json()["name"] == "Alias Person"


def test_contact_validation_failures():
    """Verify 422 responses on empty name, malformed phone, and invalid email."""
    # 1. Empty name
    res1 = client.post("/api/v1/contacts", json={"name": "   ", "phone": "+15551234567"})
    assert res1.status_code == 422

    # 2. Too short phone number
    res2 = client.post("/api/v1/contacts", json={"name": "Bob", "phone": "123"})
    assert res2.status_code == 422

    # 3. Invalid email format
    res3 = client.post(
        "/api/v1/contacts",
        json={"name": "Bob", "phone": "+15551234567", "email": "not-an-email"},
    )
    assert res3.status_code == 422


def test_list_contacts_with_search_and_pagination():
    """Verify search by name/company and pagination parameters."""
    client.post("/api/v1/contacts", json={"name": "Query Search Alpha", "phone": "+15558881111", "company": "Spectra Co"})
    client.post("/api/v1/contacts", json={"name": "Query Search Beta", "phone": "+15558882222", "company": "Omni Group"})

    # Search by name
    res_search = client.get("/api/v1/contacts?search=Search Alpha")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["total"] >= 1
    assert any("Alpha" in c["name"] for c in search_data["items"])

    # Pagination
    res_page = client.get("/api/v1/contacts?page=1&page_size=1")
    assert res_page.status_code == 200
    page_data = res_page.json()
    assert len(page_data["items"]) == 1
    assert page_data["page"] == 1


def test_get_contact_detail_and_404():
    """Verify getting contact details and 404 for invalid IDs."""
    res_404 = client.get("/api/v1/contacts/00000000-0000-0000-0000-000000000000")
    assert res_404.status_code == 404

    create_res = client.post("/api/v1/contacts", json={"name": "Detail Person", "phone": "+15557778888"})
    contact_id = create_res.json()["id"]

    res_get = client.get(f"/api/v1/contacts/{contact_id}")
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["id"] == contact_id
    assert "calls" in data


def test_update_contact_details():
    """Verify updating contact fields via PATCH and PUT."""
    create_res = client.post("/api/v1/contacts", json={"name": "Original Name", "phone": "+15559990000"})
    contact_id = create_res.json()["id"]

    update_payload = {
        "name": "Updated Name",
        "company": "Updated Corp",
        "status": "Prospect",
        "consent_status": "CONSENT_CONFIRMED",
    }
    patch_res = client.patch(f"/api/v1/contacts/{contact_id}", json=update_payload)
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["name"] == "Updated Name"
    assert data["company"] == "Updated Corp"
    assert data["status"] == "Prospect"
    assert data["consent_status"] == "CONSENT_CONFIRMED"


def test_contact_call_relationship_and_safe_deletion():
    """
    CRITICAL ARCHITECTURAL TEST:
    1. Create a contact.
    2. Create a call linked to that contact.
    3. Verify contact detail returns the linked call.
    4. Delete the contact.
    5. Verify the contact is deleted (404).
    6. Verify the historical call is PRESERVED with contact_id set to NULL.
    """
    # 1. Create contact
    contact_res = client.post(
        "/api/v1/contacts",
        json={"name": "Relational Contact", "phone": "+1 (555) 321-7654"},
    )
    contact_id = contact_res.json()["id"]

    # 2. Create call linked to contact
    call_res = client.post(
        "/api/v1/calls",
        json={
            "contact_id": contact_id,
            "contact_name": "Relational Contact",
            "phone_number": "+1 (555) 321-7654",
            "direction": "OUTBOUND",
        },
    )
    call_id = call_res.json()["id"]

    # 3. Verify contact details shows linked call
    detail_res = client.get(f"/api/v1/contacts/{contact_id}")
    assert detail_res.status_code == 200
    assert any(c["id"] == call_id for c in detail_res.json()["calls"])

    # 4. Delete contact
    delete_res = client.delete(f"/api/v1/contacts/{contact_id}")
    assert delete_res.status_code == 200

    # 5. Verify contact is deleted
    assert client.get(f"/api/v1/contacts/{contact_id}").status_code == 404

    # 6. Verify call STILL EXISTS and was not accidentally cascade-deleted!
    call_still_exists_res = client.get(f"/api/v1/calls/{call_id}")
    assert call_still_exists_res.status_code == 200
    call_data = call_still_exists_res.json()
    assert call_data["id"] == call_id
    assert call_data["contact_id"] is None
    assert call_data["contact_name"] == "Relational Contact"


def test_contact_database_error_handling():
    """Verify safe 500 error response without stack trace leakage on database error."""
    with patch("app.services.contact_service.ContactService.create_contact") as mock_create:
        mock_create.side_effect = Exception("Simulated DB connection drop")

        response = client.post("/api/v1/contacts", json={"name": "Crash Test", "phone": "+15550001111"})
        assert response.status_code == 500
        assert "Failed to create contact" in response.json()["detail"]

