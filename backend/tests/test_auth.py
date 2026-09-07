import uuid
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from app.main import app
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
import hashlib

client = TestClient(app)

def test_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)

    # Must be bcrypt hash
    assert hashed.startswith("$2b$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

    # Test legacy SHA-256 backward compatibility
    legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    assert verify_password(password, legacy_hash) is True
    assert verify_password("WrongPassword!", legacy_hash) is False

def test_jwt_creation_and_validation():
    data = {"sub": "test-user-id", "email": "test@example.com"}
    token = create_access_token(data)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload["sub"] == "test-user-id"
    assert payload["email"] == "test@example.com"
    assert "exp" in payload

    # Test expired token
    expired_token = create_access_token(data, expires_delta=timedelta(seconds=-10))
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(expired_token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()

    # Test tampered/invalid token
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("invalid.token.string")
    assert exc_info.value.status_code == 401

def test_unauthenticated_access_blocked():
    # Endpoints without token must return 401
    endpoints = [
        ("GET", "/api/projects"),
        ("POST", "/api/projects"),
        ("GET", "/api/tasks"),
        ("POST", "/api/tasks"),
        ("GET", "/api/intelligence/workload"),
        ("GET", "/api/intelligence/bottlenecks"),
        ("GET", "/api/intelligence/risks"),
        ("GET", "/api/settings"),
        ("GET", "/api/integrations"),
    ]

    for method, endpoint in endpoints:
        if method == "GET":
            response = client.get(endpoint)
        else:
            response = client.post(endpoint, json={})
        assert response.status_code == 401, f"{method} {endpoint} expected 401, got {response.status_code}"

def test_signup_and_login_flow():
    unique_id = uuid.uuid4().hex[:8]
    email = f"user_{unique_id}@example.com"
    password = "TestPassword456!"

    # 1. Sign up
    signup_res = client.post("/api/auth/signup", json={
        "name": "Auth Test User",
        "email": email,
        "password": password,
        "role": "QA Engineer",
        "is_leader": False,
        "daily_capacity": 7.5
    })
    assert signup_res.status_code == 200
    signup_data = signup_res.json()
    assert signup_data["success"] is True
    assert "token" in signup_data
    token = signup_data["token"]

    # Decode and verify token
    decoded = decode_access_token(token)
    assert decoded["email"] == email

    # 2. Login successfully
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    assert "token" in login_data

    # 3. Login with invalid password
    bad_login = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

    # 4. Access /me endpoint with valid token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == email

def test_cross_project_isolation():
    # User 1 (Team Leader) creates Project 1
    u1_email = f"u1_{uuid.uuid4().hex[:6]}@example.com"
    signup1 = client.post("/api/auth/signup", json={
        "name": "User One",
        "email": u1_email,
        "password": "Password123!",
        "role": "Team Lead",
        "is_leader": True
    }).json()
    token1 = signup1["token"]

    proj1 = client.post("/api/projects", json={
        "name": "User 1 Secret Project",
        "description": "Confidential"
    }, headers={"Authorization": f"Bearer {token1}"}).json()
    proj1_id = proj1["id"]

    # User 2 (Standard Member)
    u2_email = f"u2_{uuid.uuid4().hex[:6]}@example.com"
    signup2 = client.post("/api/auth/signup", json={
        "name": "User Two",
        "email": u2_email,
        "password": "Password123!",
        "role": "Junior Engineer",
        "is_leader": False
    }).json()
    token2 = signup2["token"]

    # User 2 should NOT have access to Project 1
    forbidden_get = client.get(f"/api/projects/{proj1_id}", headers={"Authorization": f"Bearer {token2}"})
    assert forbidden_get.status_code == 403, f"Expected 403, got {forbidden_get.status_code}: {forbidden_get.text}"

    # User 2 cannot create task in Project 1
    forbidden_task = client.post("/api/tasks", json={
        "title": "Malicious Task",
        "project_id": proj1_id,
        "estimated_hours": 5.0
    }, headers={"Authorization": f"Bearer {token2}"})
    assert forbidden_task.status_code == 403

    # User 1 CAN access Project 1
    ok_get = client.get(f"/api/projects/{proj1_id}", headers={"Authorization": f"Bearer {token1}"})
    assert ok_get.status_code == 200
    assert ok_get.json()["name"] == "User 1 Secret Project"


def test_user_a_cannot_read_user_b_workload_without_same_project():
    """
    Verify that User B cannot access User A's workload data without being
    a registered member of the same project.
    """
    # 1. Create User A (Leader of Project Alpha)
    ua_email = f"user_a_{uuid.uuid4().hex[:6]}@example.com"
    res_a = client.post("/api/auth/signup", json={
        "name": "User Alpha",
        "email": ua_email,
        "password": "Password123!",
        "role": "Team Lead",
        "is_leader": True
    }).json()
    token_a = res_a["token"]
    user_a_id = res_a["user"]["id"]

    # User A creates Project Alpha
    proj_a = client.post("/api/projects", json={
        "name": "Project Alpha",
        "description": "Alpha confidential workload"
    }, headers={"Authorization": f"Bearer {token_a}"}).json()
    proj_a_id = proj_a["id"]

    # Assign a task to User A in Project Alpha
    client.post("/api/tasks", json={
        "title": "Confidential Alpha Task",
        "project_id": proj_a_id,
        "assignee_id": user_a_id,
        "estimated_hours": 12.0
    }, headers={"Authorization": f"Bearer {token_a}"})

    # 2. Create User B (Member of another organization / Project Beta)
    ub_email = f"user_b_{uuid.uuid4().hex[:6]}@example.com"
    res_b = client.post("/api/auth/signup", json={
        "name": "User Beta",
        "email": ub_email,
        "password": "Password123!",
        "role": "Software Engineer",
        "is_leader": False
    }).json()
    token_b = res_b["token"]

    # 3. User B attempts to read Project Alpha's workload with explicit project_id -> MUST be 403 Forbidden
    forbidden_workload = client.get(
        f"/api/intelligence/workload?project_id={proj_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert forbidden_workload.status_code == 403, (
        f"Expected 403 Forbidden for cross-project workload access, got {forbidden_workload.status_code}"
    )

    # 4. User B attempts to read global / unscoped workload -> MUST NOT leak User A's workload
    unscoped_workload = client.get(
        "/api/intelligence/workload",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert unscoped_workload.status_code == 200
    returned_member_ids = [m["user_id"] for m in unscoped_workload.json()]
    assert user_a_id not in returned_member_ids, (
        "Data leak: User B was able to see User A's workload without project membership!"
    )

    # 5. User A querying their own project workload succeeds
    authorized_workload = client.get(
        f"/api/intelligence/workload?project_id={proj_a_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert authorized_workload.status_code == 200
    alpha_member_ids = [m["user_id"] for m in authorized_workload.json()]
    assert user_a_id in alpha_member_ids
