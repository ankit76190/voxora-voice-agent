from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict


class TelephonyCallInitiateRequest(BaseModel):
    to_number: str = Field(
        ...,
        min_length=3,
        max_length=20,
        description="Target destination telephone number in E.164 or national format",
    )
    contact_id: Optional[str] = Field(
        default=None,
        description="Optional ID of associated enterprise contact",
    )
    consent_confirmed: bool = Field(
        ...,
        description="Affirmative confirmation that recipient consented to receive this call",
    )
    authorization_confirmed: bool = Field(
        ...,
        description="Operator authorization confirmation acknowledging test call parameters",
    )
    agent_name: Optional[str] = Field(
        default="Voxora Concierge",
        max_length=100,
        description="Voice agent persona assigned to the call",
    )

    @field_validator("to_number")
    @classmethod
    def validate_number(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Telephone number cannot be empty.")
        return trimmed

    @field_validator("consent_confirmed")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError(
                "Consent must be explicitly confirmed before an outbound call can be placed."
            )
        return v

    @field_validator("authorization_confirmed")
    @classmethod
    def validate_authorization(cls, v: bool) -> bool:
        if not v:
            raise ValueError(
                "Operator authorization must be explicitly confirmed before an outbound call can be placed."
            )
        return v


class TelephonyCallResponse(BaseModel):
    call_id: str = Field(..., description="Internal Voxora CallSession database UUID")
    provider_call_id: str = Field(..., description="Carrier provider transaction ID")
    provider: str = Field(..., description="Telephony provider ('mock' or 'twilio')")
    status: str = Field(..., description="Initial call state ('INITIATED' or 'IN_PROGRESS')")
    to_number: str = Field(..., description="Destination telephone number")
    from_number: str = Field(..., description="Originating caller ID number")
    is_mock: bool = Field(..., description="Whether call executed in safe simulation mode")
    created_at: datetime = Field(..., description="Timestamp call was queued/initiated")

    model_config = ConfigDict(from_attributes=True)


class TelephonyConfigResponse(BaseModel):
    provider: str
    is_configured: bool
    active_mode: str
    caller_id: str
    real_calls_enabled: bool
    regulatory_restrictions: Dict[str, str]
    safety_guardrails: List[str]
