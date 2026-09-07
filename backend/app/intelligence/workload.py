from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Tuple
from app.models.entities import User, Task, WorkEvent

def ensure_utc(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def calculate_business_days(start_date: datetime, end_date: datetime) -> int:
    """Calculate business days (Monday-Friday) between start_date and end_date."""
    start_date = ensure_utc(start_date)
    end_date = ensure_utc(end_date)

    start_d = start_date.date()
    end_d = end_date.date()

    if end_d <= start_d:
        return 1

    business_days = 0
    curr = start_d
    while curr < end_d:
        curr += timedelta(days=1)
        if curr.weekday() < 5:  # 0=Mon, 4=Fri
            business_days += 1

    return max(business_days, 1)

def calculate_assigned_work(tasks: List[Task], now: Optional[datetime] = None) -> Tuple[float, int]:
    """
    Calculate T_assigned from open tasks:
    task contribution = hours remaining / max(business days until due, 1)
    Fallback hours = 4.0 if task has no remaining_hours or estimated_hours.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    total_assigned = 0.0
    active_count = 0

    for task in tasks:
        if task.status in ["TODO", "IN_PROGRESS", "IN_REVIEW"]:
            active_count += 1
            rem_hours = task.remaining_hours if task.remaining_hours is not None else (task.estimated_hours or 4.0)
            if rem_hours <= 0:
                rem_hours = 4.0

            if task.due_date:
                b_days = calculate_business_days(now, task.due_date)
            else:
                b_days = 1

            contribution = rem_hours / max(b_days, 1)
            total_assigned += contribution

    return round(total_assigned, 2), active_count

def calculate_hidden_work_and_meetings(events: List[WorkEvent]) -> Dict[str, float]:
    """
    Calculates H_tracked from actual work events:
    PR review, support, comments, meetings, rework, architecture, interruptions.
    """
    hidden_work = 0.0
    meetings = 0.0
    pr_review = 0.0
    support = 0.0
    rework = 0.0
    collaboration = 0.0

    for ev in events:
        hours = ev.estimated_hidden_hours or 0.0
        ev_type = (ev.event_type or "").upper()

        if ev_type == "MEETINGS":
            meetings += hours
        elif ev_type in ["PR_REVIEW", "SUPPORT", "COMMENTS", "ARCHITECTURE", "REWORK", "INTERRUPTIONS"]:
            hidden_work += hours
            if ev_type == "PR_REVIEW":
                pr_review += hours
                collaboration += hours
            elif ev_type == "SUPPORT":
                support += hours
                collaboration += hours
            elif ev_type == "REWORK":
                rework += hours
            elif ev_type in ["COMMENTS", "ARCHITECTURE"]:
                collaboration += hours
        else:
            hidden_work += hours

    return {
        "hidden_work": round(hidden_work, 2),
        "meetings": round(meetings, 2),
        "pr_review": round(pr_review, 2),
        "support": round(support, 2),
        "rework": round(rework, 2),
        "collaboration": round(collaboration, 2),
    }

def filter_events_by_window(
    events: List[WorkEvent],
    window_hours: int = 24,
    now: Optional[datetime] = None
) -> List[WorkEvent]:
    """
    Constrains work events to a rolling window (default: 24 hours).
    Events without a timestamp are treated as active (for testing and legacy compatibility).
    """
    if not events:
        return []
    if now is None:
        now = datetime.now(timezone.utc)
    else:
        now = ensure_utc(now)

    cutoff = now - timedelta(hours=window_hours)
    return [
        ev for ev in events
        if ev.event_timestamp is None or ensure_utc(ev.event_timestamp) >= cutoff
    ]

def calculate_fragmentation(
    events: List[WorkEvent],
    window_hours: Optional[int] = 24,
    now: Optional[datetime] = None
) -> Tuple[float, int]:
    """
    Calculate context switching dynamically using a sliding 4-hour window.
    Only considers events within the active time window (default 24h).
    Track switches between projects, repositories, channels.
    Rules:
    - First 2 switches have no penalty (1.0)
    - Every additional switch adds 0.05
    - Maximum multiplier = 1.5x
    - If no context switch data exists, use neutral multiplier (1.0)
    """
    if window_hours is not None:
        events = filter_events_by_window(events, window_hours=window_hours, now=now)

    # Filter events with a context
    events_with_context = [
        ev for ev in events 
        if ev.context_channel and ev.context_channel.strip()
    ]
    if len(events_with_context) < 2:
        return 1.0, 0

    # Sort chronologically with UTC normalization
    sorted_events = sorted(events_with_context, key=lambda x: ensure_utc(x.event_timestamp))
    max_switches_in_window = 0

    # Sliding 4-hour window evaluation
    window_duration = timedelta(hours=4)
    for i in range(len(sorted_events)):
        window_start = ensure_utc(sorted_events[i].event_timestamp)
        window_end = window_start + window_duration

        switches_in_window = 0
        last_context = sorted_events[i].context_channel.strip()

        for j in range(i + 1, len(sorted_events)):
            ev_j_ts = ensure_utc(sorted_events[j].event_timestamp)
            if ev_j_ts <= window_end:
                current_context = sorted_events[j].context_channel.strip()
                if current_context != last_context:
                    switches_in_window += 1
                    last_context = current_context
            else:
                break

        if switches_in_window > max_switches_in_window:
            max_switches_in_window = switches_in_window

    if max_switches_in_window <= 2:
        multiplier = 1.0
    else:
        extra_switches = max_switches_in_window - 2
        multiplier = 1.0 + (extra_switches * 0.05)
        multiplier = min(multiplier, 1.5)

    return round(multiplier, 2), max_switches_in_window

def compute_member_workload(
    user: User,
    tasks: List[Task],
    events: List[WorkEvent],
    healthy_threshold: float = 0.8,
    near_capacity_threshold: float = 1.0,
    now: Optional[datetime] = None,
    window_hours: int = 24
) -> Dict:
    """
    Complete workload calculation formula:
    W_total = ((T_assigned + H_tracked) / max(C_capacity - M_meetings, 0.5)) * F_fragmentation
    Constrains work events to the rolling window (default: 24 hours).
    """
    if now is None:
        now = datetime.now(timezone.utc)
    else:
        now = ensure_utc(now)

    # Constrain work events to the rolling 24-hour window
    recent_events = filter_events_by_window(events, window_hours=window_hours, now=now)

    t_assigned, active_tasks = calculate_assigned_work(tasks, now=now)
    hw_data = calculate_hidden_work_and_meetings(recent_events)
    h_tracked = hw_data["hidden_work"]
    m_meetings = hw_data["meetings"]

    c_capacity = user.daily_capacity if user.daily_capacity is not None else 8.0
    net_capacity = c_capacity - m_meetings
    available_capacity = max(net_capacity, 0.5)
    no_task_capacity = net_capacity < 0.5

    f_fragmentation, switch_count = calculate_fragmentation(recent_events, window_hours=None, now=now)

    w_total = ((t_assigned + h_tracked) / available_capacity) * f_fragmentation
    w_total = round(w_total, 2)

    if w_total <= healthy_threshold:
        status = "HEALTHY"
    elif w_total <= near_capacity_threshold:
        status = "NEAR_CAPACITY"
    else:
        status = "OVERLOADED"

    return {
        "user_id": user.id,
        "user_name": user.name,
        "role": user.role,
        "daily_capacity": c_capacity,
        "assigned_work": t_assigned,
        "hidden_work": h_tracked,
        "meetings": m_meetings,
        "available_capacity": round(available_capacity, 2),
        "no_task_capacity": no_task_capacity,
        "fragmentation_factor": f_fragmentation,
        "total_workload": w_total,
        "status": status,
        "active_tasks_count": active_tasks,
        "pr_review_hours": hw_data["pr_review"],
        "support_hours": hw_data["support"],
        "rework_hours": hw_data["rework"],
        "collaboration_hours": hw_data["collaboration"],
        "context_switches_count": switch_count,
    }
