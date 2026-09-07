import copy
from typing import List, Dict, Optional
from datetime import datetime, timezone
from app.models.entities import Task, TaskDependency, User, UserSkill, WorkEvent
from app.intelligence.workload import compute_member_workload
from app.intelligence.graph import build_dependency_digraph, get_downstream_impact
from app.intelligence.bottleneck import detect_bottlenecks
from app.intelligence.risk import calculate_project_risks_and_health
from app.intelligence.recommendation import get_skill_multiplier

def run_what_if_simulation(
    task_id: str,
    target_assignee_id: str,
    tasks: List[Task],
    dependencies: List[TaskDependency],
    members: List[User],
    user_skills: List[UserSkill],
    work_events: List[WorkEvent],
    now: Optional[datetime] = None
) -> Dict:
    """
    Simulates a hypothetical task reassignment in memory on cloned state.
    Calculates:
    - Skill multiplier
    - Handoff penalty: max(0.10 * estimate, 1.0h) if IN_PROGRESS, else 0
    - New task duration: (remaining_hours * skill_multiplier) + handoff_penalty
    - Recalculates full intelligence: workloads, bottlenecks, risks, health
    - Returns Before vs Proposed vs After comparison
    """
    if now is None:
        now = datetime.now(timezone.utc)

    # 1. Identify target task and members
    original_task = next((t for t in tasks if t.id == task_id), None)
    if not original_task:
        raise ValueError(f"Task with ID '{task_id}' not found.")

    target_user = next((u for u in members if u.id == target_assignee_id), None)
    if not target_user:
        raise ValueError(f"Target user with ID '{target_assignee_id}' not found.")

    current_assignee_id = original_task.assignee_id
    current_user = next((u for u in members if u.id == current_assignee_id), None)
    current_user_name = current_user.name if current_user else "Unassigned"

    # 2. Compute BEFORE State
    member_workloads_before = {}
    for user in members:
        u_tasks = [t for t in tasks if t.assignee_id == user.id]
        u_events = [e for e in work_events if e.user_id == user.id]
        member_workloads_before[user.id] = compute_member_workload(user, u_tasks, u_events, now=now)

    bottlenecks_before = detect_bottlenecks(tasks, dependencies, member_workloads_before, now=now)
    risks_before = calculate_project_risks_and_health(tasks, dependencies, member_workloads_before, bottlenecks_before, now=now)

    # 3. Calculate Handoff Penalty & Skill Multiplier
    orig_est = original_task.estimated_hours or 4.0
    orig_rem = original_task.remaining_hours if original_task.remaining_hours is not None else orig_est

    # Handoff penalty rule: max(10% * original estimate, 1 hour) if IN_PROGRESS, else 0
    if original_task.status == "IN_PROGRESS":
        handoff_penalty = max(0.10 * orig_est, 1.0)
    else:
        handoff_penalty = 0.0

    skill_multiplier, skill_level = get_skill_multiplier(target_assignee_id, original_task.required_skill_id, user_skills)

    # Simulated new duration
    simulated_remaining_hours = round((orig_rem * skill_multiplier) + handoff_penalty, 2)

    # 4. Clone Project State in Memory (Zero DB modification)
    cloned_tasks = []
    for t in tasks:
        # Create shallow/detached copy with updated assignment & duration
        if t.id == task_id:
            # Simulated copy
            cloned_task = Task(
                id=t.id,
                title=t.title,
                description=t.description,
                project_id=t.project_id,
                assignee_id=target_assignee_id,
                estimated_hours=t.estimated_hours,
                remaining_hours=simulated_remaining_hours,
                status=t.status,
                priority=t.priority,
                complexity=t.complexity,
                due_date=t.due_date,
                required_skill_id=t.required_skill_id
            )
        else:
            cloned_task = Task(
                id=t.id,
                title=t.title,
                description=t.description,
                project_id=t.project_id,
                assignee_id=t.assignee_id,
                estimated_hours=t.estimated_hours,
                remaining_hours=t.remaining_hours,
                status=t.status,
                priority=t.priority,
                complexity=t.complexity,
                due_date=t.due_date,
                required_skill_id=t.required_skill_id
            )
        cloned_tasks.append(cloned_task)

    # 5. Compute AFTER State
    member_workloads_after = {}
    for user in members:
        u_tasks = [t for t in cloned_tasks if t.assignee_id == user.id]
        u_events = [e for e in work_events if e.user_id == user.id]
        member_workloads_after[user.id] = compute_member_workload(user, u_tasks, u_events, now=now)

    bottlenecks_after = detect_bottlenecks(cloned_tasks, dependencies, member_workloads_after, now=now)
    risks_after = calculate_project_risks_and_health(cloned_tasks, dependencies, member_workloads_after, bottlenecks_after, now=now)

    # 6. Downstream Impact & Explanation Generation
    G = build_dependency_digraph(tasks, dependencies)
    downstream_count, _ = get_downstream_impact(G, task_id)

    before_src_wl = member_workloads_before.get(current_assignee_id, {}).get("total_workload", 0.0) if current_assignee_id else 0.0
    after_src_wl = member_workloads_after.get(current_assignee_id, {}).get("total_workload", 0.0) if current_assignee_id else 0.0

    before_tgt_wl = member_workloads_before.get(target_assignee_id, {}).get("total_workload", 0.0)
    after_tgt_wl = member_workloads_after.get(target_assignee_id, {}).get("total_workload", 0.0)

    # Build dynamic rationale
    explanation_parts = [
        f"Reassigning '{original_task.title}' to {target_user.name}."
    ]
    if current_user:
        explanation_parts.append(
            f"{current_user.name}'s workload changes from {int(before_src_wl*100)}% to {int(after_src_wl*100)}%."
        )
    explanation_parts.append(
        f"{target_user.name}'s workload adjusts from {int(before_tgt_wl*100)}% to {int(after_tgt_wl*100)}% "
        f"({skill_level} proficiency, {skill_multiplier}x skill multiplier)."
    )
    if handoff_penalty > 0:
        explanation_parts.append(
            f"An in-progress handoff transition penalty of +{handoff_penalty:.1f}h was applied."
        )
    if len(bottlenecks_after) < len(bottlenecks_before):
        resolved_count = len(bottlenecks_before) - len(bottlenecks_after)
        explanation_parts.append(f"Resolves {resolved_count} active bottleneck(s) in the dependency chain.")

    return {
        "task_id": task_id,
        "task_title": original_task.title,
        "current_assignee_id": current_assignee_id or "",
        "current_assignee_name": current_user_name,
        "target_assignee_id": target_assignee_id,
        "target_assignee_name": target_user.name,
        "skill_level": skill_level,
        "skill_multiplier": skill_multiplier,
        "handoff_penalty_hours": round(handoff_penalty, 2),
        "original_remaining_hours": round(orig_rem, 2),
        "simulated_remaining_hours": simulated_remaining_hours,
        "before_source_workload": round(before_src_wl * 100, 1),
        "after_source_workload": round(after_src_wl * 100, 1),
        "before_target_workload": round(before_tgt_wl * 100, 1),
        "after_target_workload": round(after_tgt_wl * 100, 1),
        "before_project_health": risks_before["health"],
        "after_project_health": risks_after["health"],
        "before_delay_risk": risks_before["delay_risk"],
        "after_delay_risk": risks_after["delay_risk"],
        "before_bottleneck_count": len(bottlenecks_before),
        "after_bottleneck_count": len(bottlenecks_after),
        "downstream_impact_resolved": downstream_count,
        "explanation": " ".join(explanation_parts)
    }
