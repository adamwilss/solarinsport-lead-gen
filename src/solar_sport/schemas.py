from datetime import datetime
from pydantic import BaseModel


# --- Stadium ---

class StadiumBase(BaseModel):
    name: str
    club_name: str | None = None
    city: str | None = None
    country: str = "United Kingdom"
    capacity: int | None = None
    sport: str | None = None
    league: str | None = None
    website: str | None = None
    operator: str | None = None
    hospitality_url: str | None = None
    sustainability_url: str | None = None


class StadiumRead(StadiumBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Contact ---

class ContactBase(BaseModel):
    name: str | None = None
    title: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    source: str | None = None
    contact_page_url: str | None = None
    confidence: str = "medium"


class ContactRead(ContactBase):
    id: int
    lead_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Lead ---

class LeadBase(BaseModel):
    score: float | None = None
    priority: str | None = None
    stage: str = "discovered"
    outreach_status: str | None = None
    next_action: str | None = None
    notes: str | None = None
    tags: str | None = None
    owner: str | None = None


class LeadRead(LeadBase):
    id: int
    stadium_id: int
    stadium: StadiumRead
    contacts: list[ContactRead] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class LeadUpdate(BaseModel):
    stage: str | None = None
    priority: str | None = None
    next_action: str | None = None
    notes: str | None = None
    tags: str | None = None
    owner: str | None = None


class LeadFilter(BaseModel):
    country: str | None = None
    city: str | None = None
    sport: str | None = None
    league: str | None = None
    min_capacity: int | None = None
    max_capacity: int | None = None
    priority: str | None = None
    stage: str | None = None
    owner: str | None = None


# --- Outreach Draft ---

class OutreachDraftRead(BaseModel):
    id: int
    lead_id: int
    outreach_type: str
    subject: str | None = None
    body: str
    recipient_email: str | None = None
    approval_status: str
    approved_by: str | None = None
    sent_at: datetime | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class ApprovalAction(BaseModel):
    status: str  # "approved" or "rejected"
    approved_by: str


# --- Dashboard ---

class PipelineStats(BaseModel):
    stage: str
    count: int


class DashboardData(BaseModel):
    total_leads: int
    pipeline: list[PipelineStats]
    leads_by_priority: dict[str, int]
    outreach_pending: int
    outreach_sent: int
    reply_rate: float
