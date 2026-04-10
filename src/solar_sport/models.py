from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Float, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from solar_sport.database import Base


class PipelineStage(PyEnum):
    DISCOVERED = "discovered"
    ENRICHED = "enriched"
    QUALIFIED = "qualified"
    READY_FOR_OUTREACH = "ready_for_outreach"
    CONTACTED = "contacted"
    REPLIED = "replied"
    MEETING_BOOKED = "meeting_booked"
    OPPORTUNITY_ACTIVE = "opportunity_active"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class Priority(PyEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class OutreachType(PyEnum):
    COLD_EMAIL = "cold_email"
    FOLLOWUP_1 = "followup_1"
    FOLLOWUP_2 = "followup_2"
    LINKEDIN = "linkedin"
    CALL_SCRIPT = "call_script"


class ApprovalStatus(PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SENT = "sent"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Stadium(Base):
    __tablename__ = "stadiums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    club_name: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str] = mapped_column(String(100), default="United Kingdom")
    capacity: Mapped[int | None] = mapped_column(Integer)
    sport: Mapped[str | None] = mapped_column(String(100))
    league: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(500))
    operator: Mapped[str | None] = mapped_column(String(255))
    hospitality_url: Mapped[str | None] = mapped_column(String(500))
    sustainability_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    leads: Mapped[list["Lead"]] = relationship(back_populates="stadium")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    title: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(100))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[str | None] = mapped_column(String(255))
    contact_page_url: Mapped[str | None] = mapped_column(String(500))
    confidence: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    lead: Mapped["Lead"] = relationship(back_populates="contacts")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stadium_id: Mapped[int] = mapped_column(ForeignKey("stadiums.id"), nullable=False)
    score: Mapped[float | None] = mapped_column(Float)
    priority: Mapped[str | None] = mapped_column(String(50))
    stage: Mapped[str] = mapped_column(String(50), default=PipelineStage.DISCOVERED.value)
    outreach_status: Mapped[str | None] = mapped_column(String(100))
    last_contact_date: Mapped[datetime | None] = mapped_column(DateTime)
    next_action: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[str | None] = mapped_column(Text)
    owner: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    stadium: Mapped["Stadium"] = relationship(back_populates="leads")
    contacts: Mapped[list["Contact"]] = relationship(back_populates="lead")
    drafts: Mapped[list["OutreachDraft"]] = relationship(back_populates="lead")


class OutreachDraft(Base):
    __tablename__ = "outreach_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), nullable=False)
    outreach_type: Mapped[str] = mapped_column(String(50), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    recipient_email: Mapped[str | None] = mapped_column(String(255))
    approval_status: Mapped[str] = mapped_column(String(50), default=ApprovalStatus.PENDING.value)
    approved_by: Mapped[str | None] = mapped_column(String(255))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    lead: Mapped["Lead"] = relationship(back_populates="drafts")
