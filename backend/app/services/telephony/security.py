import re
import time
from collections import defaultdict
from typing import Set, Dict, List
from app.services.telephony.base import (
    TelephonySecurityError,
    TelephonyRateLimitError,
    TelephonyCollisionError,
)

# Prohibited emergency and crisis service numbers across international standards
EMERGENCY_NUMBERS: Set[str] = {
    "911",   # US/Canada Emergency
    "112",   # European/International Standard
    "999",   # UK/Commonwealth Emergency
    "100",   # India Police
    "101",   # India Fire
    "102",   # India Ambulance
    "108",   # India Disaster/Ambulance
    "988",   # US Suicide & Crisis Lifeline
    "000",   # Australia Emergency
    "110",   # Japan Police / China Police
    "119",   # Japan Fire / China Fire
}

# Premium rate and high-risk prefixes (e.g. US 900, UK 09)
PREMIUM_PREFIXES: List[str] = ["+1900", "+449", "+4409", "+6119"]


class TelephonySecurityManager:
    def __init__(self, max_calls_per_minute: int = 5):
        self.max_calls_per_minute = max_calls_per_minute
        self._call_timestamps: Dict[str, List[float]] = defaultdict(list)
        self._active_numbers: Set[str] = set()

    def validate_destination_number(self, phone: str) -> str:
        """
        Validates telephone formatting, checks length bounds, and strictly
        rejects emergency numbers and premium-rate destinations.
        """
        if not phone or not phone.strip():
            raise TelephonySecurityError("Destination telephone number is required.")

        raw = phone.strip()
        digits = re.sub(r"\D", "", raw)

        # Check for emergency numbers directly
        if digits in EMERGENCY_NUMBERS or raw in EMERGENCY_NUMBERS:
            raise TelephonySecurityError(
                f"Calling emergency or crisis response numbers ('{raw}') is strictly prohibited."
            )

        if len(digits) < 7:
            raise TelephonySecurityError(
                f"Telephone number '{raw}' is too short (minimum 7 digits required)."
            )

        if len(digits) > 16:
            raise TelephonySecurityError(
                f"Telephone number exceeds standard E.164 length limits (maximum 16 digits)."
            )

        # Ensure valid standard telephone pattern
        if not re.match(r"^\+?[0-9\s\-()]{7,20}$", raw):
            raise TelephonySecurityError(
                f"Destination number '{raw}' has invalid telephone formatting."
            )

        normalized = "+" + digits if not raw.startswith("+") else "+" + digits

        # Check premium rate prefixes
        for prefix in PREMIUM_PREFIXES:
            if normalized.startswith(prefix):
                raise TelephonySecurityError(
                    f"Calling premium-rate destination ('{normalized}') is strictly prohibited."
                )

        return normalized

    def check_rate_limit(self, client_id: str = "default") -> None:
        """
        Sliding-window rate limiter ensuring operators cannot flood carrier networks.
        """
        now = time.time()
        window_start = now - 60.0

        # Purge timestamps older than 60s
        self._call_timestamps[client_id] = [
            t for t in self._call_timestamps[client_id] if t >= window_start
        ]

        if len(self._call_timestamps[client_id]) >= self.max_calls_per_minute:
            raise TelephonyRateLimitError(
                f"Rate limit exceeded: Maximum {self.max_calls_per_minute} test calls allowed per minute. "
                "Please wait before initiating another call."
            )

        self._call_timestamps[client_id].append(now)

    def acquire_call_lock(self, normalized_number: str) -> None:
        """
        Prevents concurrent duplicate calls to the same destination number.
        """
        if normalized_number in self._active_numbers:
            raise TelephonyCollisionError(
                f"An active call to destination '{normalized_number}' is already in progress. "
                "Concurrent duplicate calls to the same number are blocked."
            )
        self._active_numbers.add(normalized_number)

    def release_call_lock(self, normalized_number: str) -> None:
        """
        Releases call lock when call completes or fails.
        """
        self._active_numbers.discard(normalized_number)

    def reset(self) -> None:
        """Clears locks and timestamps for testing."""
        self._call_timestamps.clear()
        self._active_numbers.clear()


security_manager = TelephonySecurityManager()

