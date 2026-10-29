import base64
import hashlib
import hmac
import urllib.parse
import urllib.request
import json
from typing import Dict, Any, Optional

from app.core.config import settings
from app.services.telephony.base import (
    BaseTelephonyProvider,
    TelephonyCallResult,
    TelephonyConfigError,
)


class TwilioTelephonyProvider(BaseTelephonyProvider):
    """
    Twilio Voice REST API provider adapter.
    Handles authenticated call origination, TwiML callbacks, and HMAC-SHA1 signature verification.
    """

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_number: Optional[str] = None,
    ):
        self.account_sid = account_sid or settings.TELEPHONY_ACCOUNT_SID
        self.auth_token = auth_token or settings.TELEPHONY_AUTH_TOKEN
        self.from_number = from_number or settings.TELEPHONY_PHONE_NUMBER

    @property
    def name(self) -> str:
        return "twilio"

    @property
    def is_configured(self) -> bool:
        return settings.is_telephony_configured()

    def _ensure_configured(self) -> None:
        if not self.is_configured:
            raise TelephonyConfigError(
                "Twilio telephony is not configured or disabled on this server. "
                "Ensure TELEPHONY_ACCOUNT_SID, TELEPHONY_AUTH_TOKEN, and TELEPHONY_PHONE_NUMBER "
                "are set in backend/.env, and TELEPHONY_ENABLE_REAL_CALLS=True."
            )

    async def initiate_call(
        self,
        to_number: str,
        from_number: str,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TelephonyCallResult:
        self._ensure_configured()

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Calls.json"
        effective_from = from_number or self.from_number

        post_data = {
            "To": to_number,
            "From": effective_from,
        }
        if webhook_url:
            post_data["Url"] = webhook_url

        data_encoded = urllib.parse.urlencode(post_data).encode("utf-8")
        req = urllib.request.Request(url, data=data_encoded, method="POST")

        # Basic Auth: Account SID & Auth Token
        auth_str = f"{self.account_sid}:{self.auth_token}"
        auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
        req.add_header("Authorization", f"Basic {auth_b64}")

        try:
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                resp_json = json.loads(resp.read().decode("utf-8"))
                provider_call_id = resp_json.get("sid", "")
                call_status = resp_json.get("status", "queued")

                return TelephonyCallResult(
                    provider_call_id=provider_call_id,
                    provider="twilio",
                    status=call_status,
                    to_number=to_number,
                    from_number=effective_from,
                    is_mock=False,
                    metadata=metadata or {},
                )
        except Exception as e:
            raise TelephonyConfigError(f"Twilio call initiation failed: {str(e)}") from e

    async def get_call_status(self, provider_call_id: str) -> Dict[str, Any]:
        self._ensure_configured()
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Calls/{provider_call_id}.json"
        req = urllib.request.Request(url, method="GET")

        auth_str = f"{self.account_sid}:{self.auth_token}"
        auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
        req.add_header("Authorization", f"Basic {auth_b64}")

        try:
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            raise TelephonyConfigError(f"Failed to fetch Twilio call status: {str(e)}") from e

    async def terminate_call(self, provider_call_id: str) -> bool:
        self._ensure_configured()
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Calls/{provider_call_id}.json"
        post_data = urllib.parse.urlencode({"Status": "completed"}).encode("utf-8")
        req = urllib.request.Request(url, data=post_data, method="POST")

        auth_str = f"{self.account_sid}:{self.auth_token}"
        auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
        req.add_header("Authorization", f"Basic {auth_b64}")

        try:
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                return resp.status == 200
        except Exception:
            return False

    def validate_webhook_signature(
        self,
        headers: Dict[str, str],
        params: Dict[str, Any],
        url: str,
    ) -> bool:
        """
        Validates the X-Twilio-Signature header using the official Twilio
        HMAC-SHA1 algorithm (concatenation of URL and sorted POST parameters).
        """
        signature = headers.get("x-twilio-signature") or headers.get("X-Twilio-Signature")
        if not signature:
            return False

        if not self.auth_token:
            return False

        # Construct verification data string: URL + sorted key-value pairs
        data = url
        for key in sorted(params.keys()):
            data += f"{key}{params[key]}"

        expected_sig = base64.b64encode(
            hmac.new(
                self.auth_token.encode("utf-8"),
                data.encode("utf-8"),
                hashlib.sha1,
            ).digest()
        ).decode("ascii")

        return hmac.compare_digest(signature, expected_sig)

