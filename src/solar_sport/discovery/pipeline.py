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
