import re
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.call import CallSessionResponse

PHONE_REGEX = re.compile(r"^\+?[0-9\s\-\(\)\.]{7,30}$")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def normalize_phone(phone: str) -> str:
    cleaned = phone.strip()
    digits = re.sub(r"\D", "", cleaned)
    if len(digits) < 7:
        raise ValueError("Phone number must contain at least 7 digits.")
    if not PHONE_REGEX.match(cleaned):
        raise ValueError("Invalid phone number format.")
    return cleaned


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Full contact person name")
    phone: str = Field(..., min_length=7, max_length=50, description="Contact telephone number")
    email: Optional[str] = Field(default=None, max_length=255, description="Email address")
    company: Optional[str] = Field(default=None, max_length=255, description="Company or organization")
    notes: Optional[str] = Field(default=None, max_length=5000, description="Operator notes")
    status: Literal["Active", "Prospect", "Inactive"] = Field(default="Active")
    consent_status: Literal["PENDING_VERIFICATION", "CONSENT_CONFIRMED", "CONSENT_REVOKED"] = Field(
        default="PENDING_VERIFICATION",
        description="Explicit calling consent status",
    )

    @field_validator("name")
    @classmethod
    def validate_name_not_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Contact name cannot be empty.")
        return trimmed

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        if not EMAIL_REGEX.match(trimmed):
            raise ValueError("Invalid email address format.")
        return trimmed.lower()


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    phone: Optional[str] = Field(default=None, min_length=7, max_length=50)
    email: Optional[str] = Field(default=None, max_length=255)
    company: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[Literal["Active", "Prospect", "Inactive"]] = None
    consent_status: Optional[Literal["PENDING_VERIFICATION", "CONSENT_CONFIRMED", "CONSENT_REVOKED"]] = None

    @field_validator("name")
    @classmethod
    def validate_name_not_empty(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Contact name cannot be empty.")
        return trimmed

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return normalize_phone(value)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        if not EMAIL_REGEX.match(trimmed):
            raise ValueError("Invalid email address format.")
        return trimmed.lower()


class ContactResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    status: str
    consent_status: str
    created_at: datetime
    updated_at: datetime
    call_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ContactDetailResponse(ContactResponse):
    calls: List[CallSessionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PaginatedContactResponse(BaseModel):
    items: List[ContactResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

