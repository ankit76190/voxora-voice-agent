from typing import Optional
from app.core.config import settings
from app.services.telephony.base import BaseTelephonyProvider
from app.services.telephony.mock_provider import MockTelephonyProvider
from app.services.telephony.twilio_provider import TwilioTelephonyProvider

_mock_instance: Optional[MockTelephonyProvider] = None


def get_telephony_provider(provider_name: Optional[str] = None) -> BaseTelephonyProvider:
    """
    Factory function returning the configured provider abstraction.
    Defaults to MockTelephonyProvider to prevent accidental PSTN calls or fee accrual.
    """
    target = (provider_name or settings.TELEPHONY_PROVIDER).strip().lower()

    if target == "twilio":
        return TwilioTelephonyProvider()

    global _mock_instance
    if _mock_instance is None:
        _mock_instance = MockTelephonyProvider()
    return _mock_instance

