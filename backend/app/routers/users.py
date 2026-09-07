from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.database import get_db
from app.models.entities import User, UserSkill, Skill, ProjectMember, Task, Project
from app.schemas.dtos import (
    UserCreate, UserUpdate, UserResponse, UserSkillCreate, UserSkillResponse, UserSkillInline
)

router = APIRouter(prefix="/api/users", tags=["users"])

def map_user_to_response(user: User) -> UserResponse:
    inline_skills = []
    for us in user.user_skills:
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
def list_users(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    if project_id:
        member_ids = {m.user_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()}
        task_assignee_ids = {t.assignee_id for t in db.query(Task).filter(Task.project_id == project_id).all() if t.assignee_id}
        relevant_ids = member_ids | task_assignee_ids
        if relevant_ids:
            users = db.query(User).filter(User.id.in_(relevant_ids)).order_by(User.name.asc()).all()
        else:
            users = []
    else:
        users = db.query(User).order_by(User.name.asc()).all()
    return [map_user_to_response(u) for u in users]

@router.post("", response_model=UserResponse)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
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
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return map_user_to_response(user)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.post("/{user_id}/skills", response_model=UserSkillResponse)
def add_user_skill(user_id: str, payload: UserSkillCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    skill = db.query(Skill).filter(Skill.id == payload.skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

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
def remove_user_skill(user_id: str, skill_id: str, db: Session = Depends(get_db)):
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.skill_id == skill_id
    ).first()
    if not user_skill:
        raise HTTPException(status_code=404, detail="Skill association not found")
    db.delete(user_skill)
    db.commit()
    return {"message": "Skill removed from user"}
