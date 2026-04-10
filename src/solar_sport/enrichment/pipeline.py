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
