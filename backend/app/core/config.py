import json
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Voxora Voice Agent API"
    VERSION: str = "0.3.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS origins for Next.js frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if item]
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Gemini Server-side Configuration
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_TIMEOUT_SECONDS: float = 12.0

    # Database Configuration (Defaults to persistent local SQLite; supports PostgreSQL)
    DATABASE_URL: str = "sqlite+aiosqlite:///voxora_calls.db"
    # Telephony Configuration (Provider Abstraction)
    TELEPHONY_PROVIDER: str = "mock"
    TELEPHONY_ENABLE_REAL_CALLS: bool = False
    TELEPHONY_ACCOUNT_SID: str = "placeholder_sid"
    TELEPHONY_AUTH_TOKEN: str = "placeholder_token"
    TELEPHONY_PHONE_NUMBER: str = "+15551234567"
    TELEPHONY_WEBHOOK_URL: Optional[str] = None
    TELEPHONY_RATE_LIMIT_PER_MINUTE: int = 5

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def get_effective_database_url(self) -> str:
        """
        Returns active database URL. Falls back to sqlite+aiosqlite if postgres is placeholder or unconfigured.
        Normalizes postgres:// and postgresql:// to postgresql+asyncpg:// for async SQLAlchemy engines.
        """
        if not self.DATABASE_URL or "placeholder" in self.DATABASE_URL.lower():
            return "sqlite+aiosqlite:///voxora_calls.db"
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    def is_gemini_configured(self) -> bool:
        """
        Validates if GEMINI_API_KEY is present and not a known placeholder string.
        """
        if not self.GEMINI_API_KEY:
            return False
        clean = self.GEMINI_API_KEY.strip()
        if not clean:
            return False
        placeholders = {
            "placeholder_key",
            "your-gemini-api-key-placeholder",
            "your_gemini_api_key_here",
            "none",
        }
        return clean.lower() not in placeholders

    def is_telephony_configured(self) -> bool:
        """
        Validates if real telephony provider credentials are configured and real calls explicitly enabled.
        """
        if not self.TELEPHONY_ENABLE_REAL_CALLS:
            return False
        if not self.TELEPHONY_ACCOUNT_SID or not self.TELEPHONY_AUTH_TOKEN or not self.TELEPHONY_PHONE_NUMBER:
            return False
        placeholders = {
            "placeholder_sid",
            "placeholder_token",
            "your-telephony-account-sid-placeholder",
            "your-telephony-auth-token-placeholder",
            "none",
            "",
        }
        sid_clean = self.TELEPHONY_ACCOUNT_SID.strip().lower()
        token_clean = self.TELEPHONY_AUTH_TOKEN.strip().lower()
        return sid_clean not in placeholders and token_clean not in placeholders


settings = Settings()
