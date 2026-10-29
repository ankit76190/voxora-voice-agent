import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings as core_settings
from app.db.models import SystemSettingsModel
from app.schemas.settings import SettingsUpdate, SecurityStatusResponse

logger = logging.getLogger(__name__)

DEFAULT_SETTINGS = {
    "agent_name": "Voxora Concierge",
    "custom_instructions": "",
    "language": "en-US",
    "response_style": "balanced",
    "greeting": "Hello, I am Voxora Concierge. How may I direct your inquiry today?",
    "max_history_turns": 10,
    "temperature": 0.7,
    "voice_playback_enabled": True,
    "speech_rate": 1.0,
    "voice_id": None,
}


class SettingsService:
    @staticmethod
    async def get_settings(db: AsyncSession) -> SystemSettingsModel:
        """
        Retrieves the persisted system settings record.
        Auto-initializes with defaults if no record exists.
        """
        result = await db.execute(
            select(SystemSettingsModel).where(SystemSettingsModel.id == "default")
        )
        record = result.scalar_one_or_none()

        if not record:
            record = SystemSettingsModel(id="default", **DEFAULT_SETTINGS)
            db.add(record)
            await db.commit()
            await db.refresh(record)

        return record

    @staticmethod
    async def update_settings(
        db: AsyncSession, payload: SettingsUpdate
    ) -> SystemSettingsModel:
        """
        Updates the settings with validated configuration parameters.
        """
        record = await SettingsService.get_settings(db)
        update_data = payload.model_dump(exclude_unset=True)

        for key, val in update_data.items():
            if hasattr(record, key):
                setattr(record, key, val)

        record.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    async def reset_settings(db: AsyncSession) -> SystemSettingsModel:
        """
        Resets agent persona and voice configuration back to defaults.
        Guarantees that historical call sessions and contacts remain completely untouched.
        """
        record = await SettingsService.get_settings(db)

        for key, val in DEFAULT_SETTINGS.items():
            setattr(record, key, val)

        record.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(record)
        return record

    @staticmethod
    def get_security_status() -> SecurityStatusResponse:
        """
        Inspects the server-side environment and security guardrails.
        Strictly excludes any actual API keys, passwords, or secret strings.
        """
        return SecurityStatusResponse(
            gemini_configured=core_settings.is_gemini_configured(),
            model=core_settings.GEMINI_MODEL,
            server_safety_active=True,
            max_allowed_history=20,
            max_instruction_length=2000,
            authentication_mode="Single-Tenant Workspace",
        )

