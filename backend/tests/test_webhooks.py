import os
import hmac
import hashlib
import json
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models.entities import User, Project, WorkEvent, Integration, ProjectMember

client = TestClient(app)
TEST_SECRET = "github_test_webhook_secret_xyz123"

@pytest.fixture(autouse=True)
def setup_webhook_env(monkeypatch):
    """Ensure GITHUB_WEBHOOK_SECRET is set for webhook tests and tables exist."""
    Base.metadata.create_all(bind=engine)
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", TEST_SECRET)

def compute_signature(payload_bytes: bytes, secret: str = TEST_SECRET) -> str:
    """Helper to compute valid GitHub HMAC-SHA256 signature."""
    digest = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"

def test_missing_signature_rejected():
    """Verify that requests missing X-Hub-Signature-256 header are rejected with 401."""
    payload = {"action": "opened"}
    response = client.post(
        "/api/webhooks/github",
        json=payload,
        headers={"X-GitHub-Event": "pull_request"}
    )
    assert response.status_code == 401
    assert "missing" in response.json()["detail"].lower()

def test_invalid_signature_rejected():
    """Verify that requests with invalid HMAC signatures are rejected with 401 and no WorkEvent is created."""
    db = SessionLocal()
    initial_events_count = db.query(WorkEvent).count()
    db.close()

    payload = json.dumps({"action": "opened", "sender": {"login": "attacker"}}).encode("utf-8")
    response = client.post(
        "/api/webhooks/github",
        content=payload,
        headers={
            "X-GitHub-Event": "pull_request",
            "X-Hub-Signature-256": "sha256=invalid_hash_value_1234567890abcdef",
            "Content-Type": "application/json"
        }
    )
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()

    # Ensure zero WorkEvents were inserted
    db = SessionLocal()
    assert db.query(WorkEvent).count() == initial_events_count
    db.close()

def test_valid_signature_ping_event():
    """Verify that a ping event with valid signature returns 200 OK and marks GitHub integration connected."""
    payload = json.dumps({"zen": "Keep it logically awesome."}).encode("utf-8")
    sig = compute_signature(payload)

    response = client.post(
        "/api/webhooks/github",
        content=payload,
        headers={
            "X-GitHub-Event": "ping",
            "X-Hub-Signature-256": sig,
            "Content-Type": "application/json"
        }
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify GitHub integration status in DB
    db = SessionLocal()
    github_integ = db.query(Integration).filter(Integration.id == "github").first()
    assert github_integ is not None
    assert github_integ.status == "Connected"
    db.close()

def test_valid_signature_pull_request_review_creates_work_event():
    """Verify pull_request_review event creates a PR_REVIEW WorkEvent mapped to existing user."""
    db = SessionLocal()
    try:
        # Create user & project
        uid = uuid.uuid4().hex[:8]
        user = User(
            id=str(uuid.uuid4()),
            name=f"Reviewer {uid}",
            email=f"reviewer_{uid}@example.com",
            role="Senior Dev",
            daily_capacity=8.0
        )
        project = Project(
            id=str(uuid.uuid4()),
            name=f"Apollo Project {uid}",
            join_code=f"EQ-{uid[:4].upper()}"
        )
        db.add_all([user, project])
        db.commit()
        user_id = user.id
        project_id = project.id
        user_email = user.email
    finally:
        db.close()

    payload_dict = {
        "action": "submitted",
        "review": {
            "id": 1001,
            "user": {
                "login": f"gh_{uid}",
                "email": user_email
            },
            "state": "approved"
        },
        "pull_request": {
            "number": 42,
            "title": "Feature: Enterprise Webhook Receiver",
            "html_url": "https://github.com/org/apollo/pull/42"
        },
        "repository": {
            "name": "apollo",
            "full_name": "org/apollo"
        }
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = compute_signature(payload_bytes)

    response = client.post(
        f"/api/webhooks/github?project_id={project_id}",
        content=payload_bytes,
        headers={
            "X-GitHub-Event": "pull_request_review",
            "X-Hub-Signature-256": sig,
            "Content-Type": "application/json"
        }
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["user_id"] == user_id
    assert res_data["event_type"] == "PR_REVIEW"
    assert res_data["estimated_hidden_hours"] == 1.5
    assert res_data["context_channel"] == "org/apollo"

    # Verify DB WorkEvent row
    db = SessionLocal()
    try:
        event = db.query(WorkEvent).filter(WorkEvent.id == res_data["event_id"]).first()
        assert event is not None
        assert event.user_id == user_id
        assert event.project_id == project_id
        assert event.event_type == "PR_REVIEW"
        assert event.estimated_hidden_hours == 1.5
        assert event.context_channel == "org/apollo"

        # Verify metadata
        meta = json.loads(event.metadata_json)
        assert meta["pr_number"] == 42
        assert meta["pr_title"] == "Feature: Enterprise Webhook Receiver"

        # Verify integration telemetry
        gh_integ = db.query(Integration).filter(Integration.id == "github").first()
        assert gh_integ is not None
        assert gh_integ.events_count >= 1
        assert gh_integ.last_event_at is not None
    finally:
        db.close()

def test_valid_signature_unknown_actor_creates_contributor_and_work_event():
    """Verify webhook with an unknown GitHub login creates a contributor User and records WorkEvent."""
    uid = uuid.uuid4().hex[:8]
    unknown_login = f"external_contributor_{uid}"

    payload_dict = {
        "action": "review_requested",
        "requested_reviewer": {
            "login": unknown_login,
            "email": f"{unknown_login}@users.noreply.github.com"
        },
        "pull_request": {
            "number": 88,
            "title": "Bugfix: Memory Leak in DAG Traversal"
        },
        "repository": {
            "name": "core-engine",
            "full_name": "org/core-engine"
        }
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = compute_signature(payload_bytes)

    response = client.post(
        "/api/webhooks/github",
        content=payload_bytes,
        headers={
            "X-GitHub-Event": "pull_request",
            "X-Hub-Signature-256": sig,
            "Content-Type": "application/json"
        }
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True

    # Verify contributor User was created
    db = SessionLocal()
    try:
        created_user = db.query(User).filter(User.name == unknown_login).first()
        assert created_user is not None
        assert created_user.email == f"{unknown_login}@users.noreply.github.com"
        assert created_user.role == "GitHub Contributor"

        # Verify WorkEvent attached to contributor
        event = db.query(WorkEvent).filter(WorkEvent.id == res_data["event_id"]).first()
        assert event is not None
        assert event.user_id == created_user.id
        assert event.estimated_hidden_hours == 1.5
    finally:
        db.close()

def test_integrations_list_and_toggle_backed_by_db():
    """Verify that integrations list and toggling reflect dynamic DB state."""
    # 1. Signup leader to authenticate
    uid = uuid.uuid4().hex[:8]
    signup_res = client.post("/api/auth/signup", json={
        "name": f"Leader {uid}",
        "email": f"leader_{uid}@example.com",
        "password": "Password123!",
        "role": "Lead",
        "is_leader": True
    })
    token = signup_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get list of integrations (auto-seeds from DB)
    res = client.get("/api/integrations", headers=headers)
    assert res.status_code == 200
    integrations = res.json()
    assert len(integrations) >= 5

    # Check that GitHub is in the list
    github_item = next(i for i in integrations if i["id"] == "github")
    assert github_item["name"] == "GitHub"

    # Find Slack integration
    slack_item = next(i for i in integrations if i["id"] == "slack")
    initial_status = slack_item["status"]

    # 3. Toggle Slack
    toggle_res = client.post("/api/integrations/slack/toggle", headers=headers)
    assert toggle_res.status_code == 200
    new_status = toggle_res.json()["status"]
    assert new_status != initial_status

    # Verify DB reflects the change
    db = SessionLocal()
    try:
        slack_db = db.query(Integration).filter(Integration.id == "slack").first()
        assert slack_db.status == new_status
    finally:
        db.close()

    # 4. Toggle back
    toggle_back_res = client.post("/api/integrations/slack/toggle", headers=headers)
    assert toggle_back_res.status_code == 200
    assert toggle_back_res.json()["status"] == initial_status

    # 5. Toggling a "Coming Soon" integration should be rejected with 400
    cs_res = client.post("/api/integrations/ms_teams/toggle", headers=headers)
    assert cs_res.status_code == 400
    assert "coming soon" in cs_res.json()["detail"].lower()
