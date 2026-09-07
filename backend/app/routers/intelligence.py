from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict

from app.database import get_db
from app.models.entities import Project, User, Task, TaskDependency, WorkEvent, UserSkill, SystemSettings, ProjectMember
from app.schemas.dtos import (
    MemberWorkload, BottleneckItem, RecommendationItem, DependencyGraphData, GraphNode, GraphEdge
)
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

@router.get("/workload", response_model=List[MemberWorkload])
def get_workload_breakdown(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    settings = get_settings(db)
    users = db.query(User).all()
    project_member_ids = {m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()} if project_id else set()

    # Filter tasks & events
    if project_id:
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        events = db.query(WorkEvent).filter(
            (WorkEvent.project_id == project_id) | (WorkEvent.project_id.is_(None))
        ).all()
    else:
        tasks = db.query(Task).all()
        events = db.query(WorkEvent).all()

    results = []
    for u in users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_events = [e for e in events if e.user_id == u.id]

        # If project_id is specified, include members who are in ProjectMember, have tasks, or logged events in this project
        if project_id and (u.id not in project_member_ids) and not u_tasks and not any(e.project_id == project_id for e in u_events):
            continue

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
    db: Session = Depends(get_db)
):
    settings = get_settings(db)
    users = db.query(User).all()

    if project_id:
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        task_ids = {t.id for t in tasks}
        dependencies = db.query(TaskDependency).filter(
            TaskDependency.blocking_task_id.in_(task_ids),
            TaskDependency.dependent_task_id.in_(task_ids)
        ).all() if task_ids else []
        events = db.query(WorkEvent).filter(
            (WorkEvent.project_id == project_id) | (WorkEvent.project_id.is_(None))
        ).all()
    else:
        tasks = db.query(Task).all()
        dependencies = db.query(TaskDependency).all()
        events = db.query(WorkEvent).all()

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
    db: Session = Depends(get_db)
):
    settings = get_settings(db)
    users = db.query(User).all()
    project_member_ids = {m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()} if project_id else set()

    if project_id:
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        task_ids = {t.id for t in tasks}
        dependencies = db.query(TaskDependency).filter(
            TaskDependency.blocking_task_id.in_(task_ids),
            TaskDependency.dependent_task_id.in_(task_ids)
        ).all() if task_ids else []
        events = db.query(WorkEvent).filter(
            (WorkEvent.project_id == project_id) | (WorkEvent.project_id.is_(None))
        ).all()
    else:
        tasks = db.query(Task).all()
        dependencies = db.query(TaskDependency).all()
        events = db.query(WorkEvent).all()

    member_workloads = {}
    for u in users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_events = [e for e in events if e.user_id == u.id]
        if project_id and (u.id not in project_member_ids) and not u_tasks and not any(e.project_id == project_id for e in u_events):
            continue
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
    db: Session = Depends(get_db)
):
    settings = get_settings(db)
    users = db.query(User).all()
    user_skills = db.query(UserSkill).all()

    if project_id:
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        task_ids = {t.id for t in tasks}
        dependencies = db.query(TaskDependency).filter(
            TaskDependency.blocking_task_id.in_(task_ids),
            TaskDependency.dependent_task_id.in_(task_ids)
        ).all() if task_ids else []
        events = db.query(WorkEvent).filter(
            (WorkEvent.project_id == project_id) | (WorkEvent.project_id.is_(None))
        ).all()
        project_member_ids = {m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()}
        task_assignee_ids = {t.assignee_id for t in tasks if t.assignee_id}
        project_user_ids = project_member_ids | task_assignee_ids
        target_users = [u for u in users if u.id in project_user_ids] if project_user_ids else users
    else:
        tasks = db.query(Task).all()
        dependencies = db.query(TaskDependency).all()
        events = db.query(WorkEvent).all()
        target_users = users

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
    db: Session = Depends(get_db)
):
    if project_id:
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        task_ids = {t.id for t in tasks}
        dependencies = db.query(TaskDependency).filter(
            TaskDependency.blocking_task_id.in_(task_ids),
            TaskDependency.dependent_task_id.in_(task_ids)
        ).all() if task_ids else []
        events = db.query(WorkEvent).filter(
            (WorkEvent.project_id == project_id) | (WorkEvent.project_id.is_(None))
        ).all()
    else:
        tasks = db.query(Task).all()
        dependencies = db.query(TaskDependency).all()
        events = db.query(WorkEvent).all()

    users = db.query(User).all()
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
