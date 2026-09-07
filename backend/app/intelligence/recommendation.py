from typing import List, Dict, Optional
import uuid
from app.models.entities import Task, TaskDependency, User, UserSkill
from app.intelligence.graph import build_dependency_digraph, get_downstream_impact

def get_skill_multiplier(
    user_id: str,
    required_skill_id: Optional[str],
    user_skills: List[UserSkill]
) -> tuple[float, str]:
    """
    Evaluates skill multiplier based on proficiency:
    - EXPERT: 0.8x
    - STANDARD: 1.0x
    - NOVICE: 1.5x
    - MISMATCH (no skill): 1.8x
    """
    if not required_skill_id:
        return 1.0, "STANDARD"

    for us in user_skills:
        if us.user_id == user_id and us.skill_id == required_skill_id:
            prof = (us.proficiency or "STANDARD").upper()
            if prof == "EXPERT":
                return 0.8, "EXPERT"
            elif prof == "STANDARD":
                return 1.0, "STANDARD"
            elif prof == "NOVICE":
                return 1.5, "NOVICE"

    return 1.8, "MISMATCH"

def generate_recommendations(
    tasks: List[Task],
    dependencies: List[TaskDependency],
    members: List[User],
    user_skills: List[UserSkill],
    member_workloads: Dict[str, Dict],
    bottlenecks: List[Dict]
) -> List[Dict]:
    """
    Dynamically generates recommendations to resolve overload and bottleneck pressures.
    Considers skills, available capacity, and downstream impact.
    """
    recommendations = []
    G = build_dependency_digraph(tasks, dependencies)

    # Find overloaded members
    overloaded_users = [
        u for u in members 
        if member_workloads.get(u.id, {}).get("status") == "OVERLOADED"
    ]

    # Find candidate targets with available bandwidth (W_total <= 0.85)
    candidate_targets = [
        u for u in members
        if member_workloads.get(u.id, {}).get("total_workload", 0.0) <= 0.85
    ]

    if not overloaded_users and not bottlenecks:
        return []

    # Identify tasks contributing to overload/bottlenecks
    candidate_tasks = []
    # 1. Bottleneck tasks
    for b in bottlenecks:
        t = next((task for task in tasks if task.id == b["task_id"]), None)
        if t and t.assignee_id and t.status in ["TODO", "IN_PROGRESS"]:
            candidate_tasks.append((t, b["severity_score"], b["blocking_tasks_count"]))

    # 2. Tasks on overloaded members
    for u in overloaded_users:
        u_tasks = [
            t for t in tasks 
            if t.assignee_id == u.id and t.status in ["TODO", "IN_PROGRESS"]
        ]
        for t in u_tasks:
            if not any(ct[0].id == t.id for ct in candidate_tasks):
                ds_count, _ = get_downstream_impact(G, t.id)
                candidate_tasks.append((t, 1.0 + ds_count * 0.3, ds_count))

    # Sort candidate tasks by urgency / severity
    candidate_tasks.sort(key=lambda x: x[1], reverse=True)

    used_task_ids = set()

    for task, severity, ds_count in candidate_tasks:
        if task.id in used_task_ids:
            continue

        curr_assignee_id = task.assignee_id
        curr_wl_info = member_workloads.get(curr_assignee_id, {})
        curr_wl = curr_wl_info.get("total_workload", 1.0)
        curr_name = curr_wl_info.get("user_name", "Current Assignee")

        # Evaluate best target
        best_target = None
        best_score = -999.0
        best_multiplier = 1.0
        best_match_str = "STANDARD"

        for target in candidate_targets:
            if target.id == curr_assignee_id:
                continue

            tgt_wl_info = member_workloads.get(target.id, {})
            tgt_wl = tgt_wl_info.get("total_workload", 0.0)
            avail_cap = tgt_wl_info.get("available_capacity", 8.0)

            multiplier, match_str = get_skill_multiplier(target.id, task.required_skill_id, user_skills)

            # Score: reward available capacity, penalize skill mismatch
            target_score = (1.0 - tgt_wl) * 2.0 - (multiplier - 1.0) * 1.5

            if target_score > best_score:
                best_score = target_score
                best_target = target
                best_multiplier = multiplier
                best_match_str = match_str

        if best_target:
            tgt_wl_info = member_workloads.get(best_target.id, {})
            tgt_wl = tgt_wl_info.get("total_workload", 0.0)
            tgt_name = best_target.name

            rem_hours = task.remaining_hours if task.remaining_hours is not None else 4.0
            daily_reduction = round(rem_hours / max(curr_wl_info.get("available_capacity", 8.0), 1.0) * 100, 1)

            reason = (
                f"Reassigning '{task.title}' ({rem_hours:.1f}h) relieves {curr_name} (operating at {int(curr_wl*100)}%). "
                f"{tgt_name} has available bandwidth ({int(tgt_wl*100)}% workload) with {best_match_str} skill proficiency ({best_multiplier}x factor)."
            )
            if ds_count > 0:
                reason += f" Unblocks {ds_count} downstream task(s)."

            recommendations.append({
                "id": str(uuid.uuid4()),
                "type": "REASSIGN",
                "task_id": task.id,
                "task_title": task.title,
                "current_assignee_id": curr_assignee_id,
                "current_assignee_name": curr_name,
                "target_assignee_id": best_target.id,
                "target_assignee_name": tgt_name,
                "target_skill_match": best_match_str,
                "skill_multiplier": best_multiplier,
                "estimated_workload_reduction": daily_reduction,
                "reason": reason,
                "confidence": "HIGH"
            })
            used_task_ids.add(task.id)

    return recommendations
