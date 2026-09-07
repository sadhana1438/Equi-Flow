from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models.entities import Skill
from app.schemas.dtos import SkillCreate, SkillResponse

router = APIRouter(prefix="/api/skills", tags=["skills"])

@router.get("", response_model=List[SkillResponse])
def list_skills(db: Session = Depends(get_db)):
    return db.query(Skill).order_by(Skill.name.asc()).all()

@router.post("", response_model=SkillResponse)
def create_skill(payload: SkillCreate, db: Session = Depends(get_db)):
    existing = db.query(Skill).filter(Skill.name.ilike(payload.name.strip())).first()
    if existing:
        return existing

    skill = Skill(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        category=payload.category or "Engineering"
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill

@router.delete("/{skill_id}")
def delete_skill(skill_id: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted"}
