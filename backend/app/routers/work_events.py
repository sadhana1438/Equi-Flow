from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.entities import WorkEvent, User
from app.schemas.dtos import WorkEventCreate, WorkEventResponse
from app.security import get_current_user, verify_project_access

router = APIRouter(prefix="/api/work-events", tags=["work-events"])

def map_event_to_response(ev: WorkEvent) -> WorkEventResponse:
    return WorkEventResponse(
        id=ev.id,
        user_id=ev.user_id,
        user_name=ev.user.name if ev.user else None,
        project_id=ev.project_id,
        event_type=ev.event_type,
        estimated_hidden_hours=ev.estimated_hidden_hours,
        context_channel=ev.context_channel,
        event_timestamp=ev.event_timestamp,
        metadata_json=ev.metadata_json,
        created_at=ev.created_at
    )

@router.get("", response_model=List[WorkEventResponse])
def list_work_events(
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(WorkEvent)
    if project_id:
        verify_project_access(project_id, current_user, db)
        query = query.filter(WorkEvent.project_id == project_id)

    if user_id:
        if user_id != current_user.id and not current_user.is_leader:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view another user's work events")
        query = query.filter(WorkEvent.user_id == user_id)
    elif not project_id and not current_user.is_leader:
        query = query.filter(WorkEvent.user_id == current_user.id)

    events = query.order_by(WorkEvent.event_timestamp.desc()).all()
    return [map_event_to_response(e) for e in events]

@router.post("", response_model=WorkEventResponse)
def create_work_event(
    payload: WorkEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_user_id = payload.user_id or current_user.id
    if target_user_id != current_user.id and not current_user.is_leader:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot log work events for another user")

    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.project_id:
        verify_project_access(payload.project_id, current_user, db)

    ts = payload.event_timestamp or datetime.now(timezone.utc)

    event = WorkEvent(
        id=str(uuid.uuid4()),
        user_id=target_user_id,
        project_id=payload.project_id,
        event_type=payload.event_type.upper(),
        estimated_hidden_hours=payload.estimated_hidden_hours,
        context_channel=payload.context_channel,
        event_timestamp=ts,
        metadata_json=payload.metadata_json
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return map_event_to_response(event)

@router.delete("/{event_id}")
def delete_work_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(WorkEvent).filter(WorkEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work event not found")

    if event.user_id != current_user.id and not current_user.is_leader:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this work event")

    db.delete(event)
    db.commit()
    return {"message": "Work event deleted successfully"}
