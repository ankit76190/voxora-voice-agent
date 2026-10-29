from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.settings import (
    SettingsUpdate,
    SettingsResponse,
    SecurityStatusResponse,
)
from app.services.settings_service import SettingsService

router = APIRouter()


@router.get(
    "",
    response_model=SettingsResponse,
    summary="Get System & AI Agent Settings",
)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """
    Returns current persisted system settings for the AI agent persona,
    voice preferences, and conversation bounds.
    """
    try:
        record = await SettingsService.get_settings(db)
        return record
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system settings.",
        ) from exc


@router.put(
    "",
    response_model=SettingsResponse,
    summary="Update System & AI Agent Settings",
)
@router.patch(
    "",
    response_model=SettingsResponse,
    include_in_schema=False,
)
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Updates agent persona, response style, conversation bounds, and voice preferences.
    Validates limits on instructions, greetings, temperature, and history bounds.
    """
    try:
        updated = await SettingsService.update_settings(db, payload)
        return updated
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update system settings.",
        ) from exc


@router.post(
    "/reset",
    response_model=SettingsResponse,
    summary="Reset Settings to Defaults",
)
async def reset_settings(db: AsyncSession = Depends(get_db)):
    """
    Resets all AI persona and voice settings back to factory defaults.
    Guarantees call sessions and contact logs are preserved.
    """
    try:
        reset_record = await SettingsService.reset_settings(db)
        return reset_record
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset system settings.",
        ) from exc


@router.get(
    "/security-status",
    response_model=SecurityStatusResponse,
    summary="Audit Platform Security & Guardrails",
)
async def get_security_status():
    """
    Audits server-side configuration, active safety guardrails, and boundaries.
    Never exposes API keys or credential secrets.
    """
    return SettingsService.get_security_status()

