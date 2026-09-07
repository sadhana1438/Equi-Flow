import os
import hmac
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request, Header, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.entities import User, WorkEvent, Project, Integration
from app.routers.integrations import ensure_integrations_seeded

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

def resolve_webhook_secret(db: Session) -> Optional[str]:
    """Retrieve GitHub webhook secret from environment or database integration row."""
    ensure_integrations_seeded(db)
    env_secret = os.getenv("GITHUB_WEBHOOK_SECRET")
    if env_secret and env_secret.strip():
        return env_secret.strip()

    integ = db.query(Integration).filter(Integration.id == "github").first()
    if integ and integ.webhook_secret and integ.webhook_secret.strip():
        return integ.webhook_secret.strip()

    return None

def verify_github_signature(raw_body: bytes, signature_header: Optional[str], secret: str) -> bool:
    """Verify HMAC-SHA256 signature against GitHub X-Hub-Signature-256 header."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    computed_hash = hmac.new(
        key=secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    expected_signature = f"sha256={computed_hash}"
    return hmac.compare_digest(expected_signature, signature_header)

@router.post("/github")
async def github_webhook_receiver(
    request: Request,
    project_id: Optional[str] = Query(None),
    x_github_event: Optional[str] = Header(None, alias="X-GitHub-Event"),
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    db: Session = Depends(get_db)
):
    """
    Ingests GitHub webhook events (PR reviews, PR activity) with HMAC-SHA256 signature verification.
    Parses actor and creates a real WorkEvent row contributing to hidden workload calculations.
    """
    raw_body = await request.body()
    secret = resolve_webhook_secret(db)

    # 1. Signature Verification
    if not x_hub_signature_256:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Hub-Signature-256 header."
        )

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub webhook secret is not configured on the server."
        )

    if not verify_github_signature(raw_body, x_hub_signature_256, secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature."
        )

    # 2. Parse JSON payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON payload: {str(e)}"
        )

    event_name = (x_github_event or payload.get("event") or "pull_request").lower()

    # 3. Handle Ping
    if event_name == "ping":
        # Update integration status to Connected
        github_integ = db.query(Integration).filter(Integration.id == "github").first()
        if github_integ:
            github_integ.status = "Connected"
            github_integ.last_event_at = datetime.now(timezone.utc)
            db.commit()

        return {
            "status": "success",
            "message": "GitHub ping verified and acknowledged. Webhook integration active."
        }

    # 4. Handle PR Review and Pull Request events
    if event_name in ["pull_request_review", "pull_request"]:
        action = payload.get("action", "")

        # Determine actor
        actor_data = {}
        if "review" in payload and isinstance(payload["review"], dict):
            actor_data = payload["review"].get("user", {})
        elif action == "review_requested" and "requested_reviewer" in payload:
            actor_data = payload["requested_reviewer"]
        elif "sender" in payload and isinstance(payload["sender"], dict):
            actor_data = payload["sender"]
        elif "pull_request" in payload and isinstance(payload["pull_request"], dict):
            actor_data = payload["pull_request"].get("user", {})

        login = actor_data.get("login") or "github-contributor"
        email = actor_data.get("email")

        # Map actor to EquiFlow User
        matched_user = None
        if email:
            matched_user = db.query(User).filter(func.lower(User.email) == email.lower()).first()

        if not matched_user and login:
            matched_user = db.query(User).filter(func.lower(User.name) == login.lower()).first()

        if not matched_user and login:
            matched_user = db.query(User).filter(User.email.ilike(f"{login}@%")).first()

        # If no user matches, create an identifiable contributor record to maintain foreign key integrity
        if not matched_user:
            fallback_email = email or f"{login}@users.noreply.github.com"
            matched_user = User(
                id=str(uuid.uuid4()),
                name=login,
                email=fallback_email,
                role="GitHub Contributor",
                is_leader=False,
                daily_capacity=8.0
            )
            db.add(matched_user)
            db.flush()

        # Estimate hidden hours (H_tracked)
        if event_name == "pull_request_review":
            state = payload.get("review", {}).get("state", "").lower()
            if state == "changes_requested":
                estimated_hours = 2.0
            elif state == "approved":
                estimated_hours = 1.5
            else:
                estimated_hours = 1.0
        else:
            # pull_request events
            if action == "review_requested":
                estimated_hours = 1.5
            elif action in ["opened", "reopened"]:
                estimated_hours = 1.0
            else:
                estimated_hours = 0.5

        repo_info = payload.get("repository", {})
        repo_name = repo_info.get("full_name") or repo_info.get("name") or "github-repository"

        # Resolve project
        resolved_project_id = None
        if project_id:
            proj = db.query(Project).filter(Project.id == project_id).first()
            if proj:
                resolved_project_id = proj.id

        pr_info = payload.get("pull_request", {})

        # Create WorkEvent
        work_event = WorkEvent(
            id=str(uuid.uuid4()),
            user_id=matched_user.id,
            project_id=resolved_project_id,
            event_type="PR_REVIEW",
            estimated_hidden_hours=estimated_hours,
            context_channel=repo_name,
            event_timestamp=datetime.now(timezone.utc),
            metadata_json=json.dumps({
                "source": "github_webhook",
                "event": event_name,
                "action": action,
                "pr_number": pr_info.get("number"),
                "pr_title": pr_info.get("title"),
                "pr_url": pr_info.get("html_url"),
                "actor_login": login,
                "actor_email": email,
                "repository": repo_name
            })
        )
        db.add(work_event)

        # Update Integration telemetry
        github_integ = db.query(Integration).filter(Integration.id == "github").first()
        if github_integ:
            github_integ.status = "Connected"
            github_integ.last_event_at = datetime.now(timezone.utc)
            github_integ.events_count = (github_integ.events_count or 0) + 1

        db.commit()
        db.refresh(work_event)

        return {
            "success": True,
            "message": f"Ingested {event_name} ({action}) for actor '{login}'.",
            "event_id": work_event.id,
            "user_id": matched_user.id,
            "user_name": matched_user.name,
            "event_type": work_event.event_type,
            "estimated_hidden_hours": estimated_hours,
            "context_channel": repo_name
        }

    # Other event types acknowledged
    return {
        "success": True,
        "message": f"GitHub event '{event_name}' received and acknowledged."
    }
