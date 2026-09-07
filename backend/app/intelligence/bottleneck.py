from typing import List, Dict, Optional
from datetime import datetime, timezone
from app.models.entities import Task, TaskDependency, User
from app.intelligence.graph import build_dependency_digraph, get_downstream_impact, get_critical_path_tasks
from app.intelligence.workload import calculate_business_days

def detect_bottlenecks(
    tasks: List[Task],
    dependencies: List[TaskDependency],
    member_workloads: Dict[str, Dict],
    now: Optional[datetime] = None
) -> List[Dict]:
    """
    Dynamically identifies bottlenecks based on:
    - Member workload
    - Downstream tasks blocked
    - Critical path presence
    - Task remaining hours vs business days until due
    - Hidden work burden on the assignee
    """
    if now is None:
        now = datetime.now(timezone.utc)

    if not tasks:
        return []

    G = build_dependency_digraph(tasks, dependencies)
    critical_path_nodes = get_critical_path_tasks(G)

    bottlenecks = []

    for task in tasks:
        if task.status not in ["TODO", "IN_PROGRESS", "IN_REVIEW"]:
            continue

        rem_hours = task.remaining_hours if task.remaining_hours is not None else (task.estimated_hours or 4.0)
        downstream_count, downstream_ids = get_downstream_impact(G, task.id)
        is_on_critical_path = task.id in critical_path_nodes

        b_days = 1
        if task.due_date:
            b_days = calculate_business_days(now, task.due_date)

        assignee_wl = member_workloads.get(task.assignee_id) if task.assignee_id else None
        
        # Workload factor
        if assignee_wl:
            workload_val = assignee_wl["total_workload"]
            is_overloaded = workload_val > 1.0
            hidden_work = assignee_wl["hidden_work"]
            meetings = assignee_wl["meetings"]
            assignee_name = assignee_wl["user_name"]
        else:
            workload_val = 0.5
            is_overloaded = False
            hidden_work = 0.0
            meetings = 0.0
            assignee_name = "Unassigned"

        # Dynamic severity scoring
        # A task is a bottleneck if:
        # 1. Assignee is overloaded AND it blocks other tasks
        # 2. Assignee is heavily overloaded (>1.2) with urgent remaining hours
        # 3. Downstream impact is high (>=2) and assignee is near capacity or overloaded
        severity = 0.0
        reasons = []

        workload_ratio = max(workload_val, 0.5)
        downstream_multiplier = 1.0 + (0.35 * downstream_count)
        urgency_factor = min(rem_hours / max(b_days, 1) / 4.0, 3.0)

        # Baseline severity score
        severity = workload_ratio * downstream_multiplier * (1.0 + 0.2 * urgency_factor)
        if is_on_critical_path:
            severity *= 1.25

        # Qualification threshold: severity >= 1.5 or (is_overloaded and downstream_count >= 1)
        if severity >= 1.4 or (is_overloaded and downstream_count >= 1) or (downstream_count >= 3):
            if is_overloaded:
                overload_pct = int(round((workload_val - 1.0) * 100))
                reasons.append(f"Assignee {assignee_name} is operating at {int(round(workload_val * 100))}% capacity ({overload_pct}% over capacity).")
            elif task.assignee_id is None:
                reasons.append("Task is unassigned while blocking dependent work.")

            if downstream_count > 0:
                reasons.append(f"Directly or transitively blocks {downstream_count} downstream task(s) in the dependency chain.")

            if is_on_critical_path:
                reasons.append("Task lies on the project's critical execution path.")

            if hidden_work >= 2.0 or meetings >= 2.0:
                reasons.append(f"Assignee capacity is constrained by {hidden_work:.1f}h hidden work and {meetings:.1f}h meetings.")

            if b_days <= 2 and rem_hours > 4:
                reasons.append(f"Urgent timeline: {rem_hours:.1f}h remaining with only {b_days} business day(s) until due.")

            # Calculate dynamic delay risk for this specific bottleneck (0 to 100)
            task_delay_risk = min(int(round(severity * 30)), 98)

            bottlenecks.append({
                "task_id": task.id,
                "task_title": task.title,
                "assignee_id": task.assignee_id,
                "assignee_name": assignee_name,
                "severity_score": round(severity, 2),
                "workload_percentage": round(workload_val * 100, 1),
                "delay_risk_percentage": float(task_delay_risk),
                "blocking_tasks_count": downstream_count,
                "downstream_task_ids": downstream_ids,
                "reasons": reasons,
                "recommended_action": f"Reallocate '{task.title}' to a team member with available bandwidth." if downstream_count > 0 else "Split or reassign task to relieve workload pressure."
            })

    # Sort descending by severity
    bottlenecks.sort(key=lambda x: x["severity_score"], reverse=True)
    return bottlenecks
