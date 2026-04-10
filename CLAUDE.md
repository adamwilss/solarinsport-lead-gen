# CLAUDE.md

## Project: Solar & Sport Stadium Outreach Engine

Stadium prospecting and outreach engine for Solar & Sport. Finds UK sports stadiums, enriches contacts, scores leads, generates personalized outreach drafts, and provides a CRM dashboard with manual approval before sending.

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (SQLite), Pydantic v2, httpx, BeautifulSoup4, Jinja2
- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS 4, TanStack Query
- **Tests:** pytest, pytest-asyncio

## V1 Scope

1. UK stadium discovery (Wikipedia scraping + club websites)
2. Contact enrichment for commercial/facilities roles
3. Weighted lead scoring (configurable)
4. Email draft generation via Jinja2 templates
5. Manual approval before send
6. CRM-style tracking dashboard with filters and pipeline view

## Pipeline Stages

Discovered > Enriched > Qualified > Ready for Outreach > Contacted > Replied > Meeting Booked > Opportunity Active > Closed Won/Lost

## Key Rules

- No generic mass blasting - all outreach personalized from lead data
- Every message editable before send; rate-limited sending
- Human approval required for: top-tier leads, incomplete personalization, low-confidence contacts, senior executive sender identity
- Dedup contacts, respect opt-outs, log all automated actions
- Scoring logic must be transparent and editable

## Commands

```bash
# Backend
solar-sport          # CLI entry point (src/solar_sport/cli.py)
uvicorn solar_sport.api.app:app --reload

# Tests
pytest

# Frontend Development
cd frontend && npm run dev    # Dev server with API proxy
cd frontend && npm run build   # Production build

# Frontend Deployment (Vercel)
cd frontend && vercel --prod   # Deploy to Vercel
```

## Source Layout

```
src/solar_sport/       # Python package root
  config.py            # Pydantic BaseSettings
  database.py          # SQLite engine + sessions
  models.py            # ORM models (Stadium, Contact, Lead, OutreachDraft)
  schemas.py           # Pydantic request/response schemas
  discovery/           # Wikipedia scraper + discovery pipeline
  enrichment/          # Club website scraper + enrichment pipeline
  scoring/engine.py    # Weighted scoring engine
  outreach/            # Jinja2 templates + draft generator
  api/                 # FastAPI app, leads, outreach, dashboard endpoints
  cli.py               # CLI entry point (init-db, discover, score-all, serve)
templates/             # Jinja2 email/LinkedIn/call templates
frontend/              # React + Vite frontend
  src/
    api/               # API client and TypeScript types
    pages/             # Dashboard, Leads, Lead Detail, Outreach Queue
    App.tsx            # Main app with routing
  public/              # Static assets
  vercel.json          # Vercel deployment config
  .env.production      # Production env vars
tests/                 # pytest suite
```

## Frontend Features

- **Dashboard** - Pipeline visualization with progress bars, priority breakdown, stats cards with key metrics
- **Lead List** - Searchable, filterable table with sport/stage/priority filters, quick navigation
- **Lead Detail** - Full lead management (stage, priority, owner, tags), contact display, notes editing, outreach drafts
- **Outreach Queue** - Filterable by status, expandable preview, approve/reject actions

## Frontend Deployment

### Vercel Configuration

The frontend is configured for Vercel deployment with:
- `vercel.json` - Rewrites API calls to backend and SPA routing
- `.env.production` - Set `VITE_API_URL` to your deployed backend URL
- `vite.config.ts` - Development proxy to localhost:8000

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `""` (relative, same domain) |

### Backend API Endpoints

The frontend expects these FastAPI endpoints:
- `GET /api/dashboard/` - Dashboard stats
- `GET /api/leads/?sport=&stage=&priority=` - List/filter leads
- `GET /api/leads/{id}` - Get lead with stadium and contacts
- `PATCH /api/leads/{id}` - Update lead (stage, priority, notes, etc.)
- `GET /api/outreach/?status=&lead_id=` - List outreach drafts
- `POST /api/outreach/{id}/approve` - Approve/reject draft

## Deployment Workflow

1. **Backend**: Deploy FastAPI app to your preferred host (e.g., Railway, Render, Fly.io)
2. **Update**: Set `VITE_API_URL` in `frontend/.env.production` to backend URL
3. **Frontend**: Run `vercel --prod` from `frontend/` directory
4. **CORS**: Ensure backend `CORS_ORIGINS` includes the Vercel frontend domain
