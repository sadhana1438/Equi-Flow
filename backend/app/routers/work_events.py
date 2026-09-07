from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.entities import WorkEvent, User
from app.schemas.dtos import WorkEventCreate, WorkEventResponse

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
    db: Session = Depends(get_db)
):
    query = db.query(WorkEvent)
    if user_id:
        query = query.filter(WorkEvent.user_id == user_id)
    if project_id:
        query = query.filter(WorkEvent.project_id == project_id)

    events = query.order_by(WorkEvent.event_timestamp.desc()).all()
    return [map_event_to_response(e) for e in events]

@router.post("", response_model=WorkEventResponse)
def create_work_event(payload: WorkEventCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ts = payload.event_timestamp or datetime.now(timezone.utc)

    event = WorkEvent(
        id=str(uuid.uuid4()),
        user_id=payload.user_id,
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
def delete_work_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(WorkEvent).filter(WorkEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Work event not found")
    db.delete(event)
    db.commit()
    return {"message": "Work event deleted successfully"}
