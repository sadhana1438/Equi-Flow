from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.entities import User, Task, TaskDependency, WorkEvent, SystemSettings, ProjectMember, Project
from app.security import get_current_user
from app.intelligence.workload import compute_member_workload
from app.intelligence.bottleneck import detect_bottlenecks
from app.intelligence.risk import calculate_project_risks_and_health

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("", response_model=List[Dict])
def get_dynamic_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.is_leader:
        tasks = db.query(Task).all()
        dependencies = db.query(TaskDependency).all()
        events = db.query(WorkEvent).all()
        users = db.query(User).all()
    else:
        user_projects = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).subquery()
        tasks = db.query(Task).filter(Task.project_id.in_(user_projects)).all()
        task_ids = {t.id for t in tasks}
        dependencies = db.query(TaskDependency).filter(
            TaskDependency.blocking_task_id.in_(task_ids),
            TaskDependency.dependent_task_id.in_(task_ids)
        ).all() if task_ids else []
        events = db.query(WorkEvent).filter(WorkEvent.project_id.in_(user_projects)).all()
        users = [current_user]

    if not users and not tasks:
        return []

    settings = db.query(SystemSettings).first()
    healthy_th = settings.healthy_threshold if settings else 0.8
    near_th = settings.near_capacity_threshold if settings else 1.0

    member_workloads = {}
    for u in users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_events = [e for e in events if e.user_id == u.id]
        member_workloads[u.id] = compute_member_workload(
            u, u_tasks, u_events,
            healthy_threshold=healthy_th,
            near_capacity_threshold=near_th
        )

    bottlenecks = detect_bottlenecks(tasks, dependencies, member_workloads)
    risks = calculate_project_risks_and_health(tasks, dependencies, member_workloads, bottlenecks)

    notifications = []
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # 1. Bottleneck notifications
    for b in bottlenecks[:2]:
        notifications.append({
            "id": str(uuid.uuid4()),
            "type": "BOTTLENECK_DETECTED",
            "severity": "CRITICAL" if b["severity_score"] > 2.0 else "WARNING",
            "title": f"Critical Bottleneck: {b['task_title']}",
            "message": f"Assigned to {b['assignee_name']} ({int(b['workload_percentage'])}% workload). Blocks {b['blocking_tasks_count']} downstream task(s).",
            "timestamp": now_str,
            "action_link": "/bottlenecks"
        })

    # 2. Overload notifications
    for u_id, wl in member_workloads.items():
        if wl["status"] == "OVERLOADED":
            notifications.append({
                "id": str(uuid.uuid4()),
                "type": "WORKLOAD_OVERLOAD",
                "severity": "WARNING",
                "title": f"Capacity Overload: {wl['user_name']}",
                "message": f"Operating at {int(wl['total_workload']*100)}% capacity with {wl['hidden_work']:.1f}h hidden work.",
                "timestamp": now_str,
                "action_link": "/workload"
            })
        elif wl["no_task_capacity"]:
            notifications.append({
                "id": str(uuid.uuid4()),
                "type": "ZERO_CAPACITY",
                "severity": "WARNING",
                "title": f"No Task Capacity: {wl['user_name']}",
                "message": f"{wl['meetings']:.1f}h of meetings consumes full daily schedule today.",
                "timestamp": now_str,
                "action_link": "/workload"
            })

    # 3. Delay risk notification
    if risks["delay_risk"] >= 50.0:
        notifications.append({
            "id": str(uuid.uuid4()),
            "type": "HIGH_DELAY_RISK",
            "severity": "CRITICAL" if risks["delay_risk"] >= 75.0 else "WARNING",
            "title": f"Elevated Project Delay Risk ({risks['delay_risk']}%)",
            "message": f"Project health dropped to '{risks['health']}' due to critical path delays and unmitigated bottleneck dependencies.",
            "timestamp": now_str,
            "action_link": "/dashboard"
        })

    return notifications
