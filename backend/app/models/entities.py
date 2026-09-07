import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

import random
import string

def generate_uuid():
    return str(uuid.uuid4())

def generate_join_code():
    # Generates clean, human-readable codes like EQ-8492
    num_part = ''.join(random.choices(string.digits, k=4))
    return f"EQ-{num_part}"

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    join_code = Column(String(20), unique=True, nullable=False, default=generate_join_code, index=True)
    start_date = Column(DateTime, nullable=True)
    target_end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    work_events = relationship("WorkEvent", back_populates="project")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False, index=True)
    role = Column(String(100), nullable=False, default="Engineer")
    is_leader = Column(Boolean, default=False)
    daily_capacity = Column(Float, nullable=False, default=8.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tasks = relationship("Task", back_populates="assignee")
    user_skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    work_events = relationship("WorkEvent", back_populates="user", cascade="all, delete-orphan")
    project_memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_project = Column(String(50), default="MEMBER")  # LEADER, MEMBER
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint('project_id', 'user_id', name='uq_project_user'),)

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")

class Skill(Base):
    __tablename__ = "skills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, unique=True, index=True)
    category = Column(String(100), nullable=True, default="Engineering")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user_skills = relationship("UserSkill", back_populates="skill", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="required_skill")

class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(String(36), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    proficiency = Column(String(20), nullable=False, default="STANDARD")  # EXPERT, STANDARD, NOVICE
    source = Column(String(20), nullable=False, default="MANUAL")        # MANUAL, INFERRED
    confidence = Column(Float, nullable=False, default=1.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint('user_id', 'skill_id', name='uq_user_skill'),)

    user = relationship("User", back_populates="user_skills")
    skill = relationship("Skill", back_populates="user_skills")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(50), primary_key=True)  # custom ID like EQ-101 or UUID
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    assignee_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    estimated_hours = Column(Float, nullable=True)
    remaining_hours = Column(Float, nullable=False, default=4.0)
    status = Column(String(20), nullable=False, default="TODO")  # TODO, IN_PROGRESS, IN_REVIEW, DONE
    priority = Column(String(20), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    complexity = Column(String(20), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH
    due_date = Column(DateTime, nullable=True)
    required_skill_id = Column(String(36), ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")
    required_skill = relationship("Skill", back_populates="tasks")

    # Relationships for DAG
    blocking_dependencies = relationship(
        "TaskDependency",
        foreign_keys="[TaskDependency.blocking_task_id]",
        back_populates="blocking_task",
        cascade="all, delete-orphan"
    )
    dependent_dependencies = relationship(
        "TaskDependency",
        foreign_keys="[TaskDependency.dependent_task_id]",
        back_populates="dependent_task",
        cascade="all, delete-orphan"
    )

class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    blocking_task_id = Column(String(50), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    dependent_task_id = Column(String(50), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    dependency_type = Column(String(50), nullable=False, default="FINISH_TO_START")
    confidence = Column(String(20), nullable=False, default="EXPLICIT")  # EXPLICIT, INFERRED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint('blocking_task_id', 'dependent_task_id', name='uq_dependency_pair'),)

    blocking_task = relationship("Task", foreign_keys=[blocking_task_id], back_populates="blocking_dependencies")
    dependent_task = relationship("Task", foreign_keys=[dependent_task_id], back_populates="dependent_dependencies")

class WorkEvent(Base):
    __tablename__ = "work_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # PR_REVIEW, SUPPORT, COMMENTS, MEETINGS, ARCHITECTURE, REWORK, INTERRUPTIONS
    estimated_hidden_hours = Column(Float, nullable=False, default=0.0)
    context_channel = Column(String(255), nullable=True)  # repo name, slack channel, project identifier for fragmentation
    event_timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="work_events")
    project = relationship("Project", back_populates="work_events")

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(String(50), primary_key=True, default="default")
    healthy_threshold = Column(Float, nullable=False, default=0.8)
    near_capacity_threshold = Column(Float, nullable=False, default=1.0)
    default_capacity = Column(Float, nullable=False, default=8.0)
    raw_retention_days = Column(Integer, nullable=False, default=90)
    theme = Column(String(20), nullable=False, default="dark")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
