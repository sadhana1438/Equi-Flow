from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict

from app.database import get_db
from app.models.entities import Task, TaskDependency, User, UserSkill, WorkEvent, ProjectMember
from app.schemas.dtos import SimulationRequest, SimulationResult
from app.intelligence.simulation import run_what_if_simulation
from app.intelligence.recommendation import get_skill_multiplier

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

@router.post("/simulate", response_model=SimulationResult)
def simulate_reassignment(payload: SimulationRequest, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == payload.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    target_user = db.query(User).filter(User.id == payload.target_assignee_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Fetch context
    project_id = task.project_id
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    task_ids = {t.id for t in tasks}
    dependencies = db.query(TaskDependency).filter(
        TaskDependency.blocking_task_id.in_(task_ids),
        TaskDependency.dependent_task_id.in_(task_ids)
    ).all() if task_ids else []

    project_member_ids = {m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()}
    assignee_ids = {t.assignee_id for t in tasks if t.assignee_id} | project_member_ids | {payload.target_assignee_id}
    members = db.query(User).filter(User.id.in_(assignee_ids)).all()
    user_skills = db.query(UserSkill).filter(UserSkill.user_id.in_(assignee_ids)).all()
    work_events = db.query(WorkEvent).filter(
        (WorkEvent.project_id == project_id) | (WorkEvent.user_id.in_(assignee_ids))
    ).all()

    result = run_what_if_simulation(
        task_id=payload.task_id,
        target_assignee_id=payload.target_assignee_id,
        tasks=tasks,
        dependencies=dependencies,
        members=members,
        user_skills=user_skills,
        work_events=work_events
    )

    return SimulationResult(**result)

@router.post("/apply")
def apply_simulation_change(payload: SimulationRequest, db: Session = Depends(get_db)):
    """
    Applies the simulated change permanently to the production database:
    - Updates task.assignee_id
    - Calculates and applies the simulated remaining hours (adjusted by skill multiplier & handoff penalty)
    - Persists to DB
    """
    task = db.query(Task).filter(Task.id == payload.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    target_user = db.query(User).filter(User.id == payload.target_assignee_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    user_skills = db.query(UserSkill).filter(UserSkill.user_id == payload.target_assignee_id).all()

    # Calculate skill multiplier & handoff
    skill_multiplier, _ = get_skill_multiplier(payload.target_assignee_id, task.required_skill_id, user_skills)
    orig_est = task.estimated_hours or 4.0
    orig_rem = task.remaining_hours if task.remaining_hours is not None else orig_est

    handoff_penalty = max(0.10 * orig_est, 1.0) if task.status == "IN_PROGRESS" else 0.0
    new_remaining = round((orig_rem * skill_multiplier) + handoff_penalty, 2)

    # Update real DB record
    task.assignee_id = payload.target_assignee_id
    task.remaining_hours = new_remaining
    db.commit()
    db.refresh(task)

    return {
        "success": True,
        "message": f"Task '{task.title}' successfully reassigned to {target_user.name}.",
        "task_id": task.id,
        "new_assignee_id": target_user.id,
        "new_assignee_name": target_user.name,
        "new_remaining_hours": task.remaining_hours
    }
