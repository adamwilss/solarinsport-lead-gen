from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from solar_sport.api.deps import get_db
from solar_sport.models import Lead, OutreachDraft, PipelineStage
from solar_sport.schemas import DashboardData, PipelineStats

router = APIRouter()


@router.get("/", response_model=DashboardData)
def get_dashboard(db: Session = Depends(get_db)):
    total_leads = db.query(Lead).count()

    pipeline_rows = (
        db.query(Lead.stage, func.count(Lead.id))
        .group_by(Lead.stage)
        .all()
    )
    pipeline = [PipelineStats(stage=stage, count=count) for stage, count in pipeline_rows]

    priority_rows = (
        db.query(Lead.priority, func.count(Lead.id))
        .filter(Lead.priority.isnot(None))
        .group_by(Lead.priority)
        .all()
    )
    leads_by_priority = {p: c for p, c in priority_rows}

    outreach_pending = (
        db.query(OutreachDraft).filter(OutreachDraft.approval_status == "pending").count()
    )
    outreach_sent = (
        db.query(OutreachDraft).filter(OutreachDraft.approval_status == "sent").count()
    )

    replied_count = db.query(Lead).filter(Lead.stage == PipelineStage.REPLIED.value).count()
    contacted_count = db.query(Lead).filter(Lead.stage == PipelineStage.CONTACTED.value).count()
    reply_rate = (replied_count / contacted_count * 100) if contacted_count > 0 else 0.0

    return DashboardData(
        total_leads=total_leads,
        pipeline=pipeline,
        leads_by_priority=leads_by_priority,
        outreach_pending=outreach_pending,
        outreach_sent=outreach_sent,
        reply_rate=reply_rate,
    )
