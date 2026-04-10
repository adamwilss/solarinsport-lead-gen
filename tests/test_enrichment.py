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
