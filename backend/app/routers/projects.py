from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.entities import Project, Task, User, TaskDependency, WorkEvent, ProjectMember
from app.schemas.dtos import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectIntelligenceSummary
)
from app.security import get_current_user, verify_project_access
from app.intelligence.workload import compute_member_workload
from app.intelligence.bottleneck import detect_bottlenecks
from app.intelligence.risk import calculate_project_risks_and_health

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_uid = user_id if (user_id and current_user.is_leader) else current_user.id
    member_proj_ids = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == target_uid).subquery()
    query = db.query(Project).filter(Project.id.in_(member_proj_ids))
    return query.order_by(Project.created_at.desc()).all()

@router.post("", response_model=ProjectResponse)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    creator_id = current_user.id

    project = Project(
        id=str(uuid.uuid4()),
        name=payload.name,
        description=payload.description,
        start_date=payload.start_date,
        target_end_date=payload.target_end_date
    )
    db.add(project)
    db.flush()

    membership = ProjectMember(
        id=str(uuid.uuid4()),
        project_id=project.id,
        user_id=creator_id,
        role_in_project="LEADER"
    )
    db.add(membership)

    # Ensure creator has is_leader set
    if not current_user.is_leader:
        current_user.is_leader = True

    db.commit()
    db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)

    # Check if user is leader of project or global leader
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    if not current_user.is_leader and (not membership or membership.role_in_project != "LEADER"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only project leaders can update project details")

    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    if payload.start_date is not None:
        project.start_date = payload.start_date
    if payload.target_end_date is not None:
        project.target_end_date = payload.target_end_date

    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)

    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    if not current_user.is_leader and (not membership or membership.role_in_project != "LEADER"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only project leaders can delete a project")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

@router.get("/{project_id}/summary", response_model=ProjectIntelligenceSummary)
def get_project_summary(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    task_ids = {t.id for t in tasks}
    deps = db.query(TaskDependency).filter(
        TaskDependency.blocking_task_id.in_(task_ids),
        TaskDependency.dependent_task_id.in_(task_ids)
    ).all() if task_ids else []

    # Get assignees in this project
    assignee_ids = {t.assignee_id for t in tasks if t.assignee_id}
    members = db.query(User).filter(User.id.in_(assignee_ids)).all() if assignee_ids else []
    events = db.query(WorkEvent).filter(
        (WorkEvent.project_id == project_id) | (WorkEvent.user_id.in_(assignee_ids))
    ).all() if assignee_ids else []

    # Compute member workloads
    member_workloads = {}
    for member in members:
        m_tasks = [t for t in tasks if t.assignee_id == member.id]
        m_events = [e for e in events if e.user_id == member.id]
        member_workloads[member.id] = compute_member_workload(member, m_tasks, m_events)

    bottlenecks = detect_bottlenecks(tasks, deps, member_workloads)
    risk_info = calculate_project_risks_and_health(tasks, deps, member_workloads, bottlenecks)

    total_hidden = sum(w["hidden_work"] for w in member_workloads.values())

    return ProjectIntelligenceSummary(
        project_id=project.id,
        project_name=project.name,
        health=risk_info["health"],
        overall_workload=risk_info["overall_workload"],
        total_hidden_work=round(total_hidden, 1),
        bottleneck_count=len(bottlenecks),
        delay_risk=risk_info["delay_risk"],
        completion_percentage=risk_info["completion_percentage"],
        active_members_count=len(members),
        open_tasks_count=risk_info["open_tasks_count"],
        completed_tasks_count=risk_info["completed_tasks_count"]
    )
