from typing import Any, Dict, Optional
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


@router.api_route(
    "/twiml/outbound",
    methods=["GET", "POST"],
    summary="Dynamic Outbound TwiML Voice Webhook",
)
async def telephony_outbound_twiml(
    contact: Optional[str] = "Valued Customer",
    agent: Optional[str] = "Voxora AI Concierge",
):
    """
    Returns TwiML instructions for Twilio when an outbound call is answered.
    Greets the recipient using neural text-to-speech with persona context.
    """
    greeting = (
        f"Hello {contact}! Welcome to Voxora AI Enterprise Voice. "
        f"I am {agent}, your active AI assistant. "
        f"This live test confirms your telephony carrier integration is operational. "
        f"Thank you for choosing Voxora. Have a wonderful day!"
    )
    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        f'    <Say voice="Polly.Aditi" language="en-IN">{greeting}</Say>\n'
        '    <Pause length="1"/>\n'
        '    <Hangup/>\n'
        '</Response>'
    )
    return Response(content=xml_content, media_type="application/xml")


@router.api_route(
    "/twiml/inbound",
    methods=["GET", "POST"],
    summary="Dynamic Inbound TwiML AI Receptionist & IVR Webhook",
)
async def telephony_inbound_twiml(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handles incoming phone calls received on the Voxora Twilio telephone number.
    Greets the caller and presents an interactive voice menu (IVR) with speech & DTMF.
    Logs an INBOUND call session record in the database.
    """
    from datetime import datetime, timezone
    from app.db.models import CallSession

    # Extract incoming parameters if available
    caller_number = "Unknown Caller"
    call_sid = None
    try:
        if request.method == "POST":
            form = await request.form()
            caller_number = form.get("From", "Unknown Caller")
            call_sid = form.get("CallSid")
        else:
            caller_number = request.query_params.get("From", "Unknown Caller")
            call_sid = request.query_params.get("CallSid")
    except Exception:
        pass

    # Record inbound call in database
    try:
        now = datetime.now(timezone.utc)
        inbound_session = CallSession(
            contact_name="Inbound Caller",
            phone_number=caller_number,
            direction="INBOUND",
            status="IN_PROGRESS",
            duration_seconds=0,
            provider_call_id=call_sid,
            telephony_provider="twilio",
            agent_name="Voxora AI Receptionist",
            started_at=now,
        )
        db.add(inbound_session)
        await db.commit()
    except Exception as exc:
        logger.warning("Could not persist inbound call session: %s", exc)

    gather_action = "https://voxora-backend-api.onrender.com/api/v1/telephony/twiml/gather"
    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Response>\n'
        '    <Say voice="Polly.Aditi" language="en-IN">\n'
        '        Thank you for calling Voxora AI Enterprise Solutions. You have reached our automated concierge hotline.\n'
        '    </Say>\n'
        '    <Pause length="1"/>\n'
        f'    <Gather input="speech dtmf" timeout="5" numDigits="1" action="{gather_action}" method="POST">\n'
        '        <Say voice="Polly.Aditi" language="en-IN">\n'
        '            For Sales and Onboarding, press 1 or say Sales. For Technical Support and Operations, press 2 or say Support. Or stay on the line to connect with our specialist team.\n'
        '        </Say>\n'
        '    </Gather>\n'
        '    <Say voice="Polly.Aditi" language="en-IN">\n'
        '        We did not receive your selection. Your inquiry has been logged in our dispatch queue. Thank you for calling Voxora. Goodbye!\n'
        '    </Say>\n'
        '    <Hangup/>\n'
        '</Response>'
    )
    return Response(content=xml_content, media_type="application/xml")


@router.api_route(
    "/twiml/gather",
    methods=["GET", "POST"],
    summary="Dynamic Inbound IVR Selection Handler",
)
async def telephony_inbound_gather(
    request: Request,
):
    """
    Processes caller DTMF keypress or spoken phrase from the inbound IVR.
    """
    digits = ""
    speech = ""
    try:
        if request.method == "POST":
            form = await request.form()
            digits = form.get("Digits", "").strip()
            speech = form.get("SpeechResult", "").strip().lower()
        else:
            digits = request.query_params.get("Digits", "").strip()
            speech = request.query_params.get("SpeechResult", "").strip().lower()
    except Exception:
        pass

    if digits == "1" or "sales" in speech or "onboarding" in speech:
        xml_content = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            '    <Say voice="Polly.Aditi" language="en-IN">\n'
            '        Routing your call to Alex Vance, Enterprise Sales Director. Please hold while we transfer your session.\n'
            '    </Say>\n'
            '    <Pause length="2"/>\n'
            '    <Say voice="Polly.Aditi" language="en-IN">\n'
            '        All sales consultants are currently in active briefings. An enterprise callback priority has been assigned to your number. Thank you!\n'
            '    </Say>\n'
            '    <Hangup/>\n'
            '</Response>'
        )
    elif digits == "2" or "support" in speech or "technical" in speech:
        xml_content = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            '    <Say voice="Polly.Aditi" language="en-IN">\n'
            '        Routing your call to Priya Sharma, Customer Experience Specialist. Please hold while we pull up your account credentials.\n'
            '    </Say>\n'
            '    <Pause length="2"/>\n'
            '    <Say voice="Polly.Aditi" language="en-IN">\n'
            '        Your incident ticket has been created with priority status. A specialist will call you back shortly. Goodbye!\n'
            '    </Say>\n'
            '    <Hangup/>\n'
            '</Response>'
        )
    else:
        xml_content = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            '    <Say voice="Polly.Aditi" language="en-IN">\n'
            '        Thank you for your response. Your request has been recorded with Voxora Operations Core. Have a wonderful day!\n'
            '    </Say>\n'
            '    <Hangup/>\n'
            '</Response>'
        )

    return Response(content=xml_content, media_type="application/xml")



