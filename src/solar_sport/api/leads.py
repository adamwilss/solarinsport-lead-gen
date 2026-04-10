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
        .filter(Lead.id == lead_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadRead)
def update_lead(lead_id: int, update: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return (
        db.query(Lead)
        .options(joinedload(Lead.stadium), joinedload(Lead.contacts))
        .filter(Lead.id == lead_id)
        .first()
    )
