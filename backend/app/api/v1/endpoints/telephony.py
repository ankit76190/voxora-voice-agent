from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.telephony import (
    TelephonyCallInitiateRequest,
    TelephonyCallResponse,
    TelephonyConfigResponse,
)
from app.schemas.call import CallSessionResponse
from app.services.telephony_service import TelephonyService

router = APIRouter()


@router.get(
    "/config",
    response_model=TelephonyConfigResponse,
    summary="Get Telephony Provider Status & Compatibility",
)
async def get_telephony_config():
    """
    Returns provider readiness, active simulation mode, and regulatory restrictions.
    Never leaks API credentials or auth tokens.
    """
    return TelephonyService.get_config_status()


@router.post(
    "/calls",
    response_model=TelephonyCallResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Authorized Telephony Test Call",
)
async def initiate_telephony_call(
    payload: TelephonyCallInitiateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Initiates an authorized test call with mandatory consent, rate limiting,
    and emergency number blocking.
    """
    return await TelephonyService.initiate_call(db=db, payload=payload)


@router.get(
    "/calls/{call_id}",
    response_model=CallSessionResponse,
    summary="Get Telephony Call Session State",
)
async def get_telephony_call(
    call_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the CallSession state and queries provider for updates if in-progress.
    """
    return await TelephonyService.get_call_status(db=db, call_id=call_id)


@router.post(
    "/calls/{call_id}/terminate",
    response_model=CallSessionResponse,
    summary="Terminate In-Progress Telephony Call",
)
async def terminate_telephony_call(
    call_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Terminates an in-progress telephone call via provider and finalizes CallSession.
    """
    return await TelephonyService.terminate_call(db=db, call_id=call_id)


@router.post(
    "/webhooks/status",
    summary="Telephony Status Callback Webhook",
)
async def telephony_status_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Provider callback for call status updates (ringing, answered, completed, busy, failed).
    Verifies provider signatures and processes updates idempotently.
    """
    headers = dict(request.headers)
    url = str(request.url)

    # Parse form data (standard Twilio/Telnyx webhook format) or JSON
    content_type = headers.get("content-type", "")
    params: Dict[str, Any] = {}
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        params = {k: v for k, v in form.items()}
    else:
        try:
            params = await request.json()
        except Exception:
            params = {}

    success, message = await TelephonyService.handle_status_webhook(
        db=db, headers=headers, params=params, url=url
    )

    if not success and message == "Invalid provider signature":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid provider webhook signature.",
        )

    return Response(
        content=f"<Response><!-- {message} --></Response>",
        media_type="application/xml",
    )

