import hashlib
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.entities import User, Project, ProjectMember
from app.schemas.dtos import (
    SignUpRequest, LoginRequest, JoinProjectRequest, ProjectResponse, UserResponse
)
from app.routers.users import map_user_to_response

router = APIRouter(prefix="/api/auth", tags=["auth"])

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode('utf-8')).hexdigest()

@router.post("/signup")
def signup(payload: SignUpRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_leader=payload.is_leader,
        daily_capacity=payload.daily_capacity
    )
    db.add(user)
    db.flush()

    active_project = None
    # If a join code was provided at sign up
    if payload.join_code and payload.join_code.strip():
        code = payload.join_code.strip().upper()
        project = db.query(Project).filter(Project.join_code == code).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"No project found with join code '{code}'.")

        membership = ProjectMember(
            id=str(uuid.uuid4()),
            project_id=project.id,
            user_id=user.id,
            role_in_project="LEADER" if payload.is_leader else "MEMBER"
        )
        db.add(membership)
        active_project = project

    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "token": f"eq_token_{user.id}",
        "user": map_user_to_response(user),
        "active_project": ProjectResponse.model_validate(active_project) if active_project else None
    }

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if user.password_hash and user.password_hash != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Find their project membership
    membership = db.query(ProjectMember).filter(ProjectMember.user_id == user.id).first()
    active_project = membership.project if membership else None

    # If no membership, but they are leader and created a project, or first project in DB
    if not active_project:
        active_project = db.query(Project).first()

    return {
        "success": True,
        "token": f"eq_token_{user.id}",
        "user": map_user_to_response(user),
        "active_project": ProjectResponse.model_validate(active_project) if active_project else None
    }

@router.post("/join-project")
def join_project(payload: JoinProjectRequest, db: Session = Depends(get_db)):
    code = payload.join_code.strip().upper()
    project = db.query(Project).filter(Project.join_code == code).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"No project found matching code '{code}'. Please verify the code with your Team Leader.")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    existing_membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id
    ).first()

    if not existing_membership:
        membership = ProjectMember(
            id=str(uuid.uuid4()),
            project_id=project.id,
            user_id=user.id,
            role_in_project="MEMBER"
        )
        db.add(membership)
        db.commit()

    return {
        "success": True,
        "message": f"Successfully joined project '{project.name}'!",
        "project": ProjectResponse.model_validate(project)
    }

@router.get("/me/{user_id}")
def get_me(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    memberships = db.query(ProjectMember).filter(ProjectMember.user_id == user.id).all()
    projects = [m.project for m in memberships if m.project]

    return {
        "user": map_user_to_response(user),
        "projects": [ProjectResponse.model_validate(p) for p in projects]
    }
