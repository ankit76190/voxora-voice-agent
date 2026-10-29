from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class TelephonyCallResult(BaseModel):
    provider_call_id: str
    provider: str
    status: str
    to_number: str
    from_number: str
    is_mock: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TelephonyException(Exception):
    """Base exception for telephony operations."""
    pass


class TelephonyConfigError(TelephonyException):
    """Raised when telephony provider configuration is invalid or missing."""
    pass


class TelephonySecurityError(TelephonyException):
    """Raised when security boundaries or prohibited destinations are encountered."""
    pass


class TelephonyRateLimitError(TelephonyException):
    """Raised when call initiation rate limits are exceeded."""
    pass


class TelephonyCollisionError(TelephonyException):
    """Raised when an active duplicate call is already in progress."""
    pass


class BaseTelephonyProvider(ABC):
    """
    Abstract base provider defining vendor-neutral telephony operations.
    Enables pluggable switching between simulated mock telephony and
    certified carrier providers (Twilio, Telnyx, Plivo) without coupling application logic.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique provider identifier (e.g. 'mock', 'twilio')."""
        pass

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        """Whether the provider has verified operational credentials."""
        pass

    @abstractmethod
    async def initiate_call(
        self,
        to_number: str,
        from_number: str,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TelephonyCallResult:
        """Initiates an outbound telephone call."""
        pass

    @abstractmethod
    async def get_call_status(self, provider_call_id: str) -> Dict[str, Any]:
        """Retrieves remote provider call state."""
        pass

    @abstractmethod
    async def terminate_call(self, provider_call_id: str) -> bool:
        """Terminates an in-progress telephone call."""
        pass

    @abstractmethod
    def validate_webhook_signature(
        self,
        headers: Dict[str, str],
        params: Dict[str, Any],
        url: str,
    ) -> bool:
        """Validates provider webhook signature authenticity."""
        pass

