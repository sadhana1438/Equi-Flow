from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.database import get_db
from app.models.entities import User, UserSkill, Skill, ProjectMember, Task, Project
from app.schemas.dtos import (
    UserCreate, UserUpdate, UserResponse, UserSkillCreate, UserSkillResponse, UserSkillInline
)
from app.security import get_current_user, get_current_leader, verify_project_access

router = APIRouter(prefix="/api/users", tags=["users"])

def map_user_to_response(user: User) -> UserResponse:
    inline_skills = []
    for us in (user.user_skills or []):
        skill_name = us.skill.name if us.skill else "Unknown"
        inline_skills.append(UserSkillInline(
            skill_id=us.skill_id,
            skill_name=skill_name,
            proficiency=us.proficiency,
            source=us.source,
            confidence=us.confidence
        ))
    return UserResponse(
        id=user.id,
        email=user.email,
        is_leader=bool(user.is_leader),
        name=user.name,
        role=user.role,
        daily_capacity=user.daily_capacity,
        created_at=user.created_at,
        updated_at=user.updated_at,
        skills=inline_skills
    )

@router.get("", response_model=List[UserResponse])
def list_users(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if project_id:
        verify_project_access(project_id, current_user, db)
        member_ids = {m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()}
        task_assignee_ids = {t.assignee_id for t in db.query(Task).filter(Task.project_id == project_id).all() if t.assignee_id}
        relevant_ids = member_ids | task_assignee_ids
        if relevant_ids:
            users = db.query(User).filter(User.id.in_(relevant_ids)).order_by(User.name.asc()).all()
        else:
            users = []
    else:
        # If no project specified, leader sees all users, regular member sees peers in shared projects
        if current_user.is_leader:
            users = db.query(User).order_by(User.name.asc()).all()
        else:
            user_projects = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).subquery()
            co_members = db.query(ProjectMember.user_id).filter(ProjectMember.project_id.in_(user_projects)).subquery()
            users = db.query(User).filter((User.id.in_(co_members)) | (User.id == current_user.id)).order_by(User.name.asc()).all()

    return [map_user_to_response(u) for u in users]

@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_leader),
    db: Session = Depends(get_db)
):
    user = User(
        id=str(uuid.uuid4()),
        name=payload.name,
        email=payload.email,
        role=payload.role,
        daily_capacity=payload.daily_capacity
    )
    db.add(user)
    db.flush()

    if payload.project_id:
        verify_project_access(payload.project_id, current_user, db)
        proj = db.query(Project).filter(Project.id == payload.project_id).first()
        if proj:
            member = ProjectMember(
                id=str(uuid.uuid4()),
                project_id=proj.id,
                user_id=user.id,
                role_in_project="MEMBER"
            )
            db.add(member)

    db.commit()
    db.refresh(user)
    return map_user_to_response(user)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return map_user_to_response(user)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and not current_user.is_leader:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.name is not None:
        user.name = payload.name
    if payload.role is not None:
        user.role = payload.role
    if payload.daily_capacity is not None:
        user.daily_capacity = payload.daily_capacity

    db.commit()
    db.refresh(user)
    return map_user_to_response(user)

@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_leader),
    db: Session = Depends(get_db)
):
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account while authenticated")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.post("/{user_id}/skills", response_model=UserSkillResponse)
def add_user_skill(
    user_id: str,
    payload: UserSkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and not current_user.is_leader:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit skills for this user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    skill = db.query(Skill).filter(Skill.id == payload.skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    existing = db.query(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.skill_id == payload.skill_id
    ).first()

    if existing:
        existing.proficiency = payload.proficiency
        existing.source = payload.source
        existing.confidence = payload.confidence
        db.commit()
        db.refresh(existing)
        return UserSkillResponse(
            id=existing.id,
            user_id=existing.user_id,
            skill_id=existing.skill_id,
            skill_name=skill.name,
            proficiency=existing.proficiency,
            source=existing.source,
            confidence=existing.confidence,
            created_at=existing.created_at
        )

    user_skill = UserSkill(
        id=str(uuid.uuid4()),
        user_id=user_id,
        skill_id=payload.skill_id,
        proficiency=payload.proficiency,
        source=payload.source,
        confidence=payload.confidence
    )
    db.add(user_skill)
    db.commit()
    db.refresh(user_skill)
    return UserSkillResponse(
        id=user_skill.id,
        user_id=user_skill.user_id,
        skill_id=user_skill.skill_id,
        skill_name=skill.name,
        proficiency=user_skill.proficiency,
        source=user_skill.source,
        confidence=user_skill.confidence,
        created_at=user_skill.created_at
    )

@router.delete("/{user_id}/skills/{skill_id}")
def remove_user_skill(
    user_id: str,
    skill_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and not current_user.is_leader:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to remove skills for this user")

    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.skill_id == skill_id
    ).first()
    if not user_skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill association not found")
    db.delete(user_skill)
    db.commit()
    return {"message": "Skill removed from user"}
