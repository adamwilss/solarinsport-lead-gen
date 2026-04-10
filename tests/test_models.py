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
