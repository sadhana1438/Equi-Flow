from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.database import get_db
from app.models.entities import Task, Project, User, Skill
from app.schemas.dtos import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

def map_task_to_response(task: Task) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        project_id=task.project_id,
        assignee_id=task.assignee_id,
        estimated_hours=task.estimated_hours,
        remaining_hours=task.remaining_hours,
        status=task.status,
        priority=task.priority,
        complexity=task.complexity,
        due_date=task.due_date,
        required_skill_id=task.required_skill_id,
        assignee_name=task.assignee.name if task.assignee else None,
        project_name=task.project.name if task.project else None,
        required_skill_name=task.required_skill.name if task.required_skill else None,
        created_at=task.created_at,
        updated_at=task.updated_at
    )

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    project_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Task)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)

    tasks = query.order_by(Task.created_at.desc()).all()
    return [map_task_to_response(t) for t in tasks]

@router.post("", response_model=TaskResponse)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_id = payload.id if payload.id and payload.id.strip() else f"TASK-{uuid.uuid4().hex[:6].upper()}"
    
    # Check if ID exists
    existing = db.query(Task).filter(Task.id == task_id).first()
    if existing:
        task_id = f"TASK-{uuid.uuid4().hex[:6].upper()}"

    rem_hours = payload.remaining_hours
    if rem_hours is None:
        rem_hours = payload.estimated_hours if payload.estimated_hours is not None else 4.0

    task = Task(
        id=task_id,
        title=payload.title,
        description=payload.description,
        project_id=payload.project_id,
        assignee_id=payload.assignee_id,
        estimated_hours=payload.estimated_hours or 4.0,
        remaining_hours=rem_hours,
        status=payload.status or "TODO",
        priority=payload.priority or "MEDIUM",
        complexity=payload.complexity or "MEDIUM",
        due_date=payload.due_date,
        required_skill_id=payload.required_skill_id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return map_task_to_response(task)

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return map_task_to_response(task)

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.project_id is not None:
        task.project_id = payload.project_id
    if payload.assignee_id is not None:
        task.assignee_id = payload.assignee_id if payload.assignee_id != "" else None
    if payload.estimated_hours is not None:
        task.estimated_hours = payload.estimated_hours
    if payload.remaining_hours is not None:
        task.remaining_hours = payload.remaining_hours
    if payload.status is not None:
        task.status = payload.status
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.complexity is not None:
        task.complexity = payload.complexity
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.required_skill_id is not None:
        task.required_skill_id = payload.required_skill_id if payload.required_skill_id != "" else None

    db.commit()
    db.refresh(task)
    return map_task_to_response(task)

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}
