import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.services.telephony.base import (
    BaseTelephonyProvider,
    TelephonyCallResult,
)


class MockTelephonyProvider(BaseTelephonyProvider):
    """
    Simulated telephony provider executing safe deterministic operations
    without connecting to PSTN carriers or incurring usage fees.
    """

    def __init__(self):
        self._mock_calls: Dict[str, Dict[str, Any]] = {}

    @property
    def name(self) -> str:
        return "mock"

    @property
    def is_configured(self) -> bool:
        # Mock mode is always operational and ready for safe development
        return True

    async def initiate_call(
        self,
        to_number: str,
        from_number: str,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TelephonyCallResult:
        call_id = f"mock_call_{uuid.uuid4().hex[:16]}"
        now = datetime.now(timezone.utc)

        self._mock_calls[call_id] = {
            "provider_call_id": call_id,
            "to_number": to_number,
            "from_number": from_number,
            "status": "in-progress",
            "created_at": now,
            "webhook_url": webhook_url,
            "metadata": metadata or {},
        }

        return TelephonyCallResult(
            provider_call_id=call_id,
            provider="mock",
            status="in-progress",
            to_number=to_number,
            from_number=from_number,
            is_mock=True,
            created_at=now,
            metadata=metadata or {},
        )

    async def get_call_status(self, provider_call_id: str) -> Dict[str, Any]:
        call = self._mock_calls.get(provider_call_id)
        if not call:
            return {"provider_call_id": provider_call_id, "status": "not-found"}
        return call

    async def terminate_call(self, provider_call_id: str) -> bool:
        call = self._mock_calls.get(provider_call_id)
        if not call:
            return False
        call["status"] = "completed"
        call["ended_at"] = datetime.now(timezone.utc)
        return True

    def validate_webhook_signature(
        self,
        headers: Dict[str, str],
        params: Dict[str, Any],
        url: str,
    ) -> bool:
        # In mock mode, if a mock signature header is sent, verify it; otherwise allow sandbox testing
        sig = headers.get("x-mock-signature") or headers.get("X-Mock-Signature")
        if sig == "invalid-test-signature":
            return False
        return True

