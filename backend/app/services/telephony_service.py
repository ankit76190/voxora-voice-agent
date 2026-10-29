import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import CallSession, ContactModel
from app.schemas.telephony import (
    TelephonyCallInitiateRequest,
    TelephonyCallResponse,
    TelephonyConfigResponse,
)
from app.services.telephony import (
    get_telephony_provider,
    security_manager,
    TelephonySecurityError,
    TelephonyRateLimitError,
    TelephonyCollisionError,
    TelephonyConfigError,
)

logger = logging.getLogger(__name__)


class TelephonyService:
    @staticmethod
    async def initiate_call(
        db: AsyncSession,
        payload: TelephonyCallInitiateRequest,
    ) -> TelephonyCallResponse:
        """
        Initiates an outbound test call with mandatory rate limiting,
        emergency number blacklisting, consent confirmation, and safe persistence.
        """
        # 1. Validate destination number formatting and emergency restrictions
        try:
            normalized_to = security_manager.validate_destination_number(payload.to_number)
        except TelephonySecurityError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            ) from e

        # 2. Check rate limit
        try:
            security_manager.check_rate_limit(client_id="default")
        except TelephonyRateLimitError as e:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(e),
            ) from e

        # 3. Check duplicate active call collision
        try:
            security_manager.acquire_call_lock(normalized_to)
        except TelephonyCollisionError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e),
            ) from e

        # 4. Check contact details if contact_id provided
        contact_name = "PSTN Recipient"
        if payload.contact_id:
            c_res = await db.execute(
                select(ContactModel).where(ContactModel.id == payload.contact_id)
            )
            contact = c_res.scalar_one_or_none()
            if contact:
                contact_name = contact.name

        # 5. Acquire provider instance
        provider = get_telephony_provider()

        # 6. Execute provider call initiation
        try:
            result = await provider.initiate_call(
                to_number=normalized_to,
                from_number=settings.TELEPHONY_PHONE_NUMBER,
                metadata={"contact_name": contact_name, "agent_name": payload.agent_name},
            )
        except TelephonyConfigError as e:
            security_manager.release_call_lock(normalized_to)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        except Exception as e:
            security_manager.release_call_lock(normalized_to)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Telephony provider error: {str(e)}",
            ) from e

        # 7. Persist session record in CallSession table
        now = datetime.now(timezone.utc)
        call_session = CallSession(
            contact_id=payload.contact_id,
            contact_name=contact_name,
            phone_number=normalized_to,
            direction="OUTBOUND",
            status="IN_PROGRESS" if result.status in ("in-progress", "initiated", "queued") else result.status.upper(),
            duration_seconds=0,
            provider_call_id=result.provider_call_id,
            telephony_provider=result.provider,
            agent_name=payload.agent_name or "Voxora Concierge",
            started_at=now,
        )
        db.add(call_session)
        await db.commit()
        await db.refresh(call_session)

        return TelephonyCallResponse(
            call_id=call_session.id,
            provider_call_id=result.provider_call_id,
            provider=result.provider,
            status=call_session.status,
            to_number=normalized_to,
            from_number=settings.TELEPHONY_PHONE_NUMBER,
            is_mock=result.is_mock,
            created_at=call_session.started_at,
        )

    @staticmethod
    async def get_call_status(
        db: AsyncSession,
        call_id: str,
    ) -> CallSession:
        """
        Retrieves the CallSession and synchronizes status with the provider if active.
        """
        result = await db.execute(
            select(CallSession).where(CallSession.id == call_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Telephony call session '{call_id}' not found.",
            )

        # Synchronize with provider if still in progress and provider_call_id exists
        if session.status == "IN_PROGRESS" and session.provider_call_id:
            provider = get_telephony_provider(session.telephony_provider)
            try:
                p_status = await provider.get_call_status(session.provider_call_id)
                raw_st = p_status.get("status", "").lower()

                if raw_st in ("completed", "answered"):
                    session.status = "COMPLETED"
                    session.ended_at = datetime.now(timezone.utc)
                    security_manager.release_call_lock(session.phone_number)
                    await db.commit()
                    await db.refresh(session)
                elif raw_st in ("failed", "busy", "no-answer", "canceled"):
                    session.status = "FAILED" if raw_st in ("failed", "canceled") else raw_st.upper()
                    session.ended_at = datetime.now(timezone.utc)
                    security_manager.release_call_lock(session.phone_number)
                    await db.commit()
                    await db.refresh(session)
            except Exception as e:
                logger.warning("Could not sync call status with provider: %s", e)

        return session

    @staticmethod
    async def terminate_call(
        db: AsyncSession,
        call_id: str,
    ) -> CallSession:
        """
        Terminates an active telephone call via the carrier provider and finalizes CallSession.
        """
        session = await TelephonyService.get_call_status(db, call_id)
        if session.status != "IN_PROGRESS":
            return session

        provider = get_telephony_provider(session.telephony_provider)
        if session.provider_call_id:
            try:
                await provider.terminate_call(session.provider_call_id)
            except Exception as e:
                logger.warning("Error terminating provider call: %s", e)

        session.status = "COMPLETED"
        now = datetime.now(timezone.utc)
        session.ended_at = now
        if session.started_at:
            started = session.started_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            session.duration_seconds = max(1, int((now - started).total_seconds()))

        security_manager.release_call_lock(session.phone_number)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def handle_status_webhook(
        db: AsyncSession,
        headers: Dict[str, str],
        params: Dict[str, Any],
        url: str,
    ) -> Tuple[bool, str]:
        """
        Processes provider status callback webhooks with signature verification
        and idempotent database session synchronization.
        """
        provider_call_id = params.get("CallSid") or params.get("call_id")
        if not provider_call_id:
            return False, "Missing CallSid in callback payload"

        # Find session
        result = await db.execute(
            select(CallSession).where(CallSession.provider_call_id == provider_call_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return True, "CallSession not found or already purged (Idempotent acknowledge)"

        provider = get_telephony_provider(session.telephony_provider)

        # Validate signature
        is_valid = provider.validate_webhook_signature(headers, params, url)
        if not is_valid:
            logger.warning("Rejected webhook callback due to invalid signature.")
            return False, "Invalid provider signature"

        call_status = (params.get("CallStatus") or params.get("status", "")).lower()
        duration_str = params.get("CallDuration") or params.get("duration")

        # Map provider status
        if call_status in ("completed", "answered"):
            session.status = "COMPLETED"
        elif call_status == "busy":
            session.status = "BUSY"
        elif call_status in ("no-answer", "no_answer"):
            session.status = "NO_ANSWER"
        elif call_status in ("failed", "canceled"):
            session.status = "FAILED"

        if duration_str and duration_str.isdigit():
            session.duration_seconds = int(duration_str)

        session.ended_at = datetime.now(timezone.utc)
        security_manager.release_call_lock(session.phone_number)

        await db.commit()
        return True, "Processed successfully"

    @staticmethod
    def get_config_status() -> TelephonyConfigResponse:
        """
        Returns non-sensitive provider status and regulatory findings.
        """
        provider = get_telephony_provider()
        masked_number = settings.TELEPHONY_PHONE_NUMBER
        if masked_number and len(masked_number) > 6:
            masked_number = masked_number[:4] + "***" + masked_number[-4:]

        return TelephonyConfigResponse(
            provider=provider.name,
            is_configured=provider.is_configured,
            active_mode="live" if provider.name != "mock" and provider.is_configured else "mock",
            caller_id=masked_number or "Not Configured",
            real_calls_enabled=settings.TELEPHONY_ENABLE_REAL_CALLS,
            regulatory_restrictions={
                "India (TRAI / DoT)": "Direct PSTN interconnect bypass is strictly prohibited. Outbound calling into India requires licensed TSP infrastructure, DLT registration, and 140-series CLI headers. Local-to-local calls without TRAI compliance will be rejected.",
                "US / Canada (10DLC)": "A2P 10DLC campaign registration and STIR/SHAKEN caller ID attestation required to prevent carrier spam filtering.",
                "Emergency Calling": "Calling emergency services (911, 112, 100, etc.) is blocked by system guardrails.",
            },
            safety_guardrails=[
                "Emergency service number blocking (911, 112, 100, 999, 988, etc.)",
                "Sliding-window rate limiting (max 5 calls/min)",
                "Concurrent duplicate-call collision lock",
                "Explicit affirmative recipient consent requirement",
                "Safe mock simulation mode for development and testing",
            ],
        )
