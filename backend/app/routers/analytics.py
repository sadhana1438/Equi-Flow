from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.entities import Task, WorkEvent, User, Project, ProjectMember
from app.security import get_current_user, verify_project_access
from app.intelligence.analytics import compute_historical_analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("")
def get_analytics(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if project_id:
        verify_project_access(project_id, current_user, db)
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        events = db.query(WorkEvent).filter(
            (WorkEvent.project_id == project_id) | (WorkEvent.project_id.is_(None))
        ).all()
        member_ids = {m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()}
        users = db.query(User).filter(User.id.in_(member_ids)).all() if member_ids else db.query(User).all()
    else:
        if current_user.is_leader:
            tasks = db.query(Task).all()
            events = db.query(WorkEvent).all()
            users = db.query(User).all()
        else:
            user_projects = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).subquery()
            tasks = db.query(Task).filter(Task.project_id.in_(user_projects)).all()
            events = db.query(WorkEvent).filter(WorkEvent.project_id.in_(user_projects)).all()
            users = db.query(User).filter(User.id == current_user.id).all()

    return compute_historical_analytics(tasks, events, users)
