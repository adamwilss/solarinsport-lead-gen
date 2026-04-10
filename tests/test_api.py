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
