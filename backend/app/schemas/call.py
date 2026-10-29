from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class TranscriptItemCreate(BaseModel):
    role: Literal["user", "agent", "system"] = Field(..., description="Speaker role")
    content: str = Field(..., min_length=1, max_length=5000, description="Turn content")
    timestamp: str = Field(..., description="Timestamp string (HH:MM:SS)")
    sequence: int = Field(default=0, ge=0, description="Sequential order index")

    @field_validator("content")
    @classmethod
    def validate_content_not_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Transcript content cannot be empty.")
        return trimmed


class TranscriptItemResponse(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    sequence: int

    model_config = ConfigDict(from_attributes=True)


class CallSessionCreate(BaseModel):
    contact_id: Optional[str] = Field(default=None, description="Optional ID of associated contact")
    contact_name: Optional[str] = Field(default="Web Operator", max_length=255)
    phone_number: Optional[str] = Field(default="Browser Session", max_length=50)
    direction: Literal["BROWSER", "INBOUND", "OUTBOUND"] = Field(default="BROWSER")
    agent_name: Optional[str] = Field(default="Voxora Concierge", max_length=100)


class CallSessionUpdate(BaseModel):
    status: Optional[Literal["IN_PROGRESS", "COMPLETED", "FAILED", "BUSY", "NO_ANSWER"]] = None
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    summary: Optional[str] = Field(default=None, max_length=5000)
    sentiment: Optional[Literal["Positive", "Neutral", "Needs Review"]] = None
    ended_at: Optional[datetime] = None
    transcripts: Optional[List[TranscriptItemCreate]] = None


class CallSessionResponse(BaseModel):
    id: str
    contact_id: Optional[str] = None
    contact_name: Optional[str]
    phone_number: Optional[str]
    direction: str
    status: str
    duration_seconds: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    agent_name: str
    created_at: datetime
    transcripts: List[TranscriptItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PaginatedCallResponse(BaseModel):
    items: List[CallSessionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
