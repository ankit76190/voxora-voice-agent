import uuid
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "model", "assistant"] = Field(
        ...,
        description="Sender role of the message.",
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Spoken or generated text content.",
    )

    @field_validator("content")
    @classmethod
    def validate_content_not_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Message content cannot be empty or whitespace only.")
        return trimmed


class ConversationRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Current user spoken turn.",
    )
    history: List[ChatMessage] = Field(
        default_factory=list,
        max_length=20,
        description="Bounded conversational history of prior turns (up to 20 turns).",
    )
    system_instruction: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Optional custom system behavior instruction.",
    )
    temperature: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=2.0,
        description="Sampling temperature for conversational variability. If omitted, uses active system setting.",
    )

    @field_validator("message")
    @classmethod
    def validate_message_not_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty or whitespace only.")
        return trimmed


class ConversationResponse(BaseModel):
    response: str = Field(..., description="Generated text response from Gemini.")
    model: str = Field(..., description="Gemini model identifier used for generation.")
    turn_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique turn identifier.")
    status: str = Field(default="success", description="Status code string.")

