import csv
import io
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.main import app
from app.db import AsyncSessionLocal
from app.db.models import CallSession

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    with TestClient(app) as test_c:
        yield test_c


def test_empty_analytics_overview():
    """Verify that querying a date window with no records returns clean zeros, not errors or fake data."""
    # Using a far-future date range with guaranteed 0 records
    params = {"start_date": "2099-01-01", "end_date": "2099-01-02"}
    response = client.get("/api/v1/analytics/overview", params=params)
    assert response.status_code == 200
    data = response.json()

    assert data["total_sessions"] == 0
    assert data["completed_sessions"] == 0
    assert data["failed_sessions"] == 0
    assert data["incomplete_sessions"] == 0
    assert data["completion_rate"] == 0.0
    assert data["average_duration_seconds"] == 0.0
    assert data["start_date"] == "2099-01-01"
    assert data["end_date"] == "2099-01-02"


def test_empty_trends_and_outcomes():
    """Verify that empty date ranges return empty trend and outcome lists."""
    params = {"start_date": "2099-01-01", "end_date": "2099-01-02"}

    trends_res = client.get("/api/v1/analytics/call-trends", params=params)
    assert trends_res.status_code == 200
    trends_data = trends_res.json()
    assert trends_data["trends"] == []
    assert trends_data["total_period_sessions"] == 0

    outcomes_res = client.get("/api/v1/analytics/call-outcomes", params=params)
    assert outcomes_res.status_code == 200
    outcomes_data = outcomes_res.json()
    assert outcomes_data["outcomes"] == []
    assert outcomes_data["total_sessions"] == 0


@pytest.mark.anyio
async def test_analytics_metric_calculations_known_dataset():
    """
    Seeds a controlled dataset with distinct statuses and durations,
    and verifies that analytics calculations match expected formulas.
    """
    test_day = datetime(2035, 5, 15, 12, 0, 0, tzinfo=timezone.utc)

    # Dataset:
    # 1: COMPLETED, duration=60
    # 2: COMPLETED, duration=120
    # 3: COMPLETED, duration=0 (e.g. instant hangup, duration invalid/0 -> excluded from avg duration)
    # 4: FAILED, duration=15
    # 5: IN_PROGRESS, duration=0
    # 6: BUSY, duration=0
    # Total = 6, Completed = 3, Failed = 1, Incomplete = 2
    # Expected completion rate: (3 / 6) * 100 = 50.0%
    # Expected avg duration: (60 + 120) / 2 = 90.0s

    async with AsyncSessionLocal() as db:
        # Clean up any residual data for this test date
        await db.execute(
            delete(CallSession).where(
                CallSession.started_at >= datetime(2035, 5, 15, 0, 0, 0, tzinfo=timezone.utc),
                CallSession.started_at <= datetime(2035, 5, 15, 23, 59, 59, tzinfo=timezone.utc),
            )
        )
        await db.commit()

        sessions = [
            CallSession(
                contact_name="Dataset Contact 1",
                direction="BROWSER",
                status="COMPLETED",
                duration_seconds=60,
                started_at=test_day,
            ),
            CallSession(
                contact_name="Dataset Contact 2",
                direction="BROWSER",
                status="COMPLETED",
                duration_seconds=120,
                started_at=test_day + timedelta(minutes=10),
            ),
            CallSession(
                contact_name="Dataset Contact 3",
                direction="BROWSER",
                status="COMPLETED",
                duration_seconds=0,
                started_at=test_day + timedelta(minutes=20),
            ),
            CallSession(
                contact_name="Dataset Contact 4",
                direction="BROWSER",
                status="FAILED",
                duration_seconds=15,
                started_at=test_day + timedelta(minutes=30),
            ),
            CallSession(
                contact_name="Dataset Contact 5",
                direction="BROWSER",
                status="IN_PROGRESS",
                duration_seconds=0,
                started_at=test_day + timedelta(minutes=40),
            ),
            CallSession(
                contact_name="Dataset Contact 6",
                direction="BROWSER",
                status="BUSY",
                duration_seconds=0,
                started_at=test_day + timedelta(minutes=50),
            ),
        ]
        db.add_all(sessions)
        await db.commit()

    # Query overview for this specific test day
    res = client.get(
        "/api/v1/analytics/overview",
        params={"start_date": "2035-05-15", "end_date": "2035-05-15"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["total_sessions"] == 6
    assert data["completed_sessions"] == 3
    assert data["failed_sessions"] == 1
    assert data["incomplete_sessions"] == 2
    assert data["completion_rate"] == 50.0
    assert data["average_duration_seconds"] == 90.0

    # Query trends
    trends_res = client.get(
        "/api/v1/analytics/call-trends",
        params={"start_date": "2035-05-15", "end_date": "2035-05-15"},
    )
    assert trends_res.status_code == 200
    trends = trends_res.json()["trends"]
    assert len(trends) == 1
    assert trends[0]["date"] == "2035-05-15"
    assert trends[0]["total"] == 6
    assert trends[0]["completed"] == 3
    assert trends[0]["failed"] == 1
    assert trends[0]["incomplete"] == 2

    # Query outcomes
    outcomes_res = client.get(
        "/api/v1/analytics/call-outcomes",
        params={"start_date": "2035-05-15", "end_date": "2035-05-15"},
    )
    assert outcomes_res.status_code == 200
    outcomes = {o["status"]: o for o in outcomes_res.json()["outcomes"]}
    assert outcomes["COMPLETED"]["count"] == 3
    assert outcomes["COMPLETED"]["percentage"] == 50.0
    assert outcomes["FAILED"]["count"] == 1
    assert outcomes["IN_PROGRESS"]["count"] == 1
    assert outcomes["BUSY"]["count"] == 1


def test_date_range_validation_errors():
    """Verify robust validation of query date parameters."""
    # Malformed start_date
    res1 = client.get("/api/v1/analytics/overview", params={"start_date": "invalid-date"})
    assert res1.status_code == 422
    assert "Invalid start_date" in res1.json()["detail"]

    # Malformed end_date
    res2 = client.get("/api/v1/analytics/overview", params={"end_date": "2026-99-99"})
    assert res2.status_code == 422
    assert "Invalid end_date" in res2.json()["detail"]

    # Inverted date range (start > end)
    res3 = client.get(
        "/api/v1/analytics/overview",
        params={"start_date": "2026-10-30", "end_date": "2026-10-01"},
    )
    assert res3.status_code == 422
    assert "start_date cannot be after end_date" in res3.json()["detail"]


@pytest.mark.anyio
async def test_csv_export_content_and_escaping():
    """
    Verify that CSV export correctly formats headers, applies date filters,
    and safely escapes commas, quotes, and newlines per RFC 4180.
    """
    test_dt = datetime(2036, 1, 10, 8, 30, 0, tzinfo=timezone.utc)
    complex_summary = 'Line 1: Discussed pricing.\nLine 2: Customer said, "Send contract, please".'

    async with AsyncSessionLocal() as db:
        await db.execute(
            delete(CallSession).where(
                CallSession.started_at >= datetime(2036, 1, 10, 0, 0, 0, tzinfo=timezone.utc),
                CallSession.started_at <= datetime(2036, 1, 10, 23, 59, 59, tzinfo=timezone.utc),
            )
        )
        await db.commit()

        session = CallSession(
            contact_name="Dr. Gregory House, M.D.",
            phone_number="+1 (555) 777-8888",
            direction="BROWSER",
            status="COMPLETED",
            duration_seconds=185,
            started_at=test_dt,
            ended_at=test_dt + timedelta(seconds=185),
            agent_name="Voxora Triage AI",
            summary=complex_summary,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id

    # Request CSV export
    response = client.get(
        "/api/v1/analytics/export",
        params={"start_date": "2036-01-10", "end_date": "2036-01-10"},
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers["Content-Type"]
    assert "attachment; filename=" in response.headers["Content-Disposition"]

    content = response.text
    # Parse with Python standard csv.reader to verify RFC 4180 parsing
    reader = list(csv.reader(io.StringIO(content)))
    assert len(reader) >= 2  # At least header + 1 data row

    headers = reader[0]
    assert headers == [
        "Session ID",
        "Contact Name",
        "Phone / Audio Source",
        "Direction",
        "Status",
        "Duration (Seconds)",
        "Started At (UTC)",
        "Ended At (UTC)",
        "Agent Name",
        "Summary",
    ]

    # Find our specific row
    row = next((r for r in reader[1:] if r[0] == session_id), None)
    assert row is not None
    assert row[1] == "Dr. Gregory House, M.D."  # Comma in name handled properly
    assert row[4] == "COMPLETED"
    assert row[5] == "185"
    assert row[8] == "Voxora Triage AI"
    assert row[9] == complex_summary  # Quotes and newlines preserved without corrupting CSV structure

    # Ensure no secrets leak
    assert "GEMINI" not in content
    assert "api_key" not in content.lower()
    assert "password" not in content.lower()


def test_analytics_alias_endpoints():
    """Verify that direct spec aliases (/api/analytics/*) route correctly."""
    r1 = client.get("/api/analytics/overview")
    assert r1.status_code == 200

    r2 = client.get("/api/analytics/call-trends")
    assert r2.status_code == 200

    r3 = client.get("/api/analytics/call-outcomes")
    assert r3.status_code == 200

    r4 = client.get("/api/analytics/export")
    assert r4.status_code == 200
    assert "text/csv" in r4.headers["Content-Type"]


def test_analytics_database_error_handling():
    """Verify safe 500 error handling when database fails unexpectedly."""
    with patch(
        "app.services.analytics_service.AnalyticsService.get_overview",
        side_effect=Exception("Database lock acquisition failure"),
    ):
        res = client.get("/api/v1/analytics/overview")
        assert res.status_code == 500
        assert "Database failure" in res.json()["detail"]
        assert "Database lock acquisition failure" not in res.json()["detail"]
