import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import Settings


@pytest.mark.anyio
async def test_top_level_health_endpoint():
    """Verify top-level /health probe returns 200 OK without exposing secrets."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        assert "version" in data
        # Ensure no secrets or tokens exist
        assert "api_key" not in data
        assert "token" not in data


def test_cors_origins_flexible_parsing():
    """Verify CORS_ORIGINS parser handles comma-separated strings and JSON arrays."""
    s1 = Settings(CORS_ORIGINS="https://app.voxora.com, https://admin.voxora.com")
    assert s1.CORS_ORIGINS == ["https://app.voxora.com", "https://admin.voxora.com"]

    s2 = Settings(CORS_ORIGINS='["https://demo.voxora.com"]')
    assert s2.CORS_ORIGINS == ["https://demo.voxora.com"]


def test_database_url_postgresql_async_normalization():
    """Verify database URLs are normalized to asyncpg for PostgreSQL."""
    # Standard postgresql:// to postgresql+asyncpg://
    s1 = Settings(DATABASE_URL="postgresql://user:pass@ep-cool-db.us-east-2.aws.neon.tech/voxora")
    assert s1.get_effective_database_url().startswith("postgresql+asyncpg://")

    # Legacy Heroku/Render postgres:// to postgresql+asyncpg://
    s2 = Settings(DATABASE_URL="postgres://user:pass@host:5432/db")
    assert s2.get_effective_database_url().startswith("postgresql+asyncpg://")

    # Already async URL preserved
    s3 = Settings(DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/db")
    assert s3.get_effective_database_url() == "postgresql+asyncpg://user:pass@host:5432/db"

    # SQLite URL preserved
    s4 = Settings(DATABASE_URL="sqlite+aiosqlite:///voxora_calls.db")
    assert s4.get_effective_database_url() == "sqlite+aiosqlite:///voxora_calls.db"

