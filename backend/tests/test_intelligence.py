import pytest
from datetime import datetime, timezone, timedelta
import uuid

from app.models.entities import User, Task, TaskDependency, WorkEvent, UserSkill, Skill
from app.intelligence.workload import compute_member_workload, calculate_fragmentation, calculate_assigned_work
from app.intelligence.graph import build_dependency_digraph, get_downstream_impact
from app.intelligence.bottleneck import detect_bottlenecks
from app.intelligence.risk import calculate_project_risks_and_health
from app.intelligence.recommendation import get_skill_multiplier, generate_recommendations
from app.intelligence.simulation import run_what_if_simulation
from app.intelligence.analytics import compute_historical_analytics

now = datetime.now(timezone.utc)

def test_dataset_a_balanced_team():
    """Dataset A: Balanced team with no critical overload -> Healthy workload, no critical bottleneck."""
    user1 = User(id="u1", name="Alice", daily_capacity=8.0)
    user2 = User(id="u2", name="Bob", daily_capacity=8.0)
    
    # Each user has 1 small task due in 4 days
    t1 = Task(id="t1", title="Task 1", assignee_id="u1", remaining_hours=4.0, due_date=now + timedelta(days=4), status="TODO")
    t2 = Task(id="t2", title="Task 2", assignee_id="u2", remaining_hours=4.0, due_date=now + timedelta(days=4), status="TODO")

    wl1 = compute_member_workload(user1, [t1], [])
    wl2 = compute_member_workload(user2, [t2], [])

    assert wl1["status"] == "HEALTHY"
    assert wl2["status"] == "HEALTHY"
    assert wl1["total_workload"] < 0.5

    workloads = {"u1": wl1, "u2": wl2}
    bottlenecks = detect_bottlenecks([t1, t2], [], workloads, now=now)
    assert len(bottlenecks) == 0

def test_dataset_b_overloaded_member():
    """Dataset B: One member has significantly more work than available capacity -> Overloaded."""
    user = User(id="u1", name="Alice", daily_capacity=8.0)
    # 20 hours remaining due in 1 day
    t = Task(id="t1", title="Heavy Task", assignee_id="u1", remaining_hours=20.0, due_date=now + timedelta(days=1), status="IN_PROGRESS")

    wl = compute_member_workload(user, [t], [])
    assert wl["status"] == "OVERLOADED"
    assert wl["total_workload"] > 1.0

def test_dataset_d_dependency_pressure():
    """Dataset D: High dependency pressure -> Identified as downstream bottleneck."""
    user1 = User(id="u1", name="Alice", daily_capacity=8.0)
    user2 = User(id="u2", name="Bob", daily_capacity=8.0)

    t1 = Task(id="t1", title="Root Blocking Task", assignee_id="u1", remaining_hours=8.0, due_date=now + timedelta(days=1), status="IN_PROGRESS")
    t2 = Task(id="t2", title="Child 1", assignee_id="u2", remaining_hours=4.0, status="TODO")
    t3 = Task(id="t3", title="Child 2", assignee_id="u2", remaining_hours=4.0, status="TODO")

    dep1 = TaskDependency(id="d1", blocking_task_id="t1", dependent_task_id="t2", confidence="EXPLICIT")
    dep2 = TaskDependency(id="d2", blocking_task_id="t1", dependent_task_id="t3", confidence="EXPLICIT")

    G = build_dependency_digraph([t1, t2, t3], [dep1, dep2])
    ds_count, ds_ids = get_downstream_impact(G, "t1")
    assert ds_count == 2
    assert "t2" in ds_ids and "t3" in ds_ids

    wl1 = compute_member_workload(user1, [t1], [])
    wl2 = compute_member_workload(user2, [t2, t3], [])

    bottlenecks = detect_bottlenecks([t1, t2, t3], [dep1, dep2], {"u1": wl1, "u2": wl2}, now=now)
    assert len(bottlenecks) >= 1
    assert bottlenecks[0]["task_id"] == "t1"
    assert bottlenecks[0]["blocking_tasks_count"] == 2

def test_dataset_e_meeting_load_capacity():
    """Dataset E: Large meeting load reduces capacity below 0.5h -> Triggers no_task_capacity."""
    user = User(id="u1", name="Alice", daily_capacity=8.0)
    # 7.8 hours of meetings
    meeting_ev = WorkEvent(id="e1", user_id="u1", event_type="MEETINGS", estimated_hidden_hours=7.8)

    wl = compute_member_workload(user, [], [meeting_ev])
    assert wl["no_task_capacity"] is True
    assert wl["available_capacity"] == 0.5

def test_dataset_f_hidden_workload():
    """Dataset F: PR reviews, rework, support increase H_tracked and total workload."""
    user = User(id="u1", name="Alice", daily_capacity=8.0)
    ev1 = WorkEvent(id="e1", user_id="u1", event_type="PR_REVIEW", estimated_hidden_hours=3.0)
    ev2 = WorkEvent(id="e2", user_id="u1", event_type="SUPPORT", estimated_hidden_hours=2.0)

    wl = compute_member_workload(user, [], [ev1, ev2])
    assert wl["hidden_work"] == 5.0
    assert wl["total_workload"] == round(5.0 / 8.0, 2)

def test_dataset_g_h_skill_multiplier():
    """Dataset G/H: Expert gets 0.8x, Standard gets 1.0x, Novice gets 1.5x, Mismatch gets 1.8x."""
    user_skills = [
        UserSkill(id="s1", user_id="u1", skill_id="skill_expert", proficiency="EXPERT"),
        UserSkill(id="s2", user_id="u2", skill_id="skill_novice", proficiency="NOVICE"),
    ]

    m_expert, _ = get_skill_multiplier("u1", "skill_expert", user_skills)
    m_novice, _ = get_skill_multiplier("u2", "skill_novice", user_skills)
    m_mismatch, _ = get_skill_multiplier("u1", "skill_unknown", user_skills)

    assert m_expert == 0.8
    assert m_novice == 1.5
    assert m_mismatch == 1.8

def test_dataset_i_j_handoff_penalty_simulation():
    """Dataset I/J: IN_PROGRESS task gets handoff penalty; TODO gets 0."""
    user1 = User(id="u1", name="Elena", daily_capacity=8.0)
    user2 = User(id="u2", name="Devon", daily_capacity=8.0)

    t_in_progress = Task(
        id="t_prog", title="In Progress Task", project_id="p1", assignee_id="u1",
        estimated_hours=10.0, remaining_hours=8.0, status="IN_PROGRESS"
    )

    t_todo = Task(
        id="t_todo", title="Todo Task", project_id="p1", assignee_id="u1",
        estimated_hours=10.0, remaining_hours=8.0, status="TODO"
    )

    # Simulate IN_PROGRESS reassignment
    sim1 = run_what_if_simulation("t_prog", "u2", [t_in_progress], [], [user1, user2], [], [], now=now)
    # Handoff penalty = max(0.1 * 10, 1.0) = 1.0h
    assert sim1["handoff_penalty_hours"] == 1.0
    assert sim1["simulated_remaining_hours"] == 8.0 * 1.0 + 1.0  # 9.0h

    # Simulate TODO reassignment
    sim2 = run_what_if_simulation("t_todo", "u2", [t_todo], [], [user1, user2], [], [], now=now)
    assert sim2["handoff_penalty_hours"] == 0.0
    assert sim2["simulated_remaining_hours"] == 8.0

def test_dataset_l_empty_historical_data():
    """Dataset L: Graceful handling of insufficient historical data."""
    analytics = compute_historical_analytics([], [], [])
    assert analytics["has_sufficient_data"] is False
    assert "Not enough historical data" in analytics["message"]
