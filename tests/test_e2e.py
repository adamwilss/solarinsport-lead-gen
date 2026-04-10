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
