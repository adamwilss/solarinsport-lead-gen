# Solar & Sport V1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stadium prospecting engine that discovers UK sports venues, enriches contacts, scores leads, generates personalized email drafts, and provides a CRM dashboard with manual approval before sending.

**Architecture:** Python FastAPI backend with SQLite (SQLAlchemy 2.0). Discovery scrapes Wikipedia stadium lists. Scoring uses configurable weighted criteria. Outreach drafts use Jinja2 templates. React+Vite+TypeScript+Tailwind frontend provides CRM dashboard with filtering, pipeline view, and approval queue.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, httpx, BeautifulSoup4, Jinja2, Pydantic v2, pytest | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query

**Current state:** Project scaffolded — `pyproject.toml`, `src/solar_sport/__init__.py` exist. Dependencies declared. No application code yet.

---

## File Structure

```
src/solar_sport/
├── config.py                 # Pydantic BaseSettings (DB URL, CORS)
├── database.py               # SQLite engine + session factory
├── models.py                 # ORM: Stadium, Contact, Lead, OutreachDraft
├── schemas.py                # Pydantic request/response schemas
├── discovery/
│   ├── wikipedia.py          # Parse Wikipedia stadium tables
│   └── pipeline.py           # Orchestrate discovery, dedup, persist
├── enrichment/
│   ├── scraper.py            # Extract emails + contact links from HTML
│   └── pipeline.py           # Create contacts for leads, update stage
├── scoring/
│   └── engine.py             # Weighted scoring → priority bands
├── outreach/
│   ├── templates.py          # Jinja2 template loader
│   └── generator.py          # Generate all draft types per lead
├── api/
│   ├── app.py                # FastAPI factory, CORS, lifespan
│   ├── deps.py               # Shared dependency (get_db)
│   ├── leads.py              # Lead CRUD + filtering
│   ├── outreach.py           # Draft listing + approval
│   └── dashboard.py          # Pipeline stats
└── cli.py                    # CLI entry point
templates/                    # Jinja2 email/linkedin/call templates
frontend/src/                 # React app
tests/                        # pytest suite
```

---

## Phase 1: Foundation (Tasks 1–3)

### Task 1: Configuration

**Files:**
- Create: `src/solar_sport/config.py`
- Create: `tests/test_config.py`
- Create: `.env.example`

- [ ] **Step 1: Write the failing test**

Create `tests/test_config.py`:

```python
from solar_sport.config import Settings


def test_default_settings():
    settings = Settings(DATABASE_URL="sqlite:///test.db")
    assert settings.DATABASE_URL == "sqlite:///test.db"
    assert settings.CORS_ORIGINS == ["http://localhost:5173"]


def test_cors_origins_from_comma_separated():
    settings = Settings(
        DATABASE_URL="sqlite:///test.db",
        CORS_ORIGINS="http://localhost:3000,http://localhost:5173",
    )
    assert len(settings.CORS_ORIGINS) == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'solar_sport.config'`

- [ ] **Step 3: Write implementation**

Create `.env.example`:

```env
DATABASE_URL=sqlite:///solar_sport.db
CORS_ORIGINS=http://localhost:5173
```

Create `src/solar_sport/config.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///solar_sport.db"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_config.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/config.py tests/test_config.py .env.example
git commit -m "feat: add configuration with pydantic-settings"
```

---

### Task 2: Database and ORM Models

**Files:**
- Create: `src/solar_sport/database.py`
- Create: `src/solar_sport/models.py`
- Create: `tests/conftest.py`
- Create: `tests/test_models.py`

- [ ] **Step 1: Write database module**

Create `src/solar_sport/database.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from solar_sport.config import get_settings


class Base(DeclarativeBase):
    pass


def get_engine(url: str | None = None):
    db_url = url or get_settings().DATABASE_URL
    return create_engine(db_url, echo=False)


def get_session_factory(url: str | None = None) -> sessionmaker[Session]:
    engine = get_engine(url)
    return sessionmaker(bind=engine)
```

- [ ] **Step 2: Write models**

Create `src/solar_sport/models.py`:

```python
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text, DateTime
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
    priority: Mapped[str | None] = mapped_column(Enum(Priority, values_callable=lambda e: [m.value for m in e]))
    stage: Mapped[str] = mapped_column(
        Enum(PipelineStage, values_callable=lambda e: [m.value for m in e]),
        default=PipelineStage.DISCOVERED.value,
    )
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
    outreach_type: Mapped[str] = mapped_column(
        Enum(OutreachType, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    subject: Mapped[str | None] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    recipient_email: Mapped[str | None] = mapped_column(String(255))
    approval_status: Mapped[str] = mapped_column(
        Enum(ApprovalStatus, values_callable=lambda e: [m.value for m in e]),
        default=ApprovalStatus.PENDING.value,
    )
    approved_by: Mapped[str | None] = mapped_column(String(255))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    lead: Mapped["Lead"] = relationship(back_populates="drafts")
```

- [ ] **Step 3: Write test fixtures**

Create `tests/conftest.py`:

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from solar_sport.database import Base


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    session = factory()
    yield session
    session.close()
    engine.dispose()
```

- [ ] **Step 4: Write model tests**

Create `tests/test_models.py`:

```python
from solar_sport.models import (
    Stadium, Lead, Contact, OutreachDraft,
    PipelineStage, ApprovalStatus,
)


def test_create_stadium(db_session):
    stadium = Stadium(name="Wembley Stadium", club_name="England", city="London", capacity=90000, sport="Football")
    db_session.add(stadium)
    db_session.commit()
    result = db_session.query(Stadium).first()
    assert result.name == "Wembley Stadium"
    assert result.capacity == 90000
    assert result.country == "United Kingdom"


def test_create_lead_with_stadium(db_session):
    stadium = Stadium(name="Old Trafford", club_name="Manchester United", capacity=74310)
    db_session.add(stadium)
    db_session.flush()
    lead = Lead(stadium_id=stadium.id, stage=PipelineStage.DISCOVERED.value)
    db_session.add(lead)
    db_session.commit()
    result = db_session.query(Lead).first()
    assert result.stadium.name == "Old Trafford"
    assert result.stage == PipelineStage.DISCOVERED.value


def test_create_contact_for_lead(db_session):
    stadium = Stadium(name="Anfield", club_name="Liverpool")
    db_session.add(stadium)
    db_session.flush()
    lead = Lead(stadium_id=stadium.id)
    db_session.add(lead)
    db_session.flush()
    contact = Contact(
        lead_id=lead.id, name="John Smith",
        title="Head of Partnerships", email="john@liverpoolfc.com", source="club_website",
    )
    db_session.add(contact)
    db_session.commit()
    result = db_session.query(Contact).first()
    assert result.lead.stadium.name == "Anfield"


def test_create_outreach_draft(db_session):
    stadium = Stadium(name="Emirates Stadium", club_name="Arsenal")
    db_session.add(stadium)
    db_session.flush()
    lead = Lead(stadium_id=stadium.id)
    db_session.add(lead)
    db_session.flush()
    draft = OutreachDraft(
        lead_id=lead.id, outreach_type="cold_email",
        subject="Solar partnership opportunity", body="Dear Arsenal team...",
    )
    db_session.add(draft)
    db_session.commit()
    result = db_session.query(OutreachDraft).first()
    assert result.approval_status == ApprovalStatus.PENDING.value


def test_pipeline_stages_exist():
    stages = [s.value for s in PipelineStage]
    assert "discovered" in stages
    assert "closed_won" in stages
    assert len(stages) == 10
```

- [ ] **Step 5: Run tests**

Run: `pytest tests/test_models.py -v`
Expected: 5 passed

- [ ] **Step 6: Commit**

```bash
git add src/solar_sport/database.py src/solar_sport/models.py tests/conftest.py tests/test_models.py
git commit -m "feat: database engine and ORM models for stadiums, leads, contacts, drafts"
```

---

### Task 3: Pydantic Schemas

**Files:**
- Create: `src/solar_sport/schemas.py`

- [ ] **Step 1: Write schemas**

Create `src/solar_sport/schemas.py`:

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add src/solar_sport/schemas.py
git commit -m "feat: pydantic request/response schemas"
```

---

## Phase 2: Discovery Pipeline (Tasks 4–5)

### Task 4: Wikipedia Scraper

**Files:**
- Create: `src/solar_sport/discovery/__init__.py`
- Create: `src/solar_sport/discovery/wikipedia.py`
- Create: `tests/test_discovery.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_discovery.py`:

```python
from solar_sport.discovery.wikipedia import parse_stadium_table


SAMPLE_HTML = """
<table class="wikitable sortable">
<tr><th>Stadium</th><th>Capacity</th><th>City</th><th>Club</th><th>League</th></tr>
<tr><td><a href="/wiki/Wembley">Wembley Stadium</a></td><td>90,000</td><td>London</td><td>England</td><td>N/A</td></tr>
<tr><td><a href="/wiki/Old_Trafford">Old Trafford</a></td><td>74,310</td><td>Manchester</td><td>Manchester United</td><td>Premier League</td></tr>
<tr><td><a href="/wiki/Anfield">Anfield</a></td><td>61,276</td><td>Liverpool</td><td>Liverpool</td><td>Premier League</td></tr>
</table>
"""


def test_parse_stadium_table_extracts_rows():
    results = parse_stadium_table(SAMPLE_HTML)
    assert len(results) == 3


def test_parse_stadium_table_fields():
    results = parse_stadium_table(SAMPLE_HTML)
    wembley = results[0]
    assert wembley["name"] == "Wembley Stadium"
    assert wembley["capacity"] == 90000
    assert wembley["city"] == "London"


def test_parse_stadium_table_handles_comma_in_capacity():
    results = parse_stadium_table(SAMPLE_HTML)
    assert results[1]["capacity"] == 74310


def test_parse_stadium_table_empty_html():
    results = parse_stadium_table("<html><body>No tables</body></html>")
    assert results == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_discovery.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/discovery/__init__.py` (empty).

Create `src/solar_sport/discovery/wikipedia.py`:

```python
import re

from bs4 import BeautifulSoup


def parse_stadium_table(html: str) -> list[dict]:
    """Parse Wikipedia stadium table HTML into structured dicts."""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table", class_="wikitable")
    if not tables:
        return []

    results = []
    for table in tables:
        headers = [th.get_text(strip=True).lower() for th in table.find_all("tr")[0].find_all("th")]
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if len(cells) < len(headers):
                continue
            raw = {headers[i]: cells[i].get_text(strip=True) for i in range(len(headers))}
            stadium = _normalize_row(raw)
            if stadium and stadium.get("name"):
                results.append(stadium)
    return results


def _normalize_row(raw: dict) -> dict:
    name = raw.get("stadium") or raw.get("ground") or raw.get("name") or ""
    capacity = _parse_capacity(raw.get("capacity", "0"))
    return {
        "name": name.strip(),
        "club_name": (raw.get("club") or raw.get("team") or "").strip() or None,
        "city": (raw.get("city") or raw.get("location") or "").strip() or None,
        "capacity": capacity,
        "league": (raw.get("league") or raw.get("competition") or "").strip() or None,
        "sport": "Football",
        "country": "United Kingdom",
    }


def _parse_capacity(text: str) -> int | None:
    cleaned = re.sub(r"[^\d]", "", text.split("[")[0])
    return int(cleaned) if cleaned else None


async def fetch_uk_stadiums() -> list[dict]:
    """Fetch and parse UK football stadium data from Wikipedia."""
    import httpx

    urls = [
        "https://en.wikipedia.org/wiki/List_of_football_stadiums_in_England",
        "https://en.wikipedia.org/wiki/List_of_football_stadiums_in_Scotland",
        "https://en.wikipedia.org/wiki/List_of_football_stadiums_in_Wales",
    ]
    all_stadiums = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for url in urls:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                all_stadiums.extend(parse_stadium_table(resp.text))
    return all_stadiums
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_discovery.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/discovery/ tests/test_discovery.py
git commit -m "feat: wikipedia stadium table parser with capacity normalization"
```

---

### Task 5: Discovery Pipeline

**Files:**
- Create: `src/solar_sport/discovery/pipeline.py`
- Modify: `tests/test_discovery.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_discovery.py`:

```python
from solar_sport.discovery.pipeline import run_discovery
from solar_sport.models import Stadium, Lead


def test_run_discovery_creates_stadiums(db_session):
    fake_data = [
        {"name": "Wembley Stadium", "club_name": "England", "city": "London", "capacity": 90000, "sport": "Football", "league": None, "country": "United Kingdom"},
        {"name": "Old Trafford", "club_name": "Manchester United", "city": "Manchester", "capacity": 74310, "sport": "Football", "league": "Premier League", "country": "United Kingdom"},
    ]
    count = run_discovery(db_session, fake_data)
    assert count == 2
    assert db_session.query(Stadium).count() == 2
    assert db_session.query(Lead).count() == 2


def test_run_discovery_deduplicates(db_session):
    data = [{"name": "Wembley Stadium", "club_name": "England", "city": "London", "capacity": 90000, "sport": "Football", "league": None, "country": "United Kingdom"}]
    run_discovery(db_session, data)
    run_discovery(db_session, data)
    assert db_session.query(Stadium).count() == 1


def test_run_discovery_creates_lead_in_discovered_stage(db_session):
    data = [{"name": "Anfield", "club_name": "Liverpool", "city": "Liverpool", "capacity": 61276, "sport": "Football", "league": "Premier League", "country": "United Kingdom"}]
    run_discovery(db_session, data)
    lead = db_session.query(Lead).first()
    assert lead.stage == "discovered"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_discovery.py::test_run_discovery_creates_stadiums -v`
Expected: FAIL — `ImportError`

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/discovery/pipeline.py`:

```python
from sqlalchemy.orm import Session

from solar_sport.models import Stadium, Lead, PipelineStage


def run_discovery(session: Session, stadium_data: list[dict]) -> int:
    """Persist discovered stadiums and create leads. Returns count of new stadiums."""
    new_count = 0
    for data in stadium_data:
        existing = (
            session.query(Stadium)
            .filter(Stadium.name == data["name"], Stadium.city == data.get("city"))
            .first()
        )
        if existing:
            continue

        stadium = Stadium(
            name=data["name"], club_name=data.get("club_name"), city=data.get("city"),
            country=data.get("country", "United Kingdom"), capacity=data.get("capacity"),
            sport=data.get("sport"), league=data.get("league"), website=data.get("website"),
        )
        session.add(stadium)
        session.flush()

        lead = Lead(stadium_id=stadium.id, stage=PipelineStage.DISCOVERED.value)
        session.add(lead)
        new_count += 1

    session.commit()
    return new_count
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_discovery.py -v`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/discovery/pipeline.py tests/test_discovery.py
git commit -m "feat: discovery pipeline with deduplication and auto lead creation"
```

---

## Phase 3: Enrichment (Tasks 6–7)

### Task 6: Contact Scraper

**Files:**
- Create: `src/solar_sport/enrichment/__init__.py`
- Create: `src/solar_sport/enrichment/scraper.py`
- Create: `tests/test_enrichment.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_enrichment.py`:

```python
from solar_sport.enrichment.scraper import extract_emails, extract_contact_links, find_contact_page_url


SAMPLE_PAGE = """
<html><body>
<p>Contact us at info@exampleclub.com or partnerships@exampleclub.com</p>
<a href="/contact">Contact Us</a>
<a href="/commercial/partnerships">Partnerships</a>
<a href="/about">About</a>
</body></html>
"""


def test_extract_emails():
    emails = extract_emails(SAMPLE_PAGE)
    assert "info@exampleclub.com" in emails
    assert "partnerships@exampleclub.com" in emails


def test_extract_emails_deduplicates():
    html = "<p>test@example.com and test@example.com</p>"
    assert len(extract_emails(html)) == 1


def test_extract_contact_links():
    links = extract_contact_links(SAMPLE_PAGE, base_url="https://exampleclub.com")
    urls = [link["url"] for link in links]
    assert "https://exampleclub.com/contact" in urls
    assert "https://exampleclub.com/commercial/partnerships" in urls


def test_extract_contact_links_excludes_irrelevant():
    links = extract_contact_links(SAMPLE_PAGE, base_url="https://exampleclub.com")
    urls = [link["url"] for link in links]
    assert "https://exampleclub.com/about" not in urls


def test_find_contact_page_url():
    url = find_contact_page_url(SAMPLE_PAGE, base_url="https://exampleclub.com")
    assert url == "https://exampleclub.com/contact"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_enrichment.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/enrichment/__init__.py` (empty).

Create `src/solar_sport/enrichment/scraper.py`:

```python
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

CONTACT_KEYWORDS = [
    "contact", "partnerships", "commercial", "sponsorship",
    "facilities", "sustainability", "operations",
]


def extract_emails(html: str) -> list[str]:
    """Extract unique email addresses from HTML content."""
    seen: set[str] = set()
    unique: list[str] = []
    for email in EMAIL_PATTERN.findall(html):
        lower = email.lower()
        if lower not in seen:
            seen.add(lower)
            unique.append(email)
    return unique


def extract_contact_links(html: str, base_url: str) -> list[dict]:
    """Find links that likely lead to contact or partnerships pages."""
    soup = BeautifulSoup(html, "html.parser")
    results = []
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        text = a_tag.get_text(strip=True).lower()
        href_lower = href.lower()
        if any(kw in text or kw in href_lower for kw in CONTACT_KEYWORDS):
            results.append({"url": urljoin(base_url, href), "text": a_tag.get_text(strip=True)})
    return results


def find_contact_page_url(html: str, base_url: str) -> str | None:
    """Find the most likely contact page URL from the HTML."""
    links = extract_contact_links(html, base_url)
    if not links:
        return None
    for link in links:
        if "contact" in link["url"].lower():
            return link["url"]
    return links[0]["url"]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_enrichment.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/enrichment/ tests/test_enrichment.py
git commit -m "feat: contact scraper with email extraction and contact page detection"
```

---

### Task 7: Enrichment Pipeline

**Files:**
- Create: `src/solar_sport/enrichment/pipeline.py`
- Modify: `tests/test_enrichment.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_enrichment.py`:

```python
from solar_sport.enrichment.pipeline import enrich_lead_from_data
from solar_sport.models import Stadium, Lead, Contact, PipelineStage


def test_enrich_lead_creates_contacts(db_session):
    stadium = Stadium(name="Test Stadium", club_name="Test FC", website="https://testfc.com")
    db_session.add(stadium)
    db_session.flush()
    lead = Lead(stadium_id=stadium.id, stage=PipelineStage.DISCOVERED.value)
    db_session.add(lead)
    db_session.commit()

    enrich_lead_from_data(db_session, lead.id, emails=["info@testfc.com", "partnerships@testfc.com"], contact_page_url="https://testfc.com/contact")

    contacts = db_session.query(Contact).filter(Contact.lead_id == lead.id).all()
    assert len(contacts) == 2


def test_enrich_lead_updates_stage(db_session):
    stadium = Stadium(name="Test Stadium 2", club_name="Test FC 2")
    db_session.add(stadium)
    db_session.flush()
    lead = Lead(stadium_id=stadium.id, stage=PipelineStage.DISCOVERED.value)
    db_session.add(lead)
    db_session.commit()

    enrich_lead_from_data(db_session, lead.id, emails=["info@testfc2.com"], contact_page_url=None)
    db_session.refresh(lead)
    assert lead.stage == PipelineStage.ENRICHED.value


def test_enrich_lead_no_duplicate_emails(db_session):
    stadium = Stadium(name="Test Stadium 3", club_name="Test FC 3")
    db_session.add(stadium)
    db_session.flush()
    lead = Lead(stadium_id=stadium.id, stage=PipelineStage.DISCOVERED.value)
    db_session.add(lead)
    db_session.commit()

    enrich_lead_from_data(db_session, lead.id, emails=["info@testfc3.com"], contact_page_url=None)
    enrich_lead_from_data(db_session, lead.id, emails=["info@testfc3.com"], contact_page_url=None)
    assert db_session.query(Contact).filter(Contact.lead_id == lead.id).count() == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_enrichment.py::test_enrich_lead_creates_contacts -v`
Expected: FAIL — `ImportError`

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/enrichment/pipeline.py`:

```python
from sqlalchemy.orm import Session

from solar_sport.models import Contact, Lead, PipelineStage


def enrich_lead_from_data(
    session: Session, lead_id: int, emails: list[str], contact_page_url: str | None,
) -> int:
    """Create contacts for a lead from scraped data. Returns count of new contacts."""
    lead = session.query(Lead).get(lead_id)
    if not lead:
        raise ValueError(f"Lead {lead_id} not found")

    existing_emails = {
        c.email.lower()
        for c in session.query(Contact).filter(Contact.lead_id == lead_id).all()
        if c.email
    }

    new_count = 0
    for email in emails:
        if email.lower() in existing_emails:
            continue
        contact = Contact(
            lead_id=lead_id, email=email,
            contact_page_url=contact_page_url, source="website_scrape",
        )
        session.add(contact)
        existing_emails.add(email.lower())
        new_count += 1

    lead.stage = PipelineStage.ENRICHED.value
    session.commit()
    return new_count
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_enrichment.py -v`
Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/enrichment/pipeline.py tests/test_enrichment.py
git commit -m "feat: enrichment pipeline with contact creation and deduplication"
```

---

## Phase 4: Lead Scoring (Task 8)

### Task 8: Scoring Engine

**Files:**
- Create: `src/solar_sport/scoring/__init__.py`
- Create: `src/solar_sport/scoring/engine.py`
- Create: `tests/test_scoring.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_scoring.py`:

```python
from solar_sport.scoring.engine import score_lead, DEFAULT_WEIGHTS, Priority


def test_score_lead_high_capacity_high_score():
    data = {
        "capacity": 60000, "is_professional": True, "has_partnerships": True,
        "has_sustainability": True, "is_multi_use": False, "contact_count": 3, "has_sponsors": True,
    }
    result = score_lead(data)
    assert result["score"] > 70
    assert result["priority"] == Priority.HIGH


def test_score_lead_small_venue_low_score():
    data = {
        "capacity": 2000, "is_professional": False, "has_partnerships": False,
        "has_sustainability": False, "is_multi_use": False, "contact_count": 0, "has_sponsors": False,
    }
    result = score_lead(data)
    assert result["score"] < 30
    assert result["priority"] == Priority.LOW


def test_score_lead_medium_venue():
    data = {
        "capacity": 15000, "is_professional": True, "has_partnerships": False,
        "has_sustainability": True, "is_multi_use": True, "contact_count": 1, "has_sponsors": False,
    }
    result = score_lead(data)
    assert 30 <= result["score"] <= 70
    assert result["priority"] == Priority.MEDIUM


def test_score_lead_custom_weights():
    data = {
        "capacity": 5000, "is_professional": False, "has_partnerships": False,
        "has_sustainability": True, "is_multi_use": False, "contact_count": 2, "has_sponsors": False,
    }
    weights = {**DEFAULT_WEIGHTS, "has_sustainability": 50}
    result = score_lead(data, weights=weights)
    assert result["score"] > 50


def test_score_lead_returns_all_fields():
    data = {
        "capacity": 30000, "is_professional": True, "has_partnerships": True,
        "has_sustainability": False, "is_multi_use": False, "contact_count": 2, "has_sponsors": True,
    }
    result = score_lead(data)
    assert "score" in result
    assert "priority" in result
    assert isinstance(result["score"], float)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_scoring.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/scoring/__init__.py` (empty).

Create `src/solar_sport/scoring/engine.py`:

```python
from enum import Enum


class Priority(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


DEFAULT_WEIGHTS = {
    "capacity": 20,
    "is_professional": 15,
    "has_partnerships": 15,
    "has_sustainability": 15,
    "is_multi_use": 10,
    "contact_count": 15,
    "has_sponsors": 10,
}


def score_lead(data: dict, weights: dict | None = None) -> dict:
    """Score a lead based on weighted criteria. Returns score (0-100) and priority."""
    w = weights or DEFAULT_WEIGHTS
    total = 0.0
    max_possible = sum(w.values())

    # Capacity bands
    capacity = data.get("capacity") or 0
    if capacity >= 40000:
        total += w.get("capacity", 0)
    elif capacity >= 15000:
        total += w.get("capacity", 0) * 0.7
    elif capacity >= 5000:
        total += w.get("capacity", 0) * 0.4
    elif capacity >= 1000:
        total += w.get("capacity", 0) * 0.15

    # Boolean criteria
    for key in ["is_professional", "has_partnerships", "has_sustainability", "is_multi_use", "has_sponsors"]:
        if data.get(key):
            total += w.get(key, 0)

    # Contact count
    contact_count = data.get("contact_count", 0)
    if contact_count >= 3:
        total += w.get("contact_count", 0)
    elif contact_count >= 1:
        total += w.get("contact_count", 0) * 0.5

    score = round((total / max_possible) * 100, 1) if max_possible > 0 else 0.0

    if score >= 65:
        priority = Priority.HIGH
    elif score >= 35:
        priority = Priority.MEDIUM
    else:
        priority = Priority.LOW

    return {"score": score, "priority": priority}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_scoring.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/scoring/ tests/test_scoring.py
git commit -m "feat: lead scoring engine with configurable weights and priority bands"
```

---

## Phase 5: Outreach Generation (Tasks 9–10)

### Task 9: Email Templates

**Files:**
- Create: `src/solar_sport/outreach/__init__.py`
- Create: `src/solar_sport/outreach/templates.py`
- Create: `templates/cold_email.jinja2`
- Create: `templates/followup_1.jinja2`
- Create: `templates/followup_2.jinja2`
- Create: `templates/linkedin_message.jinja2`
- Create: `templates/call_script.jinja2`

- [ ] **Step 1: Create all Jinja2 templates**

Create `templates/cold_email.jinja2`:

```
Subject: Solar partnership opportunity — {{ stadium_name }}

Dear {{ contact_name | default("Stadium Partnerships Team", true) }},

I'm reaching out regarding {{ stadium_name }}{% if club_name %}, home of {{ club_name }}{% endif %}. As a {{ capacity | default("significant", true) }}-capacity venue{% if league %} competing in the {{ league }}{% endif %}, there's a compelling opportunity to explore how solar energy solutions could benefit your operations.

{% if sustainability_angle %}We noticed {{ club_name or "your club" }} has shown commitment to sustainability through {{ sustainability_angle }}, which aligns closely with what we do at Solar & Sport.{% endif %}

{% if commercial_angle %}With your existing commercial partnerships infrastructure, integrating a solar energy partner could complement your current sponsor ecosystem while reducing operational energy costs.{% endif %}

We work with sports venues across the UK to implement solar solutions that reduce energy bills, generate revenue, and strengthen sustainability credentials — all with minimal disruption to operations.

Would you be open to a brief conversation about how this could work for {{ stadium_name }}?

Best regards,
{{ sender_name | default("The Solar & Sport Team") }}
```

Create `templates/followup_1.jinja2`:

```
Subject: Re: Solar partnership opportunity — {{ stadium_name }}

Hi {{ contact_name | default("there", true) }},

I wanted to follow up on my previous message about solar energy opportunities at {{ stadium_name }}.

{% if capacity and capacity > 20000 %}With a venue of {{ capacity | string | replace(".0", "") }} capacity, the potential energy savings and commercial benefits are significant.{% endif %}

Many venues similar to {{ stadium_name }} are seeing meaningful returns from solar installations — both financially and in terms of their sustainability positioning.

I'd welcome 15 minutes to share some relevant examples. Would any time this week or next work?

Best regards,
{{ sender_name | default("The Solar & Sport Team") }}
```

Create `templates/followup_2.jinja2`:

```
Subject: Re: Solar partnership opportunity — {{ stadium_name }}

Hi {{ contact_name | default("there", true) }},

I appreciate you're busy, so I'll keep this brief.

I've been looking into {{ stadium_name }}{% if club_name %} and {{ club_name }}'s{% endif %} setup and believe there's a strong fit for a solar energy partnership.

If the timing isn't right now, I completely understand. Would it be helpful if I sent over a short overview of what we've done with similar venues?

Best regards,
{{ sender_name | default("The Solar & Sport Team") }}
```

Create `templates/linkedin_message.jinja2`:

```
Hi {{ contact_name | default("there", true) }}, I came across your work at {{ club_name or stadium_name }} and wanted to connect. We're helping sports venues across the UK unlock solar energy opportunities — reducing costs while strengthening sustainability credentials. Would love to share how this could benefit {{ stadium_name }}. Happy to chat if you're interested.
```

Create `templates/call_script.jinja2`:

```
CALL OPENER — {{ stadium_name }}

"Hi {{ contact_name | default("there", true) }}, my name is {{ sender_name | default("[Your Name]") }} from Solar & Sport. I'm calling because we work with sports venues across the UK on solar energy solutions, and I believe there's a strong opportunity at {{ stadium_name }}.

{% if sustainability_angle %}I noticed {{ club_name or "your club" }} has been active on the sustainability front, and I think we could build on that.{% endif %}

We're helping venues like yours reduce energy costs and generate new revenue through solar installations. Would you have a few minutes to discuss this, or would it be better to schedule a call later this week?"

IF VOICEMAIL:
"Hi {{ contact_name | default("there", true) }}, this is {{ sender_name | default("[Your Name]") }} from Solar & Sport. I'm reaching out because we help sports venues like {{ stadium_name }} save on energy through solar solutions. I'll follow up by email, but feel free to reach me at [phone number]. Thanks."
```

- [ ] **Step 2: Write template loader**

Create `src/solar_sport/outreach/__init__.py` (empty).

Create `src/solar_sport/outreach/templates.py`:

```python
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    keep_trailing_newline=False,
    trim_blocks=True,
    lstrip_blocks=True,
)


def render_template(template_name: str, context: dict) -> str:
    template = _env.get_template(template_name)
    return template.render(**context).strip()
```

- [ ] **Step 3: Commit**

```bash
git add templates/ src/solar_sport/outreach/
git commit -m "feat: jinja2 outreach templates for email, linkedin, and call scripts"
```

---

### Task 10: Outreach Draft Generator

**Files:**
- Create: `src/solar_sport/outreach/generator.py`
- Create: `tests/test_outreach.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_outreach.py`:

```python
from solar_sport.outreach.generator import generate_drafts


def test_generate_drafts_returns_all_types():
    lead_data = {
        "stadium_name": "Old Trafford", "club_name": "Manchester United",
        "capacity": 74310, "league": "Premier League",
        "contact_name": "Sarah Jones", "contact_email": "sarah.jones@manutd.com",
        "sustainability_angle": "their carbon reduction pledges",
        "commercial_angle": "extensive sponsor portfolio",
    }
    drafts = generate_drafts(lead_data)
    types = {d["outreach_type"] for d in drafts}
    assert types == {"cold_email", "followup_1", "followup_2", "linkedin", "call_script"}


def test_generate_drafts_personalizes_content():
    lead_data = {
        "stadium_name": "Anfield", "club_name": "Liverpool",
        "capacity": 61276, "league": "Premier League",
        "contact_name": "James Brown", "contact_email": "j.brown@liverpoolfc.com",
        "sustainability_angle": None, "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    cold_email = next(d for d in drafts if d["outreach_type"] == "cold_email")
    assert "Anfield" in cold_email["body"]
    assert "Liverpool" in cold_email["body"]
    assert cold_email["subject"] is not None
    assert cold_email["recipient_email"] == "j.brown@liverpoolfc.com"


def test_generate_drafts_handles_missing_contact_name():
    lead_data = {
        "stadium_name": "Wembley", "club_name": "England",
        "capacity": 90000, "league": None,
        "contact_name": None, "contact_email": "info@wembleystadium.com",
        "sustainability_angle": None, "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    cold_email = next(d for d in drafts if d["outreach_type"] == "cold_email")
    assert "Wembley" in cold_email["body"]
    assert "None" not in cold_email["body"]


def test_generate_drafts_linkedin_under_600_chars():
    lead_data = {
        "stadium_name": "Emirates Stadium", "club_name": "Arsenal",
        "capacity": 60704, "league": "Premier League",
        "contact_name": "Tom White", "contact_email": "t.white@arsenal.com",
        "sustainability_angle": None, "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    linkedin = next(d for d in drafts if d["outreach_type"] == "linkedin")
    assert len(linkedin["body"]) < 600
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_outreach.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/outreach/generator.py`:

```python
from solar_sport.outreach.templates import render_template

TEMPLATE_MAP = {
    "cold_email": "cold_email.jinja2",
    "followup_1": "followup_1.jinja2",
    "followup_2": "followup_2.jinja2",
    "linkedin": "linkedin_message.jinja2",
    "call_script": "call_script.jinja2",
}


def generate_drafts(lead_data: dict) -> list[dict]:
    """Generate all outreach drafts for a lead."""
    drafts = []
    for outreach_type, template_file in TEMPLATE_MAP.items():
        rendered = render_template(template_file, lead_data)

        subject = None
        if outreach_type in ("cold_email", "followup_1", "followup_2"):
            lines = rendered.split("\n")
            for line in lines:
                if line.startswith("Subject:"):
                    subject = line.replace("Subject:", "").strip()
                    rendered = "\n".join(l for l in lines if not l.startswith("Subject:")).strip()
                    break

        drafts.append({
            "outreach_type": outreach_type,
            "subject": subject,
            "body": rendered,
            "recipient_email": lead_data.get("contact_email"),
        })
    return drafts
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_outreach.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/outreach/generator.py tests/test_outreach.py
git commit -m "feat: outreach draft generator with jinja2 template rendering"
```

---

## Phase 6: API Layer (Tasks 11–14)

### Task 11: FastAPI App + Shared Dependencies

**Files:**
- Create: `src/solar_sport/api/__init__.py`
- Create: `src/solar_sport/api/app.py`
- Create: `src/solar_sport/api/deps.py`
- Create: `src/solar_sport/api/leads.py` (stub)
- Create: `src/solar_sport/api/outreach.py` (stub)
- Create: `src/solar_sport/api/dashboard.py` (stub)

- [ ] **Step 1: Write shared dependency**

Create `src/solar_sport/api/__init__.py` (empty).

Create `src/solar_sport/api/deps.py`:

```python
from sqlalchemy.orm import Session

from solar_sport.config import get_settings
from solar_sport.database import get_session_factory

_factory = None


def get_db():
    global _factory
    if _factory is None:
        _factory = get_session_factory(get_settings().DATABASE_URL)
    session = _factory()
    try:
        yield session
    finally:
        session.close()
```

- [ ] **Step 2: Write app factory**

Create `src/solar_sport/api/app.py`:

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from solar_sport.config import get_settings
from solar_sport.database import Base, get_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    Base.metadata.create_all(engine)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Solar & Sport Engine", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from solar_sport.api.leads import router as leads_router
    from solar_sport.api.outreach import router as outreach_router
    from solar_sport.api.dashboard import router as dashboard_router

    app.include_router(leads_router, prefix="/api/leads", tags=["leads"])
    app.include_router(outreach_router, prefix="/api/outreach", tags=["outreach"])
    app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])

    return app


app = create_app()
```

- [ ] **Step 3: Create stub routers** (so app.py imports don't break before Tasks 12-14)

Create `src/solar_sport/api/leads.py`:

```python
from fastapi import APIRouter

router = APIRouter()
```

Create `src/solar_sport/api/outreach.py`:

```python
from fastapi import APIRouter

router = APIRouter()
```

Create `src/solar_sport/api/dashboard.py`:

```python
from fastapi import APIRouter

router = APIRouter()
```

- [ ] **Step 4: Commit**

```bash
git add src/solar_sport/api/
git commit -m "feat: fastapi app factory with CORS, lifespan, shared deps, and stub routers"
```

---

### Task 12: Lead API Endpoints

**Files:**
- Create: `src/solar_sport/api/leads.py`
- Create: `tests/test_api.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_api.py`:

```python
import pytest
from fastapi.testclient import TestClient

from solar_sport.api.app import create_app
from solar_sport.api.deps import get_db
from solar_sport.models import Stadium, Lead, Contact, PipelineStage


@pytest.fixture
def test_client(db_session):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


@pytest.fixture
def seeded_db(db_session):
    stadium = Stadium(name="Wembley", club_name="England", city="London", capacity=90000, sport="Football")
    db_session.add(stadium)
    db_session.flush()
    lead = Lead(stadium_id=stadium.id, stage=PipelineStage.DISCOVERED.value)
    db_session.add(lead)
    db_session.flush()
    Contact(lead_id=lead.id, email="info@wembley.com", source="test")
    db_session.add(Contact(lead_id=lead.id, email="info@wembley.com", source="test"))
    db_session.commit()
    return {"stadium_id": stadium.id, "lead_id": lead.id}


def test_list_leads(test_client, seeded_db):
    resp = test_client.get("/api/leads/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["stadium"]["name"] == "Wembley"


def test_get_lead(test_client, seeded_db):
    resp = test_client.get(f"/api/leads/{seeded_db['lead_id']}")
    assert resp.status_code == 200
    assert resp.json()["stadium"]["name"] == "Wembley"


def test_get_lead_not_found(test_client):
    resp = test_client.get("/api/leads/999")
    assert resp.status_code == 404


def test_update_lead(test_client, seeded_db):
    resp = test_client.patch(
        f"/api/leads/{seeded_db['lead_id']}",
        json={"stage": "enriched", "notes": "Looks promising"},
    )
    assert resp.status_code == 200
    assert resp.json()["stage"] == "enriched"
    assert resp.json()["notes"] == "Looks promising"


def test_filter_leads_by_sport(test_client, seeded_db):
    resp = test_client.get("/api/leads/", params={"sport": "Football"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = test_client.get("/api/leads/", params={"sport": "Rugby"})
    assert len(resp.json()) == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_api.py -v`
Expected: FAIL — `ImportError`

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/api/leads.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from solar_sport.api.deps import get_db
from solar_sport.models import Lead, Stadium
from solar_sport.schemas import LeadRead, LeadUpdate

router = APIRouter()


@router.get("/", response_model=list[LeadRead])
def list_leads(
    sport: str | None = None,
    league: str | None = None,
    city: str | None = None,
    country: str | None = None,
    stage: str | None = None,
    priority: str | None = None,
    min_capacity: int | None = None,
    max_capacity: int | None = None,
    owner: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Lead).options(joinedload(Lead.stadium), joinedload(Lead.contacts))

    if sport:
        query = query.join(Stadium).filter(Stadium.sport == sport)
    if league:
        query = query.join(Stadium).filter(Stadium.league == league)
    if city:
        query = query.join(Stadium).filter(Stadium.city == city)
    if country:
        query = query.join(Stadium).filter(Stadium.country == country)
    if min_capacity:
        query = query.join(Stadium).filter(Stadium.capacity >= min_capacity)
    if max_capacity:
        query = query.join(Stadium).filter(Stadium.capacity <= max_capacity)
    if stage:
        query = query.filter(Lead.stage == stage)
    if priority:
        query = query.filter(Lead.priority == priority)
    if owner:
        query = query.filter(Lead.owner == owner)

    return query.all()


@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = (
        db.query(Lead)
        .options(joinedload(Lead.stadium), joinedload(Lead.contacts))
        .get(lead_id)
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadRead)
def update_lead(lead_id: int, update: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).get(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return (
        db.query(Lead)
        .options(joinedload(Lead.stadium), joinedload(Lead.contacts))
        .get(lead_id)
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_api.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/api/leads.py tests/test_api.py
git commit -m "feat: lead CRUD API with filtering"
```

---

### Task 13: Outreach API Endpoints

**Files:**
- Create: `src/solar_sport/api/outreach.py`
- Modify: `tests/test_api.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_api.py`:

```python
from solar_sport.models import OutreachDraft


@pytest.fixture
def seeded_with_drafts(db_session, seeded_db):
    draft = OutreachDraft(
        lead_id=seeded_db["lead_id"],
        outreach_type="cold_email",
        subject="Solar opportunity",
        body="Dear team...",
        recipient_email="info@wembley.com",
    )
    db_session.add(draft)
    db_session.commit()
    return {**seeded_db, "draft_id": draft.id}


def test_list_drafts(test_client, seeded_with_drafts):
    resp = test_client.get("/api/outreach/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_list_drafts_filter_pending(test_client, seeded_with_drafts):
    resp = test_client.get("/api/outreach/", params={"status": "pending"})
    assert len(resp.json()) == 1


def test_approve_draft(test_client, seeded_with_drafts):
    resp = test_client.post(
        f"/api/outreach/{seeded_with_drafts['draft_id']}/approve",
        json={"status": "approved", "approved_by": "admin"},
    )
    assert resp.status_code == 200
    assert resp.json()["approval_status"] == "approved"


def test_reject_draft(test_client, seeded_with_drafts):
    resp = test_client.post(
        f"/api/outreach/{seeded_with_drafts['draft_id']}/approve",
        json={"status": "rejected", "approved_by": "admin"},
    )
    assert resp.status_code == 200
    assert resp.json()["approval_status"] == "rejected"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_api.py::test_list_drafts -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/api/outreach.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from solar_sport.api.deps import get_db
from solar_sport.models import OutreachDraft
from solar_sport.schemas import OutreachDraftRead, ApprovalAction

router = APIRouter()


@router.get("/", response_model=list[OutreachDraftRead])
def list_drafts(
    status: str | None = None,
    lead_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(OutreachDraft)
    if status:
        query = query.filter(OutreachDraft.approval_status == status)
    if lead_id:
        query = query.filter(OutreachDraft.lead_id == lead_id)
    return query.all()


@router.post("/{draft_id}/approve", response_model=OutreachDraftRead)
def approve_or_reject_draft(
    draft_id: int, action: ApprovalAction, db: Session = Depends(get_db),
):
    draft = db.query(OutreachDraft).get(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if action.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    draft.approval_status = action.status
    draft.approved_by = action.approved_by
    db.commit()
    db.refresh(draft)
    return draft
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_api.py -v`
Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/api/outreach.py tests/test_api.py
git commit -m "feat: outreach draft listing and approval API"
```

---

### Task 14: Dashboard API

**Files:**
- Create: `src/solar_sport/api/dashboard.py`
- Modify: `tests/test_api.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_api.py`:

```python
def test_dashboard_stats(test_client, seeded_db):
    resp = test_client.get("/api/dashboard/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_leads"] == 1
    assert isinstance(data["pipeline"], list)
    assert isinstance(data["leads_by_priority"], dict)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_api.py::test_dashboard_stats -v`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Create `src/solar_sport/api/dashboard.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from solar_sport.api.deps import get_db
from solar_sport.models import Lead, OutreachDraft, PipelineStage
from solar_sport.schemas import DashboardData, PipelineStats

router = APIRouter()


@router.get("/", response_model=DashboardData)
def get_dashboard(db: Session = Depends(get_db)):
    total_leads = db.query(Lead).count()

    pipeline_rows = (
        db.query(Lead.stage, func.count(Lead.id))
        .group_by(Lead.stage)
        .all()
    )
    pipeline = [PipelineStats(stage=stage, count=count) for stage, count in pipeline_rows]

    priority_rows = (
        db.query(Lead.priority, func.count(Lead.id))
        .filter(Lead.priority.isnot(None))
        .group_by(Lead.priority)
        .all()
    )
    leads_by_priority = {p: c for p, c in priority_rows}

    outreach_pending = (
        db.query(OutreachDraft).filter(OutreachDraft.approval_status == "pending").count()
    )
    outreach_sent = (
        db.query(OutreachDraft).filter(OutreachDraft.approval_status == "sent").count()
    )

    replied_count = db.query(Lead).filter(Lead.stage == PipelineStage.REPLIED.value).count()
    contacted_count = db.query(Lead).filter(Lead.stage == PipelineStage.CONTACTED.value).count()
    reply_rate = (replied_count / contacted_count * 100) if contacted_count > 0 else 0.0

    return DashboardData(
        total_leads=total_leads,
        pipeline=pipeline,
        leads_by_priority=leads_by_priority,
        outreach_pending=outreach_pending,
        outreach_sent=outreach_sent,
        reply_rate=reply_rate,
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_api.py -v`
Expected: 10 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/api/dashboard.py tests/test_api.py
git commit -m "feat: dashboard stats API with pipeline and priority breakdowns"
```

---

## Phase 7: Frontend (Tasks 15–19)

### Task 15: React App Scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

- [ ] **Step 1: Initialize frontend project**

Run from project root:

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install @tanstack/react-query react-router-dom
```

- [ ] **Step 2: Configure Tailwind**

Replace `frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
```

Replace `frontend/src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 3: Write App.tsx with routing**

Replace `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "./pages/DashboardPage";
import LeadListPage from "./pages/LeadListPage";
import LeadDetailPage from "./pages/LeadDetailPage";
import OutreachQueuePage from "./pages/OutreachQueuePage";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm font-medium ${isActive ? "bg-blue-700 text-white" : "text-gray-300 hover:bg-gray-700"}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white px-6 py-3 flex gap-2 items-center">
        <span className="font-bold text-lg mr-6">Solar & Sport</span>
        <NavLink to="/" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/leads" className={linkClass}>Leads</NavLink>
        <NavLink to="/outreach" className={linkClass}>Outreach Queue</NavLink>
      </nav>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadListPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/outreach" element={<OutreachQueuePage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Replace main.tsx**

Replace `frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: react app scaffolding with vite, tailwind, routing"
```

---

### Task 16: API Client

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/types.ts`

- [ ] **Step 1: Write types**

Create `frontend/src/api/types.ts`:

```typescript
export interface Stadium {
  id: number;
  name: string;
  club_name: string | null;
  city: string | null;
  country: string;
  capacity: number | null;
  sport: string | null;
  league: string | null;
  website: string | null;
  created_at: string;
}

export interface Contact {
  id: number;
  lead_id: number;
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  confidence: string;
  created_at: string;
}

export interface Lead {
  id: number;
  stadium_id: number;
  stadium: Stadium;
  contacts: Contact[];
  score: number | null;
  priority: string | null;
  stage: string;
  outreach_status: string | null;
  next_action: string | null;
  notes: string | null;
  tags: string | null;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachDraft {
  id: number;
  lead_id: number;
  outreach_type: string;
  subject: string | null;
  body: string;
  recipient_email: string | null;
  approval_status: string;
  approved_by: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface DashboardData {
  total_leads: number;
  pipeline: { stage: string; count: number }[];
  leads_by_priority: Record<string, number>;
  outreach_pending: number;
  outreach_sent: number;
  reply_rate: number;
}
```

- [ ] **Step 2: Write API client**

Create `frontend/src/api/client.ts`:

```typescript
import type { Lead, OutreachDraft, DashboardData } from "./types";

const BASE = "/api";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export const api = {
  leads: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return fetchJSON<Lead[]>(`/leads/${qs}`);
    },
    get: (id: number) => fetchJSON<Lead>(`/leads/${id}`),
    update: (id: number, data: Record<string, unknown>) =>
      fetchJSON<Lead>(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  outreach: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return fetchJSON<OutreachDraft[]>(`/outreach/${qs}`);
    },
    approve: (id: number, approved_by: string) =>
      fetchJSON<OutreachDraft>(`/outreach/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ status: "approved", approved_by }),
      }),
    reject: (id: number, approved_by: string) =>
      fetchJSON<OutreachDraft>(`/outreach/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ status: "rejected", approved_by }),
      }),
  },
  dashboard: {
    get: () => fetchJSON<DashboardData>("/dashboard/"),
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: typed API client for leads, outreach, and dashboard"
```

---

### Task 17: Dashboard Page

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Write DashboardPage**

Create `frontend/src/pages/DashboardPage.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

const STAGE_LABELS: Record<string, string> = {
  discovered: "Discovered",
  enriched: "Enriched",
  qualified: "Qualified",
  ready_for_outreach: "Ready",
  contacted: "Contacted",
  replied: "Replied",
  meeting_booked: "Meeting",
  opportunity_active: "Active",
  closed_won: "Won",
  closed_lost: "Lost",
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard.get,
  });

  if (isLoading || !data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leads" value={data.total_leads} />
        <StatCard label="Outreach Pending" value={data.outreach_pending} />
        <StatCard label="Outreach Sent" value={data.outreach_sent} />
        <StatCard label="Reply Rate" value={`${data.reply_rate.toFixed(1)}%`} />
      </div>

      <h2 className="text-lg font-semibold mb-3">Pipeline</h2>
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {data.pipeline.map((s) => (
          <div key={s.stage} className="bg-white rounded shadow px-4 py-3 min-w-[100px] text-center">
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs text-gray-500">{STAGE_LABELS[s.stage] ?? s.stage}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">By Priority</h2>
      <div className="flex gap-3">
        {Object.entries(data.leads_by_priority).map(([p, c]) => (
          <span key={p} className={`px-3 py-1 rounded text-sm font-medium ${
            p === "high" ? "bg-red-100 text-red-800" :
            p === "medium" ? "bg-yellow-100 text-yellow-800" :
            "bg-gray-100 text-gray-800"
          }`}>
            {p}: {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded shadow px-4 py-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: dashboard page with pipeline and stats overview"
```

---

### Task 18: Lead List + Detail Pages

**Files:**
- Create: `frontend/src/pages/LeadListPage.tsx`
- Create: `frontend/src/pages/LeadDetailPage.tsx`

- [ ] **Step 1: Write LeadListPage**

Create `frontend/src/pages/LeadListPage.tsx`:

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
};

export default function LeadListPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", filters],
    queryFn: () => api.leads.list(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Leads</h1>

      <div className="flex gap-3 mb-4 flex-wrap">
        <FilterSelect label="Sport" value={filters.sport} onChange={(v) => setFilters({ ...filters, sport: v })} options={["Football", "Rugby", "Cricket"]} />
        <FilterSelect label="Stage" value={filters.stage} onChange={(v) => setFilters({ ...filters, stage: v })} options={["discovered", "enriched", "qualified", "ready_for_outreach", "contacted", "replied"]} />
        <FilterSelect label="Priority" value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v })} options={["high", "medium", "low"]} />
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Stadium</th>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads?.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/leads/${lead.id}`} className="text-blue-600 hover:underline">
                    {lead.stadium.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{lead.stadium.club_name ?? "-"}</td>
                <td className="px-4 py-3">{lead.stadium.city ?? "-"}</td>
                <td className="px-4 py-3">{lead.stadium.capacity?.toLocaleString() ?? "-"}</td>
                <td className="px-4 py-3 capitalize">{lead.stage.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  {lead.priority && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[lead.priority] ?? ""}`}>
                      {lead.priority}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{lead.score?.toFixed(1) ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads?.length === 0 && <p className="text-gray-400 text-center py-8">No leads found</p>}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value?: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <select
      className="border rounded px-3 py-1.5 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All {label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
```

- [ ] **Step 2: Write LeadDetailPage**

Create `frontend/src/pages/LeadDetailPage.tsx`:

```tsx
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export default function LeadDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api.leads.get(Number(id)),
  });
  const { data: drafts } = useQuery({
    queryKey: ["drafts", id],
    queryFn: () => api.outreach.list({ lead_id: id! }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.leads.update(Number(id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  if (isLoading || !lead) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <Link to="/leads" className="text-blue-600 text-sm hover:underline">&larr; Back to Leads</Link>

      <div className="mt-4 bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold">{lead.stadium.name}</h1>
        <p className="text-gray-500">{lead.stadium.club_name} &middot; {lead.stadium.city} &middot; {lead.stadium.capacity?.toLocaleString()} capacity</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div><span className="text-gray-500">Sport:</span> {lead.stadium.sport}</div>
          <div><span className="text-gray-500">League:</span> {lead.stadium.league ?? "-"}</div>
          <div><span className="text-gray-500">Stage:</span> <span className="capitalize">{lead.stage.replace(/_/g, " ")}</span></div>
          <div><span className="text-gray-500">Score:</span> {lead.score?.toFixed(1) ?? "-"}</div>
          <div><span className="text-gray-500">Priority:</span> {lead.priority ?? "-"}</div>
          <div><span className="text-gray-500">Owner:</span> {lead.owner ?? "Unassigned"}</div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-500 block mb-1">Notes</label>
          <textarea
            className="border rounded w-full p-2 text-sm"
            rows={3}
            defaultValue={lead.notes ?? ""}
            onBlur={(e) => updateMutation.mutate({ notes: e.target.value })}
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-3">Contacts ({lead.contacts.length})</h2>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lead.contacts.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2">{c.name ?? "-"}</td>
                <td className="px-4 py-2">{c.title ?? "-"}</td>
                <td className="px-4 py-2">{c.email ?? "-"}</td>
                <td className="px-4 py-2 capitalize">{c.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-3">Outreach Drafts ({drafts?.length ?? 0})</h2>
      <div className="space-y-3">
        {drafts?.map((d) => (
          <div key={d.id} className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium capitalize">{d.outreach_type.replace(/_/g, " ")}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                d.approval_status === "approved" ? "bg-green-100 text-green-800" :
                d.approval_status === "rejected" ? "bg-red-100 text-red-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>{d.approval_status}</span>
            </div>
            {d.subject && <p className="text-sm text-gray-600 mb-1"><strong>Subject:</strong> {d.subject}</p>}
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{d.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LeadListPage.tsx frontend/src/pages/LeadDetailPage.tsx
git commit -m "feat: lead list page with filters and lead detail page"
```

---

### Task 19: Outreach Approval Queue Page

**Files:**
- Create: `frontend/src/pages/OutreachQueuePage.tsx`

- [ ] **Step 1: Write OutreachQueuePage**

Create `frontend/src/pages/OutreachQueuePage.tsx`:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function OutreachQueuePage() {
  const qc = useQueryClient();
  const { data: drafts, isLoading } = useQuery({
    queryKey: ["outreach-queue"],
    queryFn: () => api.outreach.list({ status: "pending" }),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => api.outreach.approve(id, "admin"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach-queue"] }),
  });
  const rejectMut = useMutation({
    mutationFn: (id: number) => api.outreach.reject(id, "admin"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach-queue"] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Outreach Approval Queue</h1>
      <p className="text-gray-500 mb-6">{drafts?.length ?? 0} pending drafts</p>

      <div className="space-y-4">
        {drafts?.map((d) => (
          <div key={d.id} className="bg-white rounded shadow p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-medium capitalize">{d.outreach_type.replace(/_/g, " ")}</span>
                <span className="text-gray-400 mx-2">&middot;</span>
                <Link to={`/leads/${d.lead_id}`} className="text-blue-600 text-sm hover:underline">
                  Lead #{d.lead_id}
                </Link>
              </div>
              <span className="text-xs text-gray-400">{d.recipient_email}</span>
            </div>

            {d.subject && <p className="text-sm mb-2"><strong>Subject:</strong> {d.subject}</p>}
            <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded mb-4">{d.body}</pre>

            <div className="flex gap-2">
              <button
                onClick={() => approveMut.mutate(d.id)}
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => rejectMut.mutate(d.id)}
                className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {drafts?.length === 0 && (
          <p className="text-gray-400 text-center py-8">No pending drafts - all clear!</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/OutreachQueuePage.tsx
git commit -m "feat: outreach approval queue with approve/reject actions"
```

---

## Phase 8: CLI + Smoke Test (Tasks 20–21)

### Task 20: CLI Entry Point

**Files:**
- Create: `src/solar_sport/cli.py`

- [ ] **Step 1: Write CLI**

Create `src/solar_sport/cli.py`:

```python
import argparse
import asyncio

from solar_sport.config import get_settings
from solar_sport.database import Base, get_engine, get_session_factory
from solar_sport.discovery.wikipedia import fetch_uk_stadiums
from solar_sport.discovery.pipeline import run_discovery
from solar_sport.scoring.engine import score_lead, Priority
from solar_sport.models import Lead, Stadium


def main():
    parser = argparse.ArgumentParser(description="Solar & Sport Engine CLI")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("init-db", help="Create database tables")
    sub.add_parser("discover", help="Run stadium discovery from Wikipedia")
    sub.add_parser("score-all", help="Score all unscored leads")
    sub.add_parser("serve", help="Run the API server")

    args = parser.parse_args()

    if args.command == "init-db":
        settings = get_settings()
        engine = get_engine(settings.DATABASE_URL)
        Base.metadata.create_all(engine)
        print("Database tables created.")

    elif args.command == "discover":
        settings = get_settings()
        engine = get_engine(settings.DATABASE_URL)
        Base.metadata.create_all(engine)
        session = get_session_factory(settings.DATABASE_URL)()

        print("Fetching stadiums from Wikipedia...")
        stadiums = asyncio.run(fetch_uk_stadiums())
        print(f"Found {len(stadiums)} stadiums. Persisting...")
        count = run_discovery(session, stadiums)
        print(f"Added {count} new stadiums.")
        session.close()

    elif args.command == "score-all":
        settings = get_settings()
        session = get_session_factory(settings.DATABASE_URL)()

        leads = session.query(Lead).filter(Lead.score.is_(None)).all()
        for lead in leads:
            stadium = session.query(Stadium).get(lead.stadium_id)
            data = {
                "capacity": stadium.capacity or 0,
                "is_professional": bool(stadium.league),
                "has_partnerships": bool(stadium.hospitality_url),
                "has_sustainability": bool(stadium.sustainability_url),
                "is_multi_use": False,
                "contact_count": len(lead.contacts),
                "has_sponsors": False,
            }
            result = score_lead(data)
            lead.score = result["score"]
            lead.priority = result["priority"].value

        session.commit()
        print(f"Scored {len(leads)} leads.")
        session.close()

    elif args.command == "serve":
        import uvicorn
        uvicorn.run("solar_sport.api.app:app", host="0.0.0.0", port=8000, reload=True)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify CLI runs**

Run: `python -m solar_sport.cli --help`
Expected: Shows help with init-db, discover, score-all, serve commands

- [ ] **Step 3: Commit**

```bash
git add src/solar_sport/cli.py
git commit -m "feat: CLI with init-db, discover, score-all, and serve commands"
```

---

### Task 21: End-to-End Smoke Test

**Files:**
- Create: `tests/test_e2e.py`

- [ ] **Step 1: Write e2e test**

Create `tests/test_e2e.py`:

```python
"""End-to-end smoke test: discovery → enrichment → scoring → outreach → API."""
from fastapi.testclient import TestClient

from solar_sport.api.app import create_app
from solar_sport.api.deps import get_db
from solar_sport.discovery.pipeline import run_discovery
from solar_sport.enrichment.pipeline import enrich_lead_from_data
from solar_sport.scoring.engine import score_lead
from solar_sport.outreach.generator import generate_drafts
from solar_sport.models import Lead, Stadium, OutreachDraft


def test_full_pipeline(db_session):
    # 1. Discovery
    stadium_data = [
        {"name": "Wembley Stadium", "club_name": "England", "city": "London",
         "capacity": 90000, "sport": "Football", "league": "N/A", "country": "United Kingdom"},
    ]
    count = run_discovery(db_session, stadium_data)
    assert count == 1

    # 2. Enrichment
    lead = db_session.query(Lead).first()
    enrich_lead_from_data(
        db_session, lead.id,
        emails=["partnerships@wembley.com", "commercial@wembley.com"],
        contact_page_url="https://wembley.com/contact",
    )
    assert lead.stage == "enriched"
    assert len(lead.contacts) == 2

    # 3. Scoring
    stadium = db_session.query(Stadium).first()
    result = score_lead({
        "capacity": stadium.capacity, "is_professional": True,
        "has_partnerships": True, "has_sustainability": False,
        "is_multi_use": True, "contact_count": len(lead.contacts), "has_sponsors": True,
    })
    lead.score = result["score"]
    lead.priority = result["priority"].value
    lead.stage = "qualified"
    db_session.commit()
    assert lead.priority == "high"

    # 4. Outreach generation
    drafts = generate_drafts({
        "stadium_name": stadium.name, "club_name": stadium.club_name,
        "capacity": stadium.capacity, "league": stadium.league,
        "contact_name": None, "contact_email": "partnerships@wembley.com",
        "sustainability_angle": None, "commercial_angle": "extensive sponsor portfolio",
    })
    assert len(drafts) == 5

    for d in drafts:
        db_session.add(OutreachDraft(
            lead_id=lead.id, outreach_type=d["outreach_type"],
            subject=d["subject"], body=d["body"], recipient_email=d["recipient_email"],
        ))
    db_session.commit()

    # 5. API
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    client = TestClient(app)

    resp = client.get("/api/leads/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = client.get("/api/dashboard/")
    assert resp.status_code == 200
    assert resp.json()["total_leads"] == 1

    resp = client.get("/api/outreach/", params={"status": "pending"})
    assert resp.status_code == 200
    assert len(resp.json()) == 5

    # Approve first draft
    draft_id = resp.json()[0]["id"]
    resp = client.post(
        f"/api/outreach/{draft_id}/approve",
        json={"status": "approved", "approved_by": "admin"},
    )
    assert resp.status_code == 200
    assert resp.json()["approval_status"] == "approved"
```

- [ ] **Step 2: Run all tests**

Run: `pytest -v`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/test_e2e.py
git commit -m "feat: end-to-end smoke test covering full pipeline"
```

---

## Summary

| Phase | Tasks | What it builds |
|-------|-------|---------------|
| 1. Foundation | 1–3 | Config, DB models, schemas |
| 2. Discovery | 4–5 | Wikipedia scraper + pipeline |
| 3. Enrichment | 6–7 | Contact scraper + pipeline |
| 4. Scoring | 8 | Weighted scoring engine |
| 5. Outreach | 9–10 | Templates + draft generator |
| 6. API | 11–14 | FastAPI endpoints for leads, outreach, dashboard |
| 7. Frontend | 15–19 | React dashboard, lead list, detail, approval queue |
| 8. CLI + E2E | 20–21 | CLI entry point + full pipeline smoke test |

**21 tasks total.** Each task is independently testable and committable.
