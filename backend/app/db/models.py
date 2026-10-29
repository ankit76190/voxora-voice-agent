import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def generate_uuid() -> str:
    return str(uuid.uuid4())


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ContactModel(Base):
    __tablename__ = "contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    company = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Active")  # Active, Prospect, Inactive
    consent_status = Column(
        String(50),
        nullable=False,
        default="PENDING_VERIFICATION",
    )  # PENDING_VERIFICATION, CONSENT_CONFIRMED, CONSENT_REVOKED
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=get_utc_now,
        onupdate=get_utc_now,
    )

    # One contact can have multiple call sessions; deleting a contact sets call.contact_id to NULL
    calls = relationship(
        "CallSession",
        back_populates="contact",
        lazy="selectin",
    )


class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    contact_id = Column(
        String(36),
        ForeignKey("contacts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contact_name = Column(String(255), nullable=True, default="Web Client")
    phone_number = Column(String(50), nullable=True, default="Browser Audio")
    direction = Column(String(20), nullable=False, default="BROWSER")
    status = Column(String(30), nullable=False, default="IN_PROGRESS")
    duration_seconds = Column(Integer, nullable=False, default=0)
    provider_call_id = Column(String(100), nullable=True, index=True)
    telephony_provider = Column(String(50), nullable=True, default="mock")
    started_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    summary = Column(Text, nullable=True)
    sentiment = Column(String(50), nullable=True, default="Neutral")
    agent_name = Column(String(100), nullable=False, default="Voxora Concierge")
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)

    contact = relationship("ContactModel", back_populates="calls")

    transcripts = relationship(
        "TranscriptItemModel",
        back_populates="call_session",
        cascade="all, delete-orphan",
        order_by="TranscriptItemModel.sequence",
        lazy="selectin",
    )


class TranscriptItemModel(Base):
    __tablename__ = "call_transcripts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(
        String(36),
        ForeignKey("call_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False)  # "user", "agent", "system"
    content = Column(Text, nullable=False)
    timestamp = Column(String(50), nullable=False)
    sequence = Column(Integer, nullable=False, default=0)

    call_session = relationship("CallSession", back_populates="transcripts")


class SystemSettingsModel(Base):
    __tablename__ = "system_settings"

    id = Column(String(36), primary_key=True, default="default")
    agent_name = Column(String(100), nullable=False, default="Voxora Concierge")
    custom_instructions = Column(Text, nullable=True, default="")
    language = Column(String(20), nullable=False, default="en-US")
    response_style = Column(String(20), nullable=False, default="balanced")  # concise, balanced, detailed
    greeting = Column(
        String(500),
        nullable=False,
        default="Hello, I am Voxora Concierge. How may I direct your inquiry today?",
    )
    max_history_turns = Column(Integer, nullable=False, default=10)
    temperature = Column(Float, nullable=False, default=0.7)
    voice_playback_enabled = Column(Boolean, nullable=False, default=True)
    speech_rate = Column(Float, nullable=False, default=1.0)
    voice_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=get_utc_now)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=get_utc_now,
        onupdate=get_utc_now,
    )
