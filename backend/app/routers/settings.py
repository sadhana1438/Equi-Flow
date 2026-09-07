from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import SystemSettings
from app.schemas.dtos import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

def get_or_create_settings(db: Session) -> SystemSettings:
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings(
            id="default",
            healthy_threshold=0.8,
            near_capacity_threshold=1.0,
            default_capacity=8.0,
            raw_retention_days=90,
            theme="dark"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    return SettingsResponse(
        healthy_threshold=settings.healthy_threshold,
        near_capacity_threshold=settings.near_capacity_threshold,
        default_capacity=settings.default_capacity,
        raw_retention_days=settings.raw_retention_days,
        theme=settings.theme
    )

@router.put("", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    if payload.healthy_threshold is not None:
        settings.healthy_threshold = payload.healthy_threshold
    if payload.near_capacity_threshold is not None:
        settings.near_capacity_threshold = payload.near_capacity_threshold
    if payload.default_capacity is not None:
        settings.default_capacity = payload.default_capacity
    if payload.raw_retention_days is not None:
        settings.raw_retention_days = payload.raw_retention_days
    if payload.theme is not None:
        settings.theme = payload.theme

    db.commit()
    db.refresh(settings)
    return SettingsResponse(
        healthy_threshold=settings.healthy_threshold,
        near_capacity_threshold=settings.near_capacity_threshold,
        default_capacity=settings.default_capacity,
        raw_retention_days=settings.raw_retention_days,
        theme=settings.theme
    )
