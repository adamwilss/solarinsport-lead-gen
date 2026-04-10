# Solar & Sport Stadium Outreach Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stadium prospecting and outreach engine that discovers UK sports venues, enriches contacts, scores leads, generates personalized email drafts, and provides a CRM-style dashboard with manual approval before sending.

**Architecture:** Python FastAPI backend with SQLite (via SQLAlchemy) for data persistence. Discovery pipeline scrapes Wikipedia stadium lists and club websites. Scoring engine applies configurable weighted criteria. Outreach drafts use Jinja2 templates with per-lead personalization. React (Vite + TypeScript + Tailwind) frontend provides the CRM dashboard with filtering, pipeline view, and outreach approval queue.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, httpx, BeautifulSoup4, Jinja2, Pydantic v2, pytest | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query

---

## File Structure

```
solar-sport-engine/
├── pyproject.toml                    # Project config, dependencies, scripts
├── .env.example                      # Environment variable template
├── src/
│   └── solar_sport/
│       ├── __init__.py
│       ├── config.py                 # Settings from env vars (Pydantic BaseSettings)
│       ├── database.py               # SQLite engine, session factory
│       ├── models.py                 # SQLAlchemy ORM models (Stadium, Contact, Lead, OutreachDraft)
│       ├── schemas.py                # Pydantic request/response schemas
│       ├── discovery/
│       │   ├── __init__.py
│       │   ├── wikipedia.py          # Scrape Wikipedia UK stadium lists
│       │   └── pipeline.py           # Orchestrate discovery, dedup, persist
│       ├── enrichment/
│       │   ├── __init__.py
│       │   ├── scraper.py            # Scrape club websites for contacts
│       │   └── pipeline.py           # Orchestrate enrichment for discovered stadiums
│       ├── scoring/
│       │   ├── __init__.py
│       │   └── engine.py             # Weighted scoring with configurable weights
│       ├── outreach/
│       │   ├── __init__.py
│       │   ├── templates.py          # Jinja2 email/LinkedIn/call templates
│       │   └── generator.py          # Generate personalized drafts per lead
│       └── api/
│           ├── __init__.py
│           ├── app.py                # FastAPI app factory, CORS, lifespan
│           ├── leads.py              # Lead CRUD + filter endpoints
│           ├── outreach.py           # Outreach draft + approval endpoints
│           └── dashboard.py          # Pipeline stats + dashboard data
├── templates/
│   ├── cold_email.jinja2             # First touch email template
│   ├── followup_1.jinja2             # Follow-up 1 template
│   ├── followup_2.jinja2             # Follow-up 2 template
│   ├── linkedin_message.jinja2       # LinkedIn message template
│   └── call_script.jinja2            # Call opener / voicemail script
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                   # Router setup
│       ├── api/
│       │   └── client.ts             # Typed fetch wrapper for backend API
│       ├── pages/
│       │   ├── LeadListPage.tsx      # Filterable lead table
│       │   ├── LeadDetailPage.tsx    # Single lead with contacts + outreach
│       │   ├── OutreachQueuePage.tsx  # Approval queue for pending drafts
│       │   └── DashboardPage.tsx     # Pipeline + metrics overview
│       └── components/
│           ├── LeadTable.tsx         # Sortable, paginated table
│           ├── LeadFilters.tsx       # Filter sidebar
│           ├── PipelineBoard.tsx     # Kanban-style pipeline view
│           ├── OutreachCard.tsx      # Draft preview + approve/reject
│           ├── ScoreBadge.tsx        # Color-coded priority badge
│           └── Layout.tsx            # Shell with nav
└── tests/
    ├── conftest.py                   # Fixtures: in-memory DB, test client
    ├── test_models.py                # Model creation + constraints
    ├── test_discovery.py             # Wikipedia parser tests
    ├── test_enrichment.py            # Contact scraper tests
    ├── test_scoring.py               # Scoring engine tests
    ├── test_outreach.py              # Template rendering tests
    └── test_api.py                   # API endpoint tests
```

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `src/solar_sport/__init__.py`

- [ ] **Step 1: Create `pyproject.toml`**

```toml
[project]
name = "solar-sport-engine"
version = "0.1.0"
description = "Stadium prospecting and outreach engine for Solar & Sport"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy>=2.0.30",
    "pydantic>=2.7.0",
    "pydantic-settings>=2.3.0",
    "httpx>=0.27.0",
    "beautifulsoup4>=4.12.0",
    "jinja2>=3.1.4",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.2.0",
    "pytest-asyncio>=0.23.0",
    "httpx",
]

[project.scripts]
solar-sport = "solar_sport.cli:main"

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.backends._legacy:_Backend"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Create `.env.example`**

```env
DATABASE_URL=sqlite:///solar_sport.db
CORS_ORIGINS=http://localhost:5173
```

- [ ] **Step 3: Create `src/solar_sport/__init__.py`**

```python
"""Solar & Sport Stadium Outreach Engine."""
```

- [ ] **Step 4: Install the project in dev mode**

Run: `pip install -e ".[dev]"`
Expected: Successfully installed solar-sport-engine with all dependencies

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml .env.example src/solar_sport/__init__.py
git commit -m "chore: project scaffolding with dependencies"
```

---

### Task 2: Configuration

**Files:**
- Create: `src/solar_sport/config.py`
- Create: `tests/test_config.py`

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
git add src/solar_sport/config.py tests/test_config.py
git commit -m "feat: add configuration with pydantic-settings"
```

---

### Task 3: Database and Models

**Files:**
- Create: `src/solar_sport/database.py`
- Create: `src/solar_sport/models.py`
- Create: `tests/conftest.py`
- Create: `tests/test_models.py`

- [ ] **Step 1: Write `src/solar_sport/database.py`**

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

- [ ] **Step 2: Write `src/solar_sport/models.py`**

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
    tags: Mapped[str | None] = mapped_column(Text)  # comma-separated for V1
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

- [ ] **Step 3: Write test fixtures in `tests/conftest.py`**

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

- [ ] **Step 4: Write model tests in `tests/test_models.py`**

```python
from solar_sport.models import (
    Stadium,
    Lead,
    Contact,
    OutreachDraft,
    PipelineStage,
    ApprovalStatus,
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
        lead_id=lead.id,
        name="John Smith",
        title="Head of Partnerships",
        email="john@liverpoolfc.com",
        source="club_website",
    )
    db_session.add(contact)
    db_session.commit()

    result = db_session.query(Contact).first()
    assert result.lead.stadium.name == "Anfield"
    assert result.title == "Head of Partnerships"


def test_create_outreach_draft(db_session):
    stadium = Stadium(name="Emirates Stadium", club_name="Arsenal")
    db_session.add(stadium)
    db_session.flush()

    lead = Lead(stadium_id=stadium.id)
    db_session.add(lead)
    db_session.flush()

    draft = OutreachDraft(
        lead_id=lead.id,
        outreach_type="cold_email",
        subject="Solar partnership opportunity",
        body="Dear Arsenal team...",
    )
    db_session.add(draft)
    db_session.commit()

    result = db_session.query(OutreachDraft).first()
    assert result.approval_status == ApprovalStatus.PENDING.value
    assert result.lead.stadium.club_name == "Arsenal"


def test_pipeline_stages_exist():
    stages = [s.value for s in PipelineStage]
    assert "discovered" in stages
    assert "closed_won" in stages
    assert len(stages) == 10
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_models.py -v`
Expected: 5 passed

- [ ] **Step 6: Commit**

```bash
git add src/solar_sport/database.py src/solar_sport/models.py tests/conftest.py tests/test_models.py
git commit -m "feat: database engine and ORM models for stadiums, leads, contacts, drafts"
```

---

### Task 4: Pydantic Schemas

**Files:**
- Create: `src/solar_sport/schemas.py`

- [ ] **Step 1: Write schemas**

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

class OutreachDraftBase(BaseModel):
    outreach_type: str
    subject: str | None = None
    body: str
    recipient_email: str | None = None


class OutreachDraftRead(OutreachDraftBase):
    id: int
    lead_id: int
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

## Phase 2: Stadium Discovery

### Task 5: Wikipedia Scraper

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
    old_trafford = results[1]
    assert old_trafford["capacity"] == 74310


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
        headers = []
        for th in table.find_all("tr")[0].find_all("th"):
            headers.append(th.get_text(strip=True).lower())

        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if len(cells) < len(headers):
                continue

            raw = {}
            for i, header in enumerate(headers):
                raw[header] = cells[i].get_text(strip=True)

            stadium = _normalize_row(raw)
            if stadium and stadium.get("name"):
                results.append(stadium)

    return results


def _normalize_row(raw: dict) -> dict:
    """Map raw Wikipedia column values to our stadium schema."""
    name = raw.get("stadium") or raw.get("ground") or raw.get("name") or ""
    capacity_str = raw.get("capacity", "0")
    capacity = _parse_capacity(capacity_str)

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
    """Extract integer capacity from text like '74,310' or '74310[1]'."""
    cleaned = re.sub(r"[^\d]", "", text.split("[")[0])
    if cleaned:
        return int(cleaned)
    return None


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
                stadiums = parse_stadium_table(resp.text)
                all_stadiums.extend(stadiums)

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

### Task 6: Discovery Pipeline

**Files:**
- Create: `src/solar_sport/discovery/pipeline.py`
- Modify: `tests/test_discovery.py` (add pipeline tests)

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
    data = [
        {"name": "Wembley Stadium", "club_name": "England", "city": "London", "capacity": 90000, "sport": "Football", "league": None, "country": "United Kingdom"},
    ]
    run_discovery(db_session, data)
    run_discovery(db_session, data)
    assert db_session.query(Stadium).count() == 1


def test_run_discovery_creates_lead_in_discovered_stage(db_session):
    data = [
        {"name": "Anfield", "club_name": "Liverpool", "city": "Liverpool", "capacity": 61276, "sport": "Football", "league": "Premier League", "country": "United Kingdom"},
    ]
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
            name=data["name"],
            club_name=data.get("club_name"),
            city=data.get("city"),
            country=data.get("country", "United Kingdom"),
            capacity=data.get("capacity"),
            sport=data.get("sport"),
            league=data.get("league"),
            website=data.get("website"),
        )
        session.add(stadium)
        session.flush()

        lead = Lead(
            stadium_id=stadium.id,
            stage=PipelineStage.DISCOVERED.value,
        )
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

## Phase 3: Contact Enrichment

### Task 7: Contact Scraper

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
    emails = extract_emails(html)
    assert len(emails) == 1


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
    emails = EMAIL_PATTERN.findall(html)
    seen = set()
    unique = []
    for email in emails:
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
            full_url = urljoin(base_url, href)
            results.append({"url": full_url, "text": a_tag.get_text(strip=True)})

    return results


def find_contact_page_url(html: str, base_url: str) -> str | None:
    """Find the most likely contact page URL from the HTML."""
    links = extract_contact_links(html, base_url)
    if not links:
        return None
    # Prefer links with "contact" in URL over others
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

### Task 8: Enrichment Pipeline

**Files:**
- Create: `src/solar_sport/enrichment/pipeline.py`
- Modify: `tests/test_enrichment.py` (add pipeline tests)

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

    enrich_lead_from_data(
        db_session,
        lead.id,
        emails=["info@testfc.com", "partnerships@testfc.com"],
        contact_page_url="https://testfc.com/contact",
    )

    contacts = db_session.query(Contact).filter(Contact.lead_id == lead.id).all()
    assert len(contacts) == 2
    assert contacts[0].email == "info@testfc.com"


def test_enrich_lead_updates_stage(db_session):
    stadium = Stadium(name="Test Stadium 2", club_name="Test FC 2")
    db_session.add(stadium)
    db_session.flush()
    lead = Lead(stadium_id=stadium.id, stage=PipelineStage.DISCOVERED.value)
    db_session.add(lead)
    db_session.commit()

    enrich_lead_from_data(
        db_session,
        lead.id,
        emails=["info@testfc2.com"],
        contact_page_url=None,
    )

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

    contacts = db_session.query(Contact).filter(Contact.lead_id == lead.id).all()
    assert len(contacts) == 1
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
    session: Session,
    lead_id: int,
    emails: list[str],
    contact_page_url: str | None,
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
            lead_id=lead_id,
            email=email,
            contact_page_url=contact_page_url,
            source="website_scrape",
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

## Phase 4: Lead Scoring

### Task 9: Scoring Engine

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
        "capacity": 60000,
        "is_professional": True,
        "has_partnerships": True,
        "has_sustainability": True,
        "is_multi_use": False,
        "contact_count": 3,
        "has_sponsors": True,
    }
    result = score_lead(data)
    assert result["score"] > 70
    assert result["priority"] == Priority.HIGH


def test_score_lead_small_venue_low_score():
    data = {
        "capacity": 2000,
        "is_professional": False,
        "has_partnerships": False,
        "has_sustainability": False,
        "is_multi_use": False,
        "contact_count": 0,
        "has_sponsors": False,
    }
    result = score_lead(data)
    assert result["score"] < 30
    assert result["priority"] == Priority.LOW


def test_score_lead_medium_venue():
    data = {
        "capacity": 15000,
        "is_professional": True,
        "has_partnerships": False,
        "has_sustainability": True,
        "is_multi_use": True,
        "contact_count": 1,
        "has_sponsors": False,
    }
    result = score_lead(data)
    assert 30 <= result["score"] <= 70
    assert result["priority"] == Priority.MEDIUM


def test_score_lead_custom_weights():
    data = {
        "capacity": 5000,
        "is_professional": False,
        "has_partnerships": False,
        "has_sustainability": True,
        "is_multi_use": False,
        "contact_count": 2,
        "has_sponsors": False,
    }
    # Heavily weight sustainability
    weights = {**DEFAULT_WEIGHTS, "has_sustainability": 50}
    result = score_lead(data, weights=weights)
    assert result["score"] > 50


def test_score_lead_returns_all_fields():
    data = {
        "capacity": 30000,
        "is_professional": True,
        "has_partnerships": True,
        "has_sustainability": False,
        "is_multi_use": False,
        "contact_count": 2,
        "has_sponsors": True,
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
    "capacity": 20,           # Max points for venue size
    "is_professional": 15,    # Professional or semi-pro status
    "has_partnerships": 15,   # Evidence of commercial partnerships
    "has_sustainability": 15, # Sustainability or energy initiatives
    "is_multi_use": 10,       # Multi-use venue
    "contact_count": 15,      # Contact quality/quantity
    "has_sponsors": 10,       # Existing sponsor ecosystem
}


def score_lead(data: dict, weights: dict | None = None) -> dict:
    """Score a lead based on weighted criteria. Returns score (0-100) and priority."""
    w = weights or DEFAULT_WEIGHTS
    total = 0.0
    max_possible = sum(w.values())

    # Capacity: scale from 0 to weight based on capacity bands
    capacity = data.get("capacity") or 0
    if capacity >= 40000:
        total += w.get("capacity", 0)
    elif capacity >= 15000:
        total += w.get("capacity", 0) * 0.7
    elif capacity >= 5000:
        total += w.get("capacity", 0) * 0.4
    elif capacity >= 1000:
        total += w.get("capacity", 0) * 0.15
    # else: 0 points

    # Boolean criteria
    for key in ["is_professional", "has_partnerships", "has_sustainability", "is_multi_use", "has_sponsors"]:
        if data.get(key):
            total += w.get(key, 0)

    # Contact count: scale based on number of contacts found
    contact_count = data.get("contact_count", 0)
    if contact_count >= 3:
        total += w.get("contact_count", 0)
    elif contact_count >= 1:
        total += w.get("contact_count", 0) * 0.5

    # Normalize to 0-100
    score = round((total / max_possible) * 100, 1) if max_possible > 0 else 0.0

    # Assign priority band
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

## Phase 5: Outreach Generation

### Task 10: Email Templates

**Files:**
- Create: `src/solar_sport/outreach/__init__.py`
- Create: `src/solar_sport/outreach/templates.py`
- Create: `templates/cold_email.jinja2`
- Create: `templates/followup_1.jinja2`
- Create: `templates/followup_2.jinja2`
- Create: `templates/linkedin_message.jinja2`
- Create: `templates/call_script.jinja2`

- [ ] **Step 1: Create email templates**

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

- [ ] **Step 2: Commit templates**

```bash
git add templates/
git commit -m "feat: jinja2 outreach templates for email, linkedin, and call scripts"
```

---

### Task 11: Outreach Draft Generator

**Files:**
- Create: `src/solar_sport/outreach/templates.py`
- Create: `src/solar_sport/outreach/generator.py`
- Create: `tests/test_outreach.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_outreach.py`:

```python
from solar_sport.outreach.generator import generate_drafts


def test_generate_drafts_returns_all_types():
    lead_data = {
        "stadium_name": "Old Trafford",
        "club_name": "Manchester United",
        "capacity": 74310,
        "league": "Premier League",
        "contact_name": "Sarah Jones",
        "contact_email": "sarah.jones@manutd.com",
        "sustainability_angle": "their carbon reduction pledges",
        "commercial_angle": "extensive sponsor portfolio",
    }
    drafts = generate_drafts(lead_data)
    types = {d["outreach_type"] for d in drafts}
    assert types == {"cold_email", "followup_1", "followup_2", "linkedin", "call_script"}


def test_generate_drafts_personalizes_content():
    lead_data = {
        "stadium_name": "Anfield",
        "club_name": "Liverpool",
        "capacity": 61276,
        "league": "Premier League",
        "contact_name": "James Brown",
        "contact_email": "j.brown@liverpoolfc.com",
        "sustainability_angle": None,
        "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    cold_email = next(d for d in drafts if d["outreach_type"] == "cold_email")
    assert "Anfield" in cold_email["body"]
    assert "Liverpool" in cold_email["body"]
    assert "James Brown" in cold_email["body"]
    assert cold_email["subject"] is not None
    assert cold_email["recipient_email"] == "j.brown@liverpoolfc.com"


def test_generate_drafts_handles_missing_contact_name():
    lead_data = {
        "stadium_name": "Wembley",
        "club_name": "England",
        "capacity": 90000,
        "league": None,
        "contact_name": None,
        "contact_email": "info@wembleystadium.com",
        "sustainability_angle": None,
        "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    cold_email = next(d for d in drafts if d["outreach_type"] == "cold_email")
    assert "Wembley" in cold_email["body"]
    # Should use fallback instead of "None"
    assert "None" not in cold_email["body"]


def test_generate_drafts_linkedin_under_300_chars():
    lead_data = {
        "stadium_name": "Emirates Stadium",
        "club_name": "Arsenal",
        "capacity": 60704,
        "league": "Premier League",
        "contact_name": "Tom White",
        "contact_email": "t.white@arsenal.com",
        "sustainability_angle": None,
        "commercial_angle": None,
    }
    drafts = generate_drafts(lead_data)
    linkedin = next(d for d in drafts if d["outreach_type"] == "linkedin")
    assert len(linkedin["body"]) < 600  # LinkedIn connection messages are short
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_outreach.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the template loader**

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
    """Render a Jinja2 template with the given context."""
    template = _env.get_template(template_name)
    return template.render(**context).strip()
```

- [ ] **Step 4: Write the generator**

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
    """Generate all outreach drafts for a lead. Returns list of draft dicts."""
    drafts = []

    for outreach_type, template_file in TEMPLATE_MAP.items():
        rendered = render_template(template_file, lead_data)

        # Extract subject from email templates (first line after "Subject: ")
        subject = None
        if outreach_type in ("cold_email", "followup_1", "followup_2"):
            lines = rendered.split("\n")
            for line in lines:
                if line.startswith("Subject:"):
                    subject = line.replace("Subject:", "").strip()
                    rendered = "\n".join(
                        l for l in lines if not l.startswith("Subject:")
                    ).strip()
                    break

        drafts.append({
            "outreach_type": outreach_type,
            "subject": subject,
            "body": rendered,
            "recipient_email": lead_data.get("contact_email"),
        })

    return drafts
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_outreach.py -v`
Expected: 4 passed

- [ ] **Step 6: Commit**

```bash
git add src/solar_sport/outreach/ tests/test_outreach.py
git commit -m "feat: outreach draft generator with jinja2 template rendering"
```

---

## Phase 6: API

### Task 12: FastAPI App Setup

**Files:**
- Create: `src/solar_sport/api/__init__.py`
- Create: `src/solar_sport/api/app.py`

- [ ] **Step 1: Write the app factory**

Create `src/solar_sport/api/__init__.py` (empty).

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

- [ ] **Step 2: Commit**

```bash
git add src/solar_sport/api/
git commit -m "feat: fastapi app factory with CORS and router setup"
```

---

### Task 13: Lead API Endpoints

**Files:**
- Create: `src/solar_sport/api/leads.py`
- Create: `tests/test_api.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_api.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from solar_sport.api.app import create_app
from solar_sport.database import Base
from solar_sport.models import Stadium, Lead, Contact, PipelineStage

# -- Fixtures --

@pytest.fixture
def test_app(db_session):
    """Create a test app with the test database session injected."""
    app = create_app()

    # Override the session dependency
    from solar_sport.api import leads, outreach, dashboard

    def override_get_db():
        yield db_session

    for module in [leads, outreach, dashboard]:
        if hasattr(module, "get_db"):
            app.dependency_overrides[module.get_db] = override_get_db

    return app


@pytest.fixture
def client(test_app):
    return TestClient(test_app)


@pytest.fixture
def seeded_db(db_session):
    """Seed database with test data."""
    s1 = Stadium(name="Old Trafford", club_name="Manchester United", city="Manchester", capacity=74310, sport="Football", league="Premier League")
    s2 = Stadium(name="Anfield", club_name="Liverpool", city="Liverpool", capacity=61276, sport="Football", league="Premier League")
    s3 = Stadium(name="Murrayfield", club_name="Scottish Rugby", city="Edinburgh", capacity=67144, sport="Rugby", league="Six Nations")
    db_session.add_all([s1, s2, s3])
    db_session.flush()

    l1 = Lead(stadium_id=s1.id, stage=PipelineStage.ENRICHED.value, score=75.0, priority="high")
    l2 = Lead(stadium_id=s2.id, stage=PipelineStage.DISCOVERED.value, score=60.0, priority="medium")
    l3 = Lead(stadium_id=s3.id, stage=PipelineStage.QUALIFIED.value, score=45.0, priority="medium")
    db_session.add_all([l1, l2, l3])
    db_session.flush()

    c1 = Contact(lead_id=l1.id, name="John Smith", title="Head of Partnerships", email="john@manutd.com")
    db_session.add(c1)
    db_session.commit()
    return db_session


# -- Tests --

def test_list_leads(client, seeded_db):
    resp = client.get("/api/leads/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3


def test_list_leads_filter_by_sport(client, seeded_db):
    resp = client.get("/api/leads/?sport=Rugby")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["stadium"]["sport"] == "Rugby"


def test_list_leads_filter_by_priority(client, seeded_db):
    resp = client.get("/api/leads/?priority=high")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1


def test_list_leads_filter_by_min_capacity(client, seeded_db):
    resp = client.get("/api/leads/?min_capacity=65000")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2  # Old Trafford (74310) + Murrayfield (67144)


def test_get_lead_detail(client, seeded_db):
    resp = client.get("/api/leads/1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["stadium"]["name"] == "Old Trafford"
    assert len(data["contacts"]) == 1


def test_update_lead(client, seeded_db):
    resp = client.patch("/api/leads/1", json={"stage": "qualified", "notes": "Follow up next week"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["stage"] == "qualified"
    assert data["notes"] == "Follow up next week"


def test_get_lead_not_found(client, seeded_db):
    resp = client.get("/api/leads/999")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_api.py::test_list_leads -v`
Expected: FAIL — `ImportError`

- [ ] **Step 3: Write the leads router**

Create `src/solar_sport/api/leads.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from solar_sport.database import get_session_factory
from solar_sport.models import Lead, Stadium
from solar_sport.schemas import LeadRead, LeadUpdate

router = APIRouter()


def get_db():
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


@router.get("/", response_model=list[LeadRead])
def list_leads(
    sport: str | None = Query(None),
    league: str | None = Query(None),
    city: str | None = Query(None),
    country: str | None = Query(None),
    priority: str | None = Query(None),
    stage: str | None = Query(None),
    min_capacity: int | None = Query(None),
    max_capacity: int | None = Query(None),
    owner: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Lead).join(Stadium).options(
        joinedload(Lead.stadium),
        joinedload(Lead.contacts),
    )

    if sport:
        query = query.filter(Stadium.sport == sport)
    if league:
        query = query.filter(Stadium.league == league)
    if city:
        query = query.filter(Stadium.city == city)
    if country:
        query = query.filter(Stadium.country == country)
    if priority:
        query = query.filter(Lead.priority == priority)
    if stage:
        query = query.filter(Lead.stage == stage)
    if min_capacity:
        query = query.filter(Stadium.capacity >= min_capacity)
    if max_capacity:
        query = query.filter(Stadium.capacity <= max_capacity)
    if owner:
        query = query.filter(Lead.owner == owner)

    return query.all()


@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = (
        db.query(Lead)
        .options(joinedload(Lead.stadium), joinedload(Lead.contacts))
        .filter(Lead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadRead)
def update_lead(lead_id: int, updates: LeadUpdate, db: Session = Depends(get_db)):
    lead = (
        db.query(Lead)
        .options(joinedload(Lead.stadium), joinedload(Lead.contacts))
        .filter(Lead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_api.py -v`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/api/leads.py tests/test_api.py
git commit -m "feat: lead API endpoints with filtering, detail, and update"
```

---

### Task 14: Outreach API Endpoints

**Files:**
- Create: `src/solar_sport/api/outreach.py`
- Modify: `tests/test_api.py` (add outreach tests)

- [ ] **Step 1: Write the failing test**

Append to `tests/test_api.py`:

```python
from solar_sport.models import OutreachDraft, ApprovalStatus


@pytest.fixture
def seeded_db_with_drafts(seeded_db):
    """Add outreach drafts to seeded data."""
    draft1 = OutreachDraft(
        lead_id=1,
        outreach_type="cold_email",
        subject="Solar partnership — Old Trafford",
        body="Dear John Smith...",
        recipient_email="john@manutd.com",
        approval_status=ApprovalStatus.PENDING.value,
    )
    draft2 = OutreachDraft(
        lead_id=1,
        outreach_type="followup_1",
        subject="Re: Solar partnership — Old Trafford",
        body="Following up...",
        recipient_email="john@manutd.com",
        approval_status=ApprovalStatus.PENDING.value,
    )
    seeded_db.add_all([draft1, draft2])
    seeded_db.commit()
    return seeded_db


def test_list_pending_drafts(client, seeded_db_with_drafts):
    resp = client.get("/api/outreach/pending")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_approve_draft(client, seeded_db_with_drafts):
    resp = client.post("/api/outreach/1/approve", json={"status": "approved", "approved_by": "admin"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["approval_status"] == "approved"
    assert data["approved_by"] == "admin"


def test_reject_draft(client, seeded_db_with_drafts):
    resp = client.post("/api/outreach/2/approve", json={"status": "rejected", "approved_by": "admin"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["approval_status"] == "rejected"


def test_generate_drafts_for_lead(client, seeded_db):
    resp = client.post("/api/outreach/generate/1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5  # cold_email, followup_1, followup_2, linkedin, call_script
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_api.py::test_list_pending_drafts -v`
Expected: FAIL — `ImportError`

- [ ] **Step 3: Write the outreach router**

Create `src/solar_sport/api/outreach.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from solar_sport.database import get_session_factory
from solar_sport.models import Lead, OutreachDraft, ApprovalStatus, PipelineStage
from solar_sport.schemas import OutreachDraftRead, ApprovalAction
from solar_sport.outreach.generator import generate_drafts

router = APIRouter()


def get_db():
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


@router.get("/pending", response_model=list[OutreachDraftRead])
def list_pending_drafts(db: Session = Depends(get_db)):
    return (
        db.query(OutreachDraft)
        .filter(OutreachDraft.approval_status == ApprovalStatus.PENDING.value)
        .all()
    )


@router.post("/{draft_id}/approve", response_model=OutreachDraftRead)
def approve_or_reject_draft(
    draft_id: int,
    action: ApprovalAction,
    db: Session = Depends(get_db),
):
    draft = db.query(OutreachDraft).filter(OutreachDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if action.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    draft.approval_status = action.status
    draft.approved_by = action.approved_by
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/generate/{lead_id}", response_model=list[OutreachDraftRead])
def generate_drafts_for_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = (
        db.query(Lead)
        .options(joinedload(Lead.stadium), joinedload(Lead.contacts))
        .filter(Lead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Build lead data for template rendering
    contact = lead.contacts[0] if lead.contacts else None
    lead_data = {
        "stadium_name": lead.stadium.name,
        "club_name": lead.stadium.club_name,
        "capacity": lead.stadium.capacity,
        "league": lead.stadium.league,
        "contact_name": contact.name if contact else None,
        "contact_email": contact.email if contact else None,
        "sustainability_angle": None,  # Could be enriched later
        "commercial_angle": None,
    }

    drafts_data = generate_drafts(lead_data)
    created_drafts = []

    for draft_data in drafts_data:
        draft = OutreachDraft(
            lead_id=lead_id,
            outreach_type=draft_data["outreach_type"],
            subject=draft_data["subject"],
            body=draft_data["body"],
            recipient_email=draft_data["recipient_email"],
            approval_status=ApprovalStatus.PENDING.value,
        )
        db.add(draft)
        created_drafts.append(draft)

    lead.stage = PipelineStage.READY_FOR_OUTREACH.value
    db.commit()

    for d in created_drafts:
        db.refresh(d)

    return created_drafts
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_api.py -v`
Expected: 11 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/api/outreach.py tests/test_api.py
git commit -m "feat: outreach API with draft generation, approval, and rejection"
```

---

### Task 15: Dashboard API Endpoints

**Files:**
- Create: `src/solar_sport/api/dashboard.py`
- Modify: `tests/test_api.py` (add dashboard tests)

- [ ] **Step 1: Write the failing test**

Append to `tests/test_api.py`:

```python
def test_dashboard_stats(client, seeded_db_with_drafts):
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_leads"] == 3
    assert data["outreach_pending"] == 2
    assert isinstance(data["pipeline"], list)
    assert isinstance(data["leads_by_priority"], dict)


def test_dashboard_pipeline_breakdown(client, seeded_db):
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    stages = {p["stage"]: p["count"] for p in data["pipeline"]}
    assert stages.get("discovered", 0) >= 1
    assert stages.get("enriched", 0) >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_api.py::test_dashboard_stats -v`
Expected: FAIL — `ImportError`

- [ ] **Step 3: Write the dashboard router**

Create `src/solar_sport/api/dashboard.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from solar_sport.database import get_session_factory
from solar_sport.models import Lead, OutreachDraft, ApprovalStatus, PipelineStage
from solar_sport.schemas import DashboardData, PipelineStats

router = APIRouter()


def get_db():
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


@router.get("/stats", response_model=DashboardData)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_leads = db.query(func.count(Lead.id)).scalar() or 0

    # Pipeline breakdown
    pipeline_rows = (
        db.query(Lead.stage, func.count(Lead.id))
        .group_by(Lead.stage)
        .all()
    )
    pipeline = [PipelineStats(stage=stage, count=count) for stage, count in pipeline_rows]

    # Priority breakdown
    priority_rows = (
        db.query(Lead.priority, func.count(Lead.id))
        .filter(Lead.priority.isnot(None))
        .group_by(Lead.priority)
        .all()
    )
    leads_by_priority = {p: c for p, c in priority_rows}

    # Outreach stats
    outreach_pending = (
        db.query(func.count(OutreachDraft.id))
        .filter(OutreachDraft.approval_status == ApprovalStatus.PENDING.value)
        .scalar() or 0
    )
    outreach_sent = (
        db.query(func.count(OutreachDraft.id))
        .filter(OutreachDraft.approval_status == ApprovalStatus.SENT.value)
        .scalar() or 0
    )

    # Reply rate
    total_contacted = (
        db.query(func.count(Lead.id))
        .filter(Lead.stage.in_([
            PipelineStage.CONTACTED.value,
            PipelineStage.REPLIED.value,
            PipelineStage.MEETING_BOOKED.value,
            PipelineStage.OPPORTUNITY_ACTIVE.value,
            PipelineStage.CLOSED_WON.value,
            PipelineStage.CLOSED_LOST.value,
        ]))
        .scalar() or 0
    )
    total_replied = (
        db.query(func.count(Lead.id))
        .filter(Lead.stage.in_([
            PipelineStage.REPLIED.value,
            PipelineStage.MEETING_BOOKED.value,
            PipelineStage.OPPORTUNITY_ACTIVE.value,
            PipelineStage.CLOSED_WON.value,
        ]))
        .scalar() or 0
    )
    reply_rate = (total_replied / total_contacted * 100) if total_contacted > 0 else 0.0

    return DashboardData(
        total_leads=total_leads,
        pipeline=pipeline,
        leads_by_priority=leads_by_priority,
        outreach_pending=outreach_pending,
        outreach_sent=outreach_sent,
        reply_rate=round(reply_rate, 1),
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_api.py -v`
Expected: 13 passed

- [ ] **Step 5: Commit**

```bash
git add src/solar_sport/api/dashboard.py tests/test_api.py
git commit -m "feat: dashboard API with pipeline stats and outreach metrics"
```

---

## Phase 7: Frontend Dashboard

### Task 16: React App Scaffolding

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

Run from the project root:

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Configure Vite with API proxy**

Overwrite `frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Configure Tailwind**

Replace `frontend/src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Write `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import LeadListPage from "./pages/LeadListPage";
import LeadDetailPage from "./pages/LeadDetailPage";
import OutreachQueuePage from "./pages/OutreachQueuePage";

export default function App() {
  return (
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
  );
}
```

- [ ] **Step 5: Install React Router**

```bash
cd frontend && npm install react-router-dom
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: react frontend scaffolding with vite, tailwind, and routing"
```

---

### Task 17: API Client and Layout

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/ScoreBadge.tsx`

- [ ] **Step 1: Write API client**

Create `frontend/src/api/client.ts`:

```typescript
const BASE = "/api";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Types ---

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
}

export interface Contact {
  id: number;
  lead_id: number;
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  confidence: string;
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

export interface PipelineStats {
  stage: string;
  count: number;
}

export interface DashboardData {
  total_leads: number;
  pipeline: PipelineStats[];
  leads_by_priority: Record<string, number>;
  outreach_pending: number;
  outreach_sent: number;
  reply_rate: number;
}

// --- API Functions ---

export function getLeads(params?: Record<string, string>): Promise<Lead[]> {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchJSON(`/leads/${query}`);
}

export function getLead(id: number): Promise<Lead> {
  return fetchJSON(`/leads/${id}`);
}

export function updateLead(id: number, data: Partial<Lead>): Promise<Lead> {
  return fetchJSON(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getPendingDrafts(): Promise<OutreachDraft[]> {
  return fetchJSON("/outreach/pending");
}

export function approveDraft(id: number, approvedBy: string): Promise<OutreachDraft> {
  return fetchJSON(`/outreach/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ status: "approved", approved_by: approvedBy }),
  });
}

export function rejectDraft(id: number, approvedBy: string): Promise<OutreachDraft> {
  return fetchJSON(`/outreach/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ status: "rejected", approved_by: approvedBy }),
  });
}

export function generateDrafts(leadId: number): Promise<OutreachDraft[]> {
  return fetchJSON(`/outreach/generate/${leadId}`, { method: "POST" });
}

export function getDashboard(): Promise<DashboardData> {
  return fetchJSON("/dashboard/stats");
}
```

- [ ] **Step 2: Write Layout component**

Create `frontend/src/components/Layout.tsx`:

```tsx
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/leads", label: "Leads" },
  { to: "/outreach", label: "Outreach Queue" },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">
            Solar & Sport Engine
          </h1>
          <div className="flex gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Write ScoreBadge component**

Create `frontend/src/components/ScoreBadge.tsx`:

```tsx
const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

interface Props {
  priority: string | null;
  score: number | null;
}

export default function ScoreBadge({ priority, score }: Props) {
  const style = PRIORITY_STYLES[priority ?? ""] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {priority ?? "unscored"}
      {score !== null && <span className="opacity-70">({score})</span>}
    </span>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/ frontend/src/components/Layout.tsx frontend/src/components/ScoreBadge.tsx
git commit -m "feat: api client, layout shell, and score badge component"
```

---

### Task 18: Dashboard Page

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/components/PipelineBoard.tsx`

- [ ] **Step 1: Write PipelineBoard component**

Create `frontend/src/components/PipelineBoard.tsx`:

```tsx
import type { PipelineStats } from "../api/client";

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

const STAGE_ORDER = Object.keys(STAGE_LABELS);

interface Props {
  pipeline: PipelineStats[];
}

export default function PipelineBoard({ pipeline }: Props) {
  const byStage = Object.fromEntries(pipeline.map((p) => [p.stage, p.count]));
  const total = pipeline.reduce((sum, p) => sum + p.count, 0) || 1;

  return (
    <div className="flex gap-2 overflow-x-auto">
      {STAGE_ORDER.map((stage) => {
        const count = byStage[stage] ?? 0;
        const pct = Math.round((count / total) * 100);
        return (
          <div
            key={stage}
            className="flex-1 min-w-[90px] bg-white rounded-lg border border-gray-200 p-3 text-center"
          >
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-xs text-gray-500 mt-1">
              {STAGE_LABELS[stage] ?? stage}
            </div>
            <div className="mt-2 h-1 bg-gray-100 rounded">
              <div
                className="h-1 bg-blue-500 rounded"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write DashboardPage**

Create `frontend/src/pages/DashboardPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { getDashboard, type DashboardData } from "../api/client";
import PipelineBoard from "../components/PipelineBoard";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Total Leads" value={data.total_leads} />
        <KPI label="Pending Drafts" value={data.outreach_pending} />
        <KPI label="Sent" value={data.outreach_sent} />
        <KPI label="Reply Rate" value={`${data.reply_rate}%`} />
      </div>

      {/* Pipeline */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Pipeline</h3>
        <PipelineBoard pipeline={data.pipeline} />
      </div>

      {/* Priority breakdown */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">By Priority</h3>
        <div className="flex gap-4">
          {Object.entries(data.leads_by_priority).map(([priority, count]) => (
            <div key={priority} className="bg-white rounded-lg border p-3 flex-1 text-center">
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs text-gray-500 capitalize">{priority}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/components/PipelineBoard.tsx
git commit -m "feat: dashboard page with KPI cards and pipeline board"
```

---

### Task 19: Lead List Page

**Files:**
- Create: `frontend/src/pages/LeadListPage.tsx`
- Create: `frontend/src/components/LeadTable.tsx`
- Create: `frontend/src/components/LeadFilters.tsx`

- [ ] **Step 1: Write LeadFilters component**

Create `frontend/src/components/LeadFilters.tsx`:

```tsx
interface Filters {
  sport: string;
  league: string;
  priority: string;
  stage: string;
  min_capacity: string;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function LeadFilters({ filters, onChange }: Props) {
  function set(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Filters</h3>

      <FilterSelect
        label="Sport"
        value={filters.sport}
        onChange={(v) => set("sport", v)}
        options={["", "Football", "Rugby", "Cricket"]}
      />
      <FilterSelect
        label="Priority"
        value={filters.priority}
        onChange={(v) => set("priority", v)}
        options={["", "high", "medium", "low"]}
      />
      <FilterSelect
        label="Stage"
        value={filters.stage}
        onChange={(v) => set("stage", v)}
        options={[
          "", "discovered", "enriched", "qualified", "ready_for_outreach",
          "contacted", "replied", "meeting_booked", "opportunity_active",
          "closed_won", "closed_lost",
        ]}
      />
      <div>
        <label className="block text-xs text-gray-500 mb-1">Min Capacity</label>
        <input
          type="number"
          value={filters.min_capacity}
          onChange={(e) => set("min_capacity", e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="e.g. 10000"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">League</label>
        <input
          type="text"
          value={filters.league}
          onChange={(e) => set("league", e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          placeholder="e.g. Premier League"
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || `All ${label}s`}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Write LeadTable component**

Create `frontend/src/components/LeadTable.tsx`:

```tsx
import { Link } from "react-router-dom";
import type { Lead } from "../api/client";
import ScoreBadge from "./ScoreBadge";

interface Props {
  leads: Lead[];
}

export default function LeadTable({ leads }: Props) {
  if (leads.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No leads found.</p>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Stadium</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Club</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">City</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Capacity</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Sport</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Stage</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2">
                <Link
                  to={`/leads/${lead.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {lead.stadium.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-gray-700">{lead.stadium.club_name ?? "—"}</td>
              <td className="px-4 py-2 text-gray-700">{lead.stadium.city ?? "—"}</td>
              <td className="px-4 py-2 text-right text-gray-700">
                {lead.stadium.capacity?.toLocaleString() ?? "—"}
              </td>
              <td className="px-4 py-2 text-gray-700">{lead.stadium.sport ?? "—"}</td>
              <td className="px-4 py-2">
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                  {lead.stage.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-2">
                <ScoreBadge priority={lead.priority} score={lead.score} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Write LeadListPage**

Create `frontend/src/pages/LeadListPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { getLeads, type Lead } from "../api/client";
import LeadTable from "../components/LeadTable";
import LeadFilters from "../components/LeadFilters";

const EMPTY_FILTERS = {
  sport: "",
  league: "",
  priority: "",
  stage: "",
  min_capacity: "",
};

export default function LeadListPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    for (const [key, val] of Object.entries(filters)) {
      if (val) params[key] = val;
    }
    getLeads(params)
      .then(setLeads)
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Leads</h2>
        <span className="text-sm text-gray-500">{leads.length} results</span>
      </div>
      <div className="grid grid-cols-[240px_1fr] gap-4">
        <LeadFilters filters={filters} onChange={setFilters} />
        <div>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : (
            <LeadTable leads={leads} />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LeadListPage.tsx frontend/src/components/LeadTable.tsx frontend/src/components/LeadFilters.tsx
git commit -m "feat: lead list page with filterable table"
```

---

### Task 20: Lead Detail Page

**Files:**
- Create: `frontend/src/pages/LeadDetailPage.tsx`

- [ ] **Step 1: Write LeadDetailPage**

Create `frontend/src/pages/LeadDetailPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getLead, updateLead, generateDrafts, type Lead, type OutreachDraft } from "../api/client";
import ScoreBadge from "../components/ScoreBadge";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    getLead(Number(id)).then((l) => {
      setLead(l);
      setNotes(l.notes ?? "");
    });
  }, [id]);

  async function handleSaveNotes() {
    if (!lead) return;
    const updated = await updateLead(lead.id, { notes });
    setLead(updated);
  }

  async function handleGenerateDrafts() {
    if (!lead) return;
    setGenerating(true);
    const newDrafts = await generateDrafts(lead.id);
    setDrafts(newDrafts);
    setGenerating(false);
    // Refresh lead to get updated stage
    const updated = await getLead(lead.id);
    setLead(updated);
  }

  if (!lead) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <Link to="/leads" className="text-sm text-blue-600 hover:underline">
        &larr; Back to leads
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{lead.stadium.name}</h2>
            <p className="text-gray-600">
              {lead.stadium.club_name}
              {lead.stadium.league && ` — ${lead.stadium.league}`}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {lead.stadium.city}, {lead.stadium.country}
              {lead.stadium.capacity && ` · ${lead.stadium.capacity.toLocaleString()} capacity`}
            </p>
          </div>
          <div className="text-right">
            <ScoreBadge priority={lead.priority} score={lead.score} />
            <p className="text-xs text-gray-500 mt-1">
              Stage: {lead.stage.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Contacts</h3>
        {lead.contacts.length === 0 ? (
          <p className="text-sm text-gray-500">No contacts found yet.</p>
        ) : (
          <div className="space-y-2">
            {lead.contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-4 text-sm">
                <span className="font-medium text-gray-900">{c.name ?? "Unknown"}</span>
                {c.title && <span className="text-gray-500">{c.title}</span>}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">
                    {c.email}
                  </a>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  c.confidence === "high" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {c.confidence}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Notes</h3>
        <textarea
          className="w-full border border-gray-300 rounded p-2 text-sm"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          onClick={handleSaveNotes}
          className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Save Notes
        </button>
      </div>

      {/* Outreach Drafts */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Outreach Drafts</h3>
          <button
            onClick={handleGenerateDrafts}
            disabled={generating}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Drafts"}
          </button>
        </div>
        {drafts.length === 0 ? (
          <p className="text-sm text-gray-500">No drafts generated yet. Click "Generate Drafts" to create outreach.</p>
        ) : (
          <div className="space-y-4">
            {drafts.map((d) => (
              <div key={d.id} className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {d.outreach_type.replace(/_/g, " ")}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    d.approval_status === "approved" ? "bg-green-100 text-green-700" :
                    d.approval_status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {d.approval_status}
                  </span>
                </div>
                {d.subject && (
                  <p className="text-sm font-medium text-gray-900 mb-1">{d.subject}</p>
                )}
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {d.body}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/LeadDetailPage.tsx
git commit -m "feat: lead detail page with contacts, notes, and draft generation"
```

---

### Task 21: Outreach Approval Queue Page

**Files:**
- Create: `frontend/src/pages/OutreachQueuePage.tsx`
- Create: `frontend/src/components/OutreachCard.tsx`

- [ ] **Step 1: Write OutreachCard component**

Create `frontend/src/components/OutreachCard.tsx`:

```tsx
import type { OutreachDraft } from "../api/client";

interface Props {
  draft: OutreachDraft;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export default function OutreachCard({ draft, onApprove, onReject }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase">
            {draft.outreach_type.replace(/_/g, " ")}
          </span>
          {draft.recipient_email && (
            <span className="text-xs text-gray-400 ml-2">
              To: {draft.recipient_email}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">Lead #{draft.lead_id}</span>
      </div>

      {draft.subject && (
        <p className="text-sm font-medium text-gray-900 mb-2">{draft.subject}</p>
      )}

      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded p-3 mb-4 max-h-64 overflow-y-auto">
        {draft.body}
      </pre>

      <div className="flex gap-2">
        <button
          onClick={() => onApprove(draft.id)}
          className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          Approve
        </button>
        <button
          onClick={() => onReject(draft.id)}
          className="px-4 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write OutreachQueuePage**

Create `frontend/src/pages/OutreachQueuePage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { getPendingDrafts, approveDraft, rejectDraft, type OutreachDraft } from "../api/client";
import OutreachCard from "../components/OutreachCard";

export default function OutreachQueuePage() {
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrafts();
  }, []);

  async function loadDrafts() {
    setLoading(true);
    const data = await getPendingDrafts();
    setDrafts(data);
    setLoading(false);
  }

  async function handleApprove(id: number) {
    await approveDraft(id, "admin");
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleReject(id: number) {
    await rejectDraft(id, "admin");
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Outreach Approval Queue</h2>
        <span className="text-sm text-gray-500">{drafts.length} pending</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : drafts.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500">No pending drafts to review.</p>
          <p className="text-sm text-gray-400 mt-1">
            Generate drafts from a lead's detail page to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <OutreachCard
              key={draft.id}
              draft={draft}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/OutreachQueuePage.tsx frontend/src/components/OutreachCard.tsx
git commit -m "feat: outreach approval queue with approve/reject actions"
```

---

## Phase 8: Integration and Run Scripts

### Task 22: CLI Entry Point

**Files:**
- Create: `src/solar_sport/cli.py`

- [ ] **Step 1: Write CLI**

Create `src/solar_sport/cli.py`:

```python
import argparse
import asyncio
import sys

from solar_sport.config import get_settings
from solar_sport.database import Base, get_engine, get_session_factory


def cmd_discover(args):
    """Run stadium discovery from Wikipedia."""
    from solar_sport.discovery.wikipedia import fetch_uk_stadiums
    from solar_sport.discovery.pipeline import run_discovery

    print("Discovering UK stadiums from Wikipedia...")
    stadiums = asyncio.run(fetch_uk_stadiums())
    print(f"Found {len(stadiums)} stadiums from Wikipedia.")

    session = get_session_factory()()
    try:
        count = run_discovery(session, stadiums)
        print(f"Added {count} new stadiums to database.")
    finally:
        session.close()


def cmd_score(args):
    """Score all enriched leads."""
    from solar_sport.models import Lead, PipelineStage
    from solar_sport.scoring.engine import score_lead

    session = get_session_factory()()
    try:
        leads = session.query(Lead).filter(
            Lead.stage.in_([PipelineStage.ENRICHED.value, PipelineStage.DISCOVERED.value])
        ).all()

        for lead in leads:
            data = {
                "capacity": lead.stadium.capacity,
                "is_professional": bool(lead.stadium.league),
                "has_partnerships": bool(lead.stadium.hospitality_url),
                "has_sustainability": bool(lead.stadium.sustainability_url),
                "is_multi_use": False,
                "contact_count": len(lead.contacts),
                "has_sponsors": False,
            }
            result = score_lead(data)
            lead.score = result["score"]
            lead.priority = result["priority"].value
            if lead.stage == PipelineStage.ENRICHED.value:
                lead.stage = PipelineStage.QUALIFIED.value

        session.commit()
        print(f"Scored {len(leads)} leads.")
    finally:
        session.close()


def cmd_serve(args):
    """Start the API server."""
    import uvicorn
    uvicorn.run(
        "solar_sport.api.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


def cmd_init_db(args):
    """Initialize the database tables."""
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    Base.metadata.create_all(engine)
    print(f"Database initialized at {settings.DATABASE_URL}")


def main():
    parser = argparse.ArgumentParser(description="Solar & Sport Engine CLI")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("init-db", help="Initialize database tables")
    sub.add_parser("discover", help="Discover stadiums from Wikipedia")
    sub.add_parser("score", help="Score all enriched leads")

    serve_parser = sub.add_parser("serve", help="Start the API server")
    serve_parser.add_argument("--host", default="0.0.0.0")
    serve_parser.add_argument("--port", type=int, default=8000)
    serve_parser.add_argument("--reload", action="store_true")

    args = parser.parse_args()

    if args.command == "init-db":
        cmd_init_db(args)
    elif args.command == "discover":
        cmd_discover(args)
    elif args.command == "score":
        cmd_score(args)
    elif args.command == "serve":
        cmd_serve(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test CLI help**

Run: `python -m solar_sport.cli --help`
Expected: Shows usage with init-db, discover, score, serve subcommands

- [ ] **Step 3: Commit**

```bash
git add src/solar_sport/cli.py
git commit -m "feat: CLI with discover, score, init-db, and serve commands"
```

---

### Task 23: End-to-End Smoke Test

**Files:**
- Modify: `tests/test_api.py` (add E2E test)

- [ ] **Step 1: Write end-to-end test**

Append to `tests/test_api.py`:

```python
def test_e2e_discover_score_generate(db_session, client):
    """End-to-end: discovery -> scoring -> draft generation."""
    from solar_sport.discovery.pipeline import run_discovery
    from solar_sport.scoring.engine import score_lead
    from solar_sport.models import Lead

    # Step 1: Discover
    stadium_data = [
        {
            "name": "E2E Stadium",
            "club_name": "E2E FC",
            "city": "London",
            "capacity": 50000,
            "sport": "Football",
            "league": "Premier League",
            "country": "United Kingdom",
        },
    ]
    run_discovery(db_session, stadium_data)
    lead = db_session.query(Lead).first()
    assert lead is not None
    assert lead.stage == "discovered"

    # Step 2: Enrich (simulate adding a contact)
    from solar_sport.enrichment.pipeline import enrich_lead_from_data
    enrich_lead_from_data(db_session, lead.id, emails=["contact@e2efc.com"], contact_page_url=None)
    db_session.refresh(lead)
    assert lead.stage == "enriched"

    # Step 3: Score
    result = score_lead({
        "capacity": 50000,
        "is_professional": True,
        "has_partnerships": False,
        "has_sustainability": False,
        "is_multi_use": False,
        "contact_count": 1,
        "has_sponsors": False,
    })
    lead.score = result["score"]
    lead.priority = result["priority"].value
    lead.stage = "qualified"
    db_session.commit()
    assert lead.score > 0

    # Step 4: Generate drafts via API
    resp = client.post(f"/api/outreach/generate/{lead.id}")
    assert resp.status_code == 200
    drafts = resp.json()
    assert len(drafts) == 5

    # Step 5: Approve first draft
    draft_id = drafts[0]["id"]
    resp = client.post(f"/api/outreach/{draft_id}/approve", json={"status": "approved", "approved_by": "tester"})
    assert resp.status_code == 200
    assert resp.json()["approval_status"] == "approved"

    # Step 6: Check dashboard
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_leads"] == 1
    assert data["outreach_pending"] >= 4  # 4 remaining pending
```

- [ ] **Step 2: Run the full test suite**

Run: `pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/test_api.py
git commit -m "test: end-to-end smoke test covering full discovery-to-approval flow"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Foundation | 1–4 | Project setup, config, database models, schemas |
| 2. Discovery | 5–6 | Wikipedia scraper + discovery pipeline |
| 3. Enrichment | 7–8 | Contact scraper + enrichment pipeline |
| 4. Scoring | 9 | Weighted scoring engine with priority bands |
| 5. Outreach | 10–11 | Jinja2 templates + personalized draft generator |
| 6. API | 12–15 | FastAPI with leads, outreach, and dashboard endpoints |
| 7. Frontend | 16–21 | React dashboard with leads, detail, pipeline, approval queue |
| 8. Integration | 22–23 | CLI commands + end-to-end smoke test |

**Total: 23 tasks, ~115 steps**

### Running the system

```bash
# Backend
solar-sport init-db
solar-sport discover
solar-sport score
solar-sport serve --reload

# Frontend (separate terminal)
cd frontend && npm run dev
```

Open http://localhost:5173 to use the dashboard.
