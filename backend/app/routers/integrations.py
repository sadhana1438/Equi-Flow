import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict

from app.database import get_db
from app.models.entities import User, Integration
from app.schemas.dtos import IntegrationResponse
from app.security import get_current_user, get_current_leader

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

DEFAULT_INTEGRATIONS = [
    {
        "id": "github",
        "name": "GitHub",
        "category": "Code Review & PRs",
        "status": "Connected" if os.getenv("GITHUB_WEBHOOK_SECRET") else "Not Connected",
        "description": "Syncs pull request reviews, comments, and commit context to track review load.",
        "icon": "Github"
    },
    {
        "id": "jira",
        "name": "Jira Software",
        "category": "Issue Tracking",
        "status": "Not Connected",
        "description": "Syncs task assignments, estimates, remaining hours, and issue statuses.",
        "icon": "Layers"
    },
    {
        "id": "slack",
        "name": "Slack",
        "category": "Communication",
        "status": "Not Connected",
        "description": "Aggregates support channel context switching and interruption telemetry without storing messages.",
        "icon": "MessageSquare"
    },
    {
        "id": "google_calendar",
        "name": "Google Calendar",
        "category": "Calendar & Meetings",
        "status": "Not Connected",
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

def ensure_integrations_seeded(db: Session):
    """Seed the default integrations into the database if not present."""
    count = db.query(Integration).count()
    if count == 0:
        for item in DEFAULT_INTEGRATIONS:
            integ = Integration(
                id=item["id"],
                name=item["name"],
                category=item["category"],
                status=item["status"],
                description=item["description"],
                icon=item["icon"],
            )
            db.add(integ)
        db.commit()
    else:
        # Check if GitHub secret is now configured in env and update GitHub status if needed
        if os.getenv("GITHUB_WEBHOOK_SECRET"):
            gh = db.query(Integration).filter(Integration.id == "github").first()
            if gh and gh.status == "Not Connected":
                gh.status = "Connected"
                db.commit()

@router.get("", response_model=List[IntegrationResponse])
def list_integrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_integrations_seeded(db)
    integrations = db.query(Integration).all()
    return integrations

@router.post("/{integration_id}/toggle", response_model=IntegrationResponse)
def toggle_integration(
    integration_id: str,
    current_user: User = Depends(get_current_leader),
    db: Session = Depends(get_db)
):
    ensure_integrations_seeded(db)
    integ = db.query(Integration).filter(Integration.id == integration_id).first()
    if not integ:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")

    if integ.status == "Coming Soon":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{integ.name} integration is coming soon and cannot be enabled yet."
        )

    integ.status = "Not Connected" if integ.status == "Connected" else "Connected"
    db.commit()
    db.refresh(integ)
    return integ

