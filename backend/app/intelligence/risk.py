from typing import List, Dict, Optional
from datetime import datetime, timezone
from app.models.entities import Task, TaskDependency
from app.intelligence.workload import calculate_business_days

def calculate_project_risks_and_health(
    tasks: List[Task],
    dependencies: List[TaskDependency],
    member_workloads: Dict[str, Dict],
    bottlenecks: List[Dict],
    now: Optional[datetime] = None
) -> Dict:
    """
    Dynamically computes workload risk, bottleneck risk, dependency risk, deadline risk,
    composite delay risk (0-100%), and project health state.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    if not tasks and not member_workloads:
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
            "total_tasks_count": 0
        }

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "DONE")
    open_tasks = [t for t in tasks if t.status in ["TODO", "IN_PROGRESS", "IN_REVIEW"]]
    completion_pct = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0, 1)

    # 1. Workload Risk
    total_members = len(member_workloads)
    if total_members > 0:
        avg_workload = sum(w["total_workload"] for w in member_workloads.values()) / total_members
        overloaded_members = sum(1 for w in member_workloads.values() if w["status"] == "OVERLOADED")
        near_capacity_members = sum(1 for w in member_workloads.values() if w["status"] == "NEAR_CAPACITY")
        workload_risk = min(100.0, (overloaded_members * 40.0 + near_capacity_members * 15.0) / max(total_members, 1) * 2.0)
    else:
        avg_workload = 0.0
        workload_risk = 0.0

    # 2. Bottleneck Risk
    if bottlenecks:
        max_severity = max(b["severity_score"] for b in bottlenecks)
        bottleneck_risk = min(100.0, max_severity * 28.0)
    else:
        bottleneck_risk = 0.0

    # 3. Dependency Risk
    blocking_task_ids = {d.blocking_task_id for d in dependencies}
    open_blocking = sum(1 for t in open_tasks if t.id in blocking_task_ids)
    dependency_risk = min(100.0, (open_blocking / max(len(open_tasks), 1)) * 60.0 if open_tasks else 0.0)

    # 4. Deadline Risk
    imminent_urgent_count = 0
    for t in open_tasks:
        if t.due_date:
            b_days = calculate_business_days(now, t.due_date)
            rem = t.remaining_hours if t.remaining_hours is not None else 4.0
            if b_days <= 2 and rem >= 6.0:
                imminent_urgent_count += 1
    deadline_risk = min(100.0, (imminent_urgent_count / max(len(open_tasks), 1)) * 100.0 if open_tasks else 0.0)

    # Composite Delay Risk (0 to 100)
    delay_risk = round(
        0.35 * workload_risk +
        0.35 * bottleneck_risk +
        0.15 * dependency_risk +
        0.15 * deadline_risk,
        1
    )
    delay_risk = min(100.0, max(0.0, delay_risk))

    # Determine Project Health State
    # Healthy, On Track, Warning, At Risk, Critical
    if delay_risk < 20.0 and avg_workload <= 0.8 and not bottlenecks:
        health = "HEALTHY"
    elif delay_risk < 40.0 and avg_workload <= 1.0 and len(bottlenecks) <= 1:
        health = "ON_TRACK"
    elif delay_risk < 65.0:
        health = "WARNING"
    elif delay_risk < 85.0:
        health = "AT_RISK"
    else:
        health = "CRITICAL"

    return {
        "health": health,
        "overall_workload": round(avg_workload, 2),
        "workload_risk": round(workload_risk, 1),
        "bottleneck_risk": round(bottleneck_risk, 1),
        "dependency_risk": round(dependency_risk, 1),
        "deadline_risk": round(deadline_risk, 1),
        "delay_risk": delay_risk,
        "completion_percentage": completion_pct,
        "open_tasks_count": len(open_tasks),
        "completed_tasks_count": completed_tasks,
        "total_tasks_count": total_tasks
    }
