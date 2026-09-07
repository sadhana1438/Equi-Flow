from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict

from app.models.entities import User
from app.security import get_current_user, get_current_leader

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

# In-memory integration state
INTEGRATIONS_STATE = [
    {
        "id": "github",
        "name": "GitHub",
        "category": "Code Review & PRs",
        "status": "Connected",
        "description": "Syncs pull request reviews, comments, and commit context to track review load.",
        "icon": "Github"
    },
    {
        "id": "jira",
        "name": "Jira Software",
        "category": "Issue Tracking",
        "status": "Connected",
        "description": "Syncs task assignments, estimates, remaining hours, and issue statuses.",
        "icon": "Layers"
    },
    {
        "id": "slack",
        "name": "Slack",
        "category": "Communication",
        "status": "Connected",
        "description": "Aggregates support channel context switching and interruption telemetry without storing messages.",
        "icon": "MessageSquare"
    },
    {
        "id": "google_calendar",
        "name": "Google Calendar",
        "category": "Calendar & Meetings",
        "status": "Connected",
        "description": "Calculates daily meeting load to derive usable task-work capacity.",
        "icon": "Calendar"
    },
    {
        "id": "linear",
        "name": "Linear",
        "category": "Issue Tracking",
        "status": "Not Connected",
        "description": "Syncs issues, cycles, and dependencies from Linear workspaces.",
        "icon": "CheckSquare"
    },
    {
        "id": "gitlab",
        "name": "GitLab",
        "category": "Code Review & PRs",
        "status": "Not Connected",
        "description": "Syncs merge requests, approvals, and pipelines.",
        "icon": "GitBranch"
    },
    {
        "id": "ms_teams",
        "name": "Microsoft Teams",
        "category": "Communication",
        "status": "Coming Soon",
        "description": "Upcoming integration for Teams meeting load and support queues.",
        "icon": "Users"
    }
]

@router.get("", response_model=List[Dict])
def list_integrations(current_user: User = Depends(get_current_user)):
    return INTEGRATIONS_STATE

@router.post("/{integration_id}/toggle")
def toggle_integration(
    integration_id: str,
    current_user: User = Depends(get_current_leader)
):
    for item in INTEGRATIONS_STATE:
        if item["id"] == integration_id:
            if item["status"] == "Connected":
                item["status"] = "Not Connected"
            elif item["status"] == "Not Connected":
                item["status"] = "Connected"
            return {"id": item["id"], "name": item["name"], "status": item["status"]}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
