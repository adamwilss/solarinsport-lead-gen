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
