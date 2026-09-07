from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from app.models.entities import WorkEvent, Task, User

def compute_historical_analytics(
    tasks: List[Task],
    work_events: List[WorkEvent],
    members: List[User]
) -> Dict:
    """
    Computes analytics across stored work events and tasks.
    If fewer than 3 events exist, marks insufficient_data=True.
    """
    if len(work_events) < 3:
        return {
            "has_sufficient_data": False,
            "message": "Not enough historical data for this analysis.",
            "daily_trends": [],
            "category_distribution": [],
            "capacity_utilization": []
        }

    # Group events by date (past 7 to 14 days)
    events_by_date: Dict[str, Dict[str, float]] = {}
    for ev in sorted(work_events, key=lambda x: str(x.event_timestamp or '')):
        ts = ev.event_timestamp
        if isinstance(ts, str):
            d_str = ts[:10]
        elif isinstance(ts, datetime):
            d_str = ts.strftime("%Y-%m-%d")
        else:
            d_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if d_str not in events_by_date:
            events_by_date[d_str] = {
                "date": d_str,
                "hidden_hours": 0.0,
                "meeting_hours": 0.0,
                "pr_review_hours": 0.0,
                "support_hours": 0.0,
                "rework_hours": 0.0,
                "collaboration_hours": 0.0
            }

        hrs = ev.estimated_hidden_hours or 0.0
        ev_type = (ev.event_type or "").upper()
        if ev_type == "MEETINGS":
            events_by_date[d_str]["meeting_hours"] += hrs
        else:
            events_by_date[d_str]["hidden_hours"] += hrs
            if ev_type == "PR_REVIEW":
                events_by_date[d_str]["pr_review_hours"] += hrs
            elif ev_type == "SUPPORT":
                events_by_date[d_str]["support_hours"] += hrs
            elif ev_type == "REWORK":
                events_by_date[d_str]["rework_hours"] += hrs

    daily_trends = list(events_by_date.values())

    # Aggregate category totals
    category_totals = {
        "PR Review": sum(d["pr_review_hours"] for d in daily_trends),
        "Support": sum(d["support_hours"] for d in daily_trends),
        "Rework": sum(d["rework_hours"] for d in daily_trends),
        "Meetings": sum(d["meeting_hours"] for d in daily_trends),
    }
    category_distribution = [
        {"category": k, "hours": round(v, 1)}
        for k, v in category_totals.items() if v > 0
    ]

    return {
        "has_sufficient_data": True,
        "message": "",
        "daily_trends": daily_trends,
        "category_distribution": category_distribution
    }
