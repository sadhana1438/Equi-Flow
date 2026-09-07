from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.entities import Project, User, Task, TaskDependency, WorkEvent, UserSkill, SystemSettings, ProjectMember
from app.schemas.dtos import (
    MemberWorkload, BottleneckItem, RecommendationItem, DependencyGraphData, GraphNode, GraphEdge
)
from app.security import get_current_user, verify_project_access
from app.intelligence.workload import compute_member_workload
from app.intelligence.graph import build_dependency_digraph, get_downstream_impact
from app.intelligence.bottleneck import detect_bottlenecks
from app.intelligence.risk import calculate_project_risks_and_health
from app.intelligence.recommendation import generate_recommendations

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

def get_settings(db: Session) -> SystemSettings:
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings(
            id="default",
            healthy_threshold=0.8,
            near_capacity_threshold=1.0,
            default_capacity=8.0,
            raw_retention_days=90,
            theme="dark"
        )
        db.add(settings)
        db.commit()
    return settings

def get_authorized_project_ids(current_user: User, project_id: Optional[str], db: Session) -> List[str]:
    if project_id:
        verify_project_access(project_id, current_user, db)
        return [project_id]
    return [m.project_id for m in db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).all()]

@router.get("/workload", response_model=List[MemberWorkload])
def get_workload_breakdown(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = get_settings(db)
    auth_project_ids = get_authorized_project_ids(current_user, project_id, db)
    
    if not auth_project_ids:
        return []

    project_member_ids = {
        m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id.in_(auth_project_ids)).all()
    }
    
    tasks = db.query(Task).filter(Task.project_id.in_(auth_project_ids)).all()
    task_assignee_ids = {t.assignee_id for t in tasks if t.assignee_id}
    relevant_user_ids = project_member_ids | task_assignee_ids
    if not relevant_user_ids:
        return []

    window_start = datetime.now(timezone.utc) - timedelta(hours=24)
    events = db.query(WorkEvent).filter(
        WorkEvent.event_timestamp >= window_start,
        (
            (WorkEvent.project_id.in_(auth_project_ids)) | 
            ((WorkEvent.project_id.is_(None)) & (WorkEvent.user_id.in_(relevant_user_ids)))
        )
    ).all()

    users = db.query(User).filter(User.id.in_(relevant_user_ids)).all()

    results = []
    for u in users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_events = [e for e in events if e.user_id == u.id]

        wl_dict = compute_member_workload(
            u,
            u_tasks,
            u_events,
            healthy_threshold=settings.healthy_threshold,
            near_capacity_threshold=settings.near_capacity_threshold
        )
        results.append(MemberWorkload(**wl_dict))

    # Sort descending by total workload
    results.sort(key=lambda x: x.total_workload, reverse=True)
    return results

@router.get("/bottlenecks", response_model=List[BottleneckItem])
def get_bottlenecks(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = get_settings(db)
    auth_project_ids = get_authorized_project_ids(current_user, project_id, db)
    if not auth_project_ids:
        return []

    tasks = db.query(Task).filter(Task.project_id.in_(auth_project_ids)).all()
    task_ids = {t.id for t in tasks}
    dependencies = db.query(TaskDependency).filter(
        TaskDependency.blocking_task_id.in_(task_ids),
        TaskDependency.dependent_task_id.in_(task_ids)
    ).all() if task_ids else []
    
    project_member_ids = {
        m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id.in_(auth_project_ids)).all()
    }
    assignee_ids = {t.assignee_id for t in tasks if t.assignee_id}
    relevant_user_ids = project_member_ids | assignee_ids
    users = db.query(User).filter(User.id.in_(relevant_user_ids)).all() if relevant_user_ids else []

    window_start = datetime.now(timezone.utc) - timedelta(hours=24)
    events = db.query(WorkEvent).filter(
        WorkEvent.event_timestamp >= window_start,
        (
            (WorkEvent.project_id.in_(auth_project_ids)) | 
            ((WorkEvent.project_id.is_(None)) & (WorkEvent.user_id.in_(relevant_user_ids)))
        )
    ).all() if relevant_user_ids else []

    member_workloads = {}
    for u in users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_events = [e for e in events if e.user_id == u.id]
        member_workloads[u.id] = compute_member_workload(
            u, u_tasks, u_events,
            healthy_threshold=settings.healthy_threshold,
            near_capacity_threshold=settings.near_capacity_threshold
        )

    bottlenecks = detect_bottlenecks(tasks, dependencies, member_workloads)
    return [BottleneckItem(**b) for b in bottlenecks]

@router.get("/risks")
def get_risks(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = get_settings(db)
    auth_project_ids = get_authorized_project_ids(current_user, project_id, db)
    if not auth_project_ids:
        return {
            "health": "HEALTHY",
            "overall_workload": 0.0,
            "workload_risk": 0.0,
            "bottleneck_risk": 0.0,
            "dependency_risk": 0.0,
            "deadline_risk": 0.0,
            "delay_risk": 0.0,
            "completion_percentage": 0.0,
            "open_tasks_count": 0,
            "completed_tasks_count": 0,
            "total_tasks_count": 0,
            "risk_factors": []
        }

    tasks = db.query(Task).filter(Task.project_id.in_(auth_project_ids)).all()
    task_ids = {t.id for t in tasks}
    dependencies = db.query(TaskDependency).filter(
        TaskDependency.blocking_task_id.in_(task_ids),
        TaskDependency.dependent_task_id.in_(task_ids)
    ).all() if task_ids else []

    project_member_ids = {
        m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id.in_(auth_project_ids)).all()
    }
    assignee_ids = {t.assignee_id for t in tasks if t.assignee_id}
    relevant_user_ids = project_member_ids | assignee_ids
    users = db.query(User).filter(User.id.in_(relevant_user_ids)).all() if relevant_user_ids else []

    window_start = datetime.now(timezone.utc) - timedelta(hours=24)
    events = db.query(WorkEvent).filter(
        WorkEvent.event_timestamp >= window_start,
        (
            (WorkEvent.project_id.in_(auth_project_ids)) | 
            ((WorkEvent.project_id.is_(None)) & (WorkEvent.user_id.in_(relevant_user_ids)))
        )
    ).all() if relevant_user_ids else []

    member_workloads = {}
    for u in users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_events = [e for e in events if e.user_id == u.id]
        member_workloads[u.id] = compute_member_workload(
            u, u_tasks, u_events,
            healthy_threshold=settings.healthy_threshold,
            near_capacity_threshold=settings.near_capacity_threshold
        )

    bottlenecks = detect_bottlenecks(tasks, dependencies, member_workloads)
    risk_report = calculate_project_risks_and_health(tasks, dependencies, member_workloads, bottlenecks)
    return risk_report

@router.get("/recommendations", response_model=List[RecommendationItem])
def get_recommendations(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = get_settings(db)
    auth_project_ids = get_authorized_project_ids(current_user, project_id, db)
    if not auth_project_ids:
        return []

    tasks = db.query(Task).filter(Task.project_id.in_(auth_project_ids)).all()
    task_ids = {t.id for t in tasks}
    dependencies = db.query(TaskDependency).filter(
        TaskDependency.blocking_task_id.in_(task_ids),
        TaskDependency.dependent_task_id.in_(task_ids)
    ).all() if task_ids else []

    project_member_ids = {
        m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id.in_(auth_project_ids)).all()
    }
    assignee_ids = {t.assignee_id for t in tasks if t.assignee_id}
    relevant_user_ids = project_member_ids | assignee_ids
    target_users = db.query(User).filter(User.id.in_(relevant_user_ids)).all() if relevant_user_ids else []
    user_skills = db.query(UserSkill).filter(UserSkill.user_id.in_(relevant_user_ids)).all() if relevant_user_ids else []

    window_start = datetime.now(timezone.utc) - timedelta(hours=24)
    events = db.query(WorkEvent).filter(
        WorkEvent.event_timestamp >= window_start,
        (
            (WorkEvent.project_id.in_(auth_project_ids)) | 
            ((WorkEvent.project_id.is_(None)) & (WorkEvent.user_id.in_(relevant_user_ids)))
        )
    ).all() if relevant_user_ids else []

    member_workloads = {}
    for u in target_users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_events = [e for e in events if e.user_id == u.id]
        member_workloads[u.id] = compute_member_workload(
            u, u_tasks, u_events,
            healthy_threshold=settings.healthy_threshold,
            near_capacity_threshold=settings.near_capacity_threshold
        )

    bottlenecks = detect_bottlenecks(tasks, dependencies, member_workloads)
    recs = generate_recommendations(
        tasks, dependencies, target_users, user_skills, member_workloads, bottlenecks
    )
    return [RecommendationItem(**r) for r in recs]

@router.get("/graph", response_model=DependencyGraphData)
def get_dependency_graph(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_project_ids = get_authorized_project_ids(current_user, project_id, db)
    if not auth_project_ids:
        return DependencyGraphData(nodes=[], edges=[])

    tasks = db.query(Task).filter(Task.project_id.in_(auth_project_ids)).all()
    task_ids = {t.id for t in tasks}
    dependencies = db.query(TaskDependency).filter(
        TaskDependency.blocking_task_id.in_(task_ids),
        TaskDependency.dependent_task_id.in_(task_ids)
    ).all() if task_ids else []

    project_member_ids = {
        m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id.in_(auth_project_ids)).all()
    }
    assignee_ids = {t.assignee_id for t in tasks if t.assignee_id}
    relevant_user_ids = project_member_ids | assignee_ids
    users = db.query(User).filter(User.id.in_(relevant_user_ids)).all() if relevant_user_ids else []

    events = db.query(WorkEvent).filter(
        (WorkEvent.project_id.in_(auth_project_ids)) | 
        ((WorkEvent.project_id.is_(None)) & (WorkEvent.user_id.in_(relevant_user_ids)))
    ).all() if relevant_user_ids else []

    member_workloads = {}
    for u in users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_events = [e for e in events if e.user_id == u.id]
        member_workloads[u.id] = compute_member_workload(u, u_tasks, u_events)

    bottlenecks = detect_bottlenecks(tasks, dependencies, member_workloads)
    bottleneck_task_ids = {b["task_id"] for b in bottlenecks}

    G = build_dependency_digraph(tasks, dependencies)

    nodes = []
    for t in tasks:
        downstream_count, _ = get_downstream_impact(G, t.id)
        rem = t.remaining_hours if t.remaining_hours is not None else 4.0
        nodes.append(GraphNode(
            id=t.id,
            title=t.title,
            status=t.status,
            priority=t.priority,
            assignee_name=t.assignee.name if t.assignee else "Unassigned",
            remaining_hours=rem,
            is_bottleneck=t.id in bottleneck_task_ids,
            downstream_count=downstream_count
        ))

    edges = []
    for d in dependencies:
        edges.append(GraphEdge(
            id=d.id,
            source=d.blocking_task_id,
            target=d.dependent_task_id,
            confidence=d.confidence,
            dependency_type=d.dependency_type
        ))

    return DependencyGraphData(nodes=nodes, edges=edges)
