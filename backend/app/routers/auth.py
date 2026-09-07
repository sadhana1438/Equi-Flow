import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.entities import User, Project, ProjectMember
from app.schemas.dtos import (
    SignUpRequest, LoginRequest, JoinProjectRequest, ProjectResponse, UserResponse
)
from app.routers.users import map_user_to_response
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup")
def signup(payload: SignUpRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No project found with join code '{code}'."
            )

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

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "is_leader": user.is_leader
    })

    return {
        "success": True,
        "token": token,
        "user": map_user_to_response(user),
        "active_project": ProjectResponse.model_validate(active_project) if active_project else None
    }

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(payload.password, user.password_hash or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Seamlessly upgrade legacy SHA-256 hash to bcrypt if needed
    if user.password_hash and not user.password_hash.startswith(("$2b$", "$2a$", "$2y$")):
        user.password_hash = hash_password(payload.password)
        db.commit()
        db.refresh(user)

    # Find their project membership
    membership = db.query(ProjectMember).filter(ProjectMember.user_id == user.id).first()
    active_project = membership.project if membership else None

    # If no membership, but they are leader and created a project, or first project in DB
    if not active_project:
        active_project = db.query(Project).first()

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "is_leader": user.is_leader
    })

    return {
        "success": True,
        "token": token,
        "user": map_user_to_response(user),
        "active_project": ProjectResponse.model_validate(active_project) if active_project else None
    }

@router.post("/join-project")
def join_project(
    payload: JoinProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    code = payload.join_code.strip().upper()
    project = db.query(Project).filter(Project.join_code == code).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No project found matching code '{code}'. Please verify the code with your Team Leader."
        )

    target_user_id = payload.user_id if payload.user_id else current_user.id
    if target_user_id != current_user.id and not current_user.is_leader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot enroll another user without leader privileges."
        )

    existing_membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == target_user_id
    ).first()

    if not existing_membership:
        membership = ProjectMember(
            id=str(uuid.uuid4()),
            project_id=project.id,
            user_id=target_user_id,
            role_in_project="MEMBER"
        )
        db.add(membership)
        db.commit()

    return {
        "success": True,
        "message": f"Successfully joined project '{project.name}'!",
        "project": ProjectResponse.model_validate(project)
    }

@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
    projects = [m.project for m in memberships if m.project]

    return {
        "user": map_user_to_response(current_user),
        "projects": [ProjectResponse.model_validate(p) for p in projects]
    }

@router.get("/me/{user_id}")
def get_me(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Allow reading profile if self or if leader
    if current_user.id != user_id and not current_user.is_leader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to own profile or team leader."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    memberships = db.query(ProjectMember).filter(ProjectMember.user_id == user.id).all()
    projects = [m.project for m in memberships if m.project]

    return {
        "user": map_user_to_response(user),
        "projects": [ProjectResponse.model_validate(p) for p in projects]
    }
