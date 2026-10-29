from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class SettingsUpdate(BaseModel):
    agent_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
        description="Public persona display name",
    )
    custom_instructions: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Custom persona instructions (cannot override server safety directives)",
    )
    language: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Preferred spoken interaction language (e.g. en-US, es-ES)",
    )
    response_style: Optional[Literal["concise", "balanced", "detailed"]] = Field(
        default=None,
        description="Verbosity style: concise (1-2 sentences), balanced (2-3 sentences), or detailed",
    )
    greeting: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=500,
        description="Initial voice session greeting statement",
    )
    max_history_turns: Optional[int] = Field(
        default=None,
        ge=2,
        le=20,
        description="Maximum turns sent to Gemini to prevent buffer overflows (2 to 20)",
    )
    temperature: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Model creativity temperature between 0.0 and 1.0",
    )
    voice_playback_enabled: Optional[bool] = Field(
        default=None,
        description="Whether browser speech synthesis should speak responses aloud",
    )
    speech_rate: Optional[float] = Field(
        default=None,
        ge=0.5,
        le=2.0,
        description="Speech synthesis rate multiplier (0.5x to 2.0x)",
    )
    voice_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Browser speech synthesis voice identifier",
    )

    @field_validator("agent_name", "greeting")
    @classmethod
    def validate_not_blank(cls, val: Optional[str]) -> Optional[str]:
        if val is not None:
            trimmed = val.strip()
            if not trimmed:
                raise ValueError("Field cannot be empty or whitespace only.")
            return trimmed
        return val


class SettingsResponse(BaseModel):
    id: str = "default"
    agent_name: str
    custom_instructions: Optional[str] = ""
    language: str
    response_style: str
    greeting: str
    max_history_turns: int
    temperature: float
    voice_playback_enabled: bool
    speech_rate: float
    voice_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityStatusResponse(BaseModel):
    gemini_configured: bool = Field(..., description="Whether GEMINI_API_KEY is configured on server")
    model: str = Field(..., description="Active Gemini model name")
    server_safety_active: bool = Field(True, description="Strict server-enforced safety directives status")
    max_allowed_history: int = Field(20, description="Hard upper boundary for conversation history turns")
    max_instruction_length: int = Field(2000, description="Hard upper boundary for custom instruction characters")
    authentication_mode: str = Field(
        "Single-Tenant Workspace",
        description="Current deployment tenancy model (Multi-user RBAC staged for future milestone)",
    )

