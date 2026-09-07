from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.entities import Task, WorkEvent, User
from app.intelligence.analytics import compute_historical_analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("")
def get_analytics(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if project_id:
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        events = db.query(WorkEvent).filter(
            (WorkEvent.project_id == project_id) | (WorkEvent.project_id.is_(None))
        ).all()
    else:
        tasks = db.query(Task).all()
        events = db.query(WorkEvent).all()

    users = db.query(User).all()
    return compute_historical_analytics(tasks, events, users)
