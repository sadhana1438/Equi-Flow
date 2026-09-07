import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.entities import User, WorkEvent, Project, ProjectMember
from app.intelligence.workload import (
    compute_member_workload,
    calculate_fragmentation,
    filter_events_by_window,
)

client = TestClient(app)

def test_yesterday_event_does_not_inflate_today_h_tracked():
    """Verify that WorkEvents from >24h ago do not inflate today's H_tracked or total workload."""
    fixed_now = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)
    user = User(id="u_win_1", name="Alice", daily_capacity=8.0)

    # Event 1: Yesterday (28 hours ago) -> 4.0h PR review
    ev_old = WorkEvent(
        id="ev_old_1",
        user_id="u_win_1",
        event_type="PR_REVIEW",
        estimated_hidden_hours=4.0,
        event_timestamp=fixed_now - timedelta(hours=28)
    )

    # Event 2: Today (2 hours ago) -> 1.5h PR review
    ev_today = WorkEvent(
        id="ev_today_1",
        user_id="u_win_1",
        event_type="PR_REVIEW",
        estimated_hidden_hours=1.5,
        event_timestamp=fixed_now - timedelta(hours=2)
    )

    # Compute workload with both events present
    wl = compute_member_workload(user, [], [ev_old, ev_today], now=fixed_now)

    # Only today's 1.5h should count towards hidden_work
    assert wl["hidden_work"] == 1.5, f"Expected 1.5h, got {wl['hidden_work']}h (old events leaked into H_tracked!)"
    assert wl["pr_review_hours"] == 1.5
    assert wl["total_workload"] == round(1.5 / 8.0, 2)

def test_yesterday_meeting_does_not_reduce_today_capacity():
    """Verify that meetings from >24h ago do not deduct from today's capacity or trigger no_task_capacity."""
    fixed_now = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)
    user = User(id="u_win_2", name="Bob", daily_capacity=8.0)

    # Meeting from 36 hours ago: 7.8 hours (would drop capacity to 0.2h if counted)
    meeting_old = WorkEvent(
        id="m_old_1",
        user_id="u_win_2",
        event_type="MEETINGS",
        estimated_hidden_hours=7.8,
        event_timestamp=fixed_now - timedelta(hours=36)
    )

    # Meeting from 1 hour ago: 1.0 hour
    meeting_today = WorkEvent(
        id="m_today_1",
        user_id="u_win_2",
        event_type="MEETINGS",
        estimated_hidden_hours=1.0,
        event_timestamp=fixed_now - timedelta(hours=1)
    )

    wl = compute_member_workload(user, [], [meeting_old, meeting_today], now=fixed_now)

    # Only today's 1.0 hour of meetings should be deducted
    assert wl["meetings"] == 1.0
    assert wl["available_capacity"] == 7.0
    assert wl["no_task_capacity"] is False

def test_fragmentation_reflects_recent_switches_not_lifetime_peak():
    """Verify fragmentation penalty reflects recent 24h switches, not a lifetime worst-case peak from days ago."""
    fixed_now = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)
    user = User(id="u_win_3", name="Charlie", daily_capacity=8.0)

    events = []

    # 3 days ago: 8 context switches within a 2-hour window (lifetime peak would produce 1.30x multiplier)
    peak_start = fixed_now - timedelta(days=3)
    for i in range(8):
        channel = "repo-frontend" if i % 2 == 0 else "repo-backend"
        events.append(WorkEvent(
            id=f"ev_peak_{i}",
            user_id="u_win_3",
            event_type="SUPPORT",
            estimated_hidden_hours=0.2,
            context_channel=channel,
            event_timestamp=peak_start + timedelta(minutes=15 * i)
        ))

    # Today: only 1 switch (well within the 2 free switches -> multiplier must be 1.0)
    today_start = fixed_now - timedelta(hours=3)
    events.append(WorkEvent(
        id="ev_today_sw1",
        user_id="u_win_3",
        event_type="SUPPORT",
        estimated_hidden_hours=0.2,
        context_channel="repo-frontend",
        event_timestamp=today_start
    ))
    events.append(WorkEvent(
        id="ev_today_sw2",
        user_id="u_win_3",
        event_type="SUPPORT",
        estimated_hidden_hours=0.2,
        context_channel="repo-backend",
        event_timestamp=today_start + timedelta(minutes=30)
    ))

    # 1. Direct fragmentation calculation with 24h rolling window
    mult, switches = calculate_fragmentation(events, window_hours=24, now=fixed_now)
    assert mult == 1.0, f"Expected 1.0x neutral multiplier, got {mult}x (lifetime peak leaked into fragmentation!)"
    assert switches == 1

    # 2. Member workload calculation
    wl = compute_member_workload(user, [], events, now=fixed_now)
    assert wl["fragmentation_factor"] == 1.0
    assert wl["context_switches_count"] == 1

    # 3. Verify that 5 switches within TODAY'S 4h window properly apply the penalty
    today_penalty_events = []
    for i in range(5):
        channel = "slack-support" if i % 2 == 0 else "jira-bugs"
        today_penalty_events.append(WorkEvent(
            id=f"ev_today_pen_{i}",
            user_id="u_win_3",
            event_type="SUPPORT",
            estimated_hidden_hours=0.2,
            context_channel=channel,
            event_timestamp=fixed_now - timedelta(hours=2) + timedelta(minutes=20 * i)
        ))
    mult_pen, sw_pen = calculate_fragmentation(today_penalty_events, window_hours=24, now=fixed_now)
    # 5 events with alternating channels = 4 switches: first 2 free, remaining 2 * 0.05 = +0.10 -> 1.10x
    assert sw_pen == 4
    assert mult_pen == 1.10

def test_filter_events_by_window_direct():
    """Verify filter_events_by_window handles naive/aware timestamps, out-of-window events, and legacy None timestamps."""
    fixed_now = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)

    e_none = WorkEvent(id="e_none", event_timestamp=None)
    e_recent_aware = WorkEvent(id="e_rec_aware", event_timestamp=fixed_now - timedelta(hours=5))
    e_recent_naive = WorkEvent(id="e_rec_naive", event_timestamp=datetime(2026, 9, 8, 9, 0, 0))  # 3h ago naive
    e_old = WorkEvent(id="e_old", event_timestamp=fixed_now - timedelta(hours=30))

    filtered = filter_events_by_window([e_none, e_recent_aware, e_recent_naive, e_old], window_hours=24, now=fixed_now)
    filtered_ids = {e.id for e in filtered}

    assert "e_none" in filtered_ids, "Legacy/unit-test event with None timestamp should be preserved"
    assert "e_rec_aware" in filtered_ids
    assert "e_rec_naive" in filtered_ids
    assert "e_old" not in filtered_ids, "Old event (>24h) must be filtered out"

def test_database_query_filters_to_24h_window_in_api():
    """Integration test: API endpoints must query WorkEvents filtered to the 24h rolling window."""
    uid = uuid.uuid4().hex[:8]
    email = f"lead_win_{uid}@example.com"
    password = "WindowPassword123!"

    # 1. Signup & Login
    signup_res = client.post("/api/auth/signup", json={
        "name": f"Window Leader {uid}",
        "email": email,
        "password": password,
        "role": "Tech Lead",
        "is_leader": True,
        "daily_capacity": 8.0
    })
    assert signup_res.status_code == 200
    user_id = signup_res.json()["user"]["id"]
    token = signup_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Project
    proj_res = client.post("/api/projects", json={
        "name": f"Window Test Project {uid}",
        "description": "Testing 24h time-window queries",
        "target_deadline": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    }, headers=headers)
    assert proj_res.status_code == 200
    project_id = proj_res.json()["id"]

    # 3. Direct DB insert of old event (36h ago) and recent event (2h ago)
    db = SessionLocal()
    try:
        old_ev = WorkEvent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=project_id,
            event_type="PR_REVIEW",
            estimated_hidden_hours=6.0,
            event_timestamp=datetime.now(timezone.utc) - timedelta(hours=36)
        )
        recent_ev = WorkEvent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=project_id,
            event_type="PR_REVIEW",
            estimated_hidden_hours=1.2,
            event_timestamp=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        db.add_all([old_ev, recent_ev])
        db.commit()
    finally:
        db.close()

    # 4. Query /api/intelligence/workload
    wl_res = client.get(f"/api/intelligence/workload?project_id={project_id}", headers=headers)
    assert wl_res.status_code == 200
    wl_items = wl_res.json()
    user_wl = next((item for item in wl_items if item["user_id"] == user_id), None)
    assert user_wl is not None, "User should be present in workload breakdown"
    assert user_wl["hidden_work"] == 1.2, (
        f"API returned hidden_work={user_wl['hidden_work']}, expected 1.2. Old event (6.0h) leaked into DB query!"
    )

    # 5. Query /api/projects/{project_id}/summary
    summary_res = client.get(f"/api/projects/{project_id}/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_hidden_work"] == 1.2, (
        f"API returned total_hidden_work={summary['total_hidden_work']}, expected 1.2. Old event leaked into project summary!"
    )
