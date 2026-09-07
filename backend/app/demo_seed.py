import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.entities import (
    Project, User, Skill, UserSkill, Task, TaskDependency, WorkEvent, SystemSettings
)

def clear_all_data(db: Session):
    """Deletes all application data for a fresh state."""
    db.query(TaskDependency).delete()
    db.query(WorkEvent).delete()
    db.query(Task).delete()
    db.query(UserSkill).delete()
    db.query(Skill).delete()
    db.query(User).delete()
    db.query(Project).delete()
    db.commit()

def seed_demo_data(db: Session) -> Project:
    """
    Seeds a realistic multi-member, multi-task project dataset.
    All data is stored purely as regular rows with zero custom code in the intelligence engine.
    """
    # Clean previous demo if any
    clear_all_data(db)

    now = datetime.now(timezone.utc)

    # 1. Project
    project = Project(
        id=str(uuid.uuid4()),
        name="EquiFlow Cloud Platform",
        description="High-throughput distributed workflow orchestration service with multi-region replication.",
        start_date=now - timedelta(days=7),
        target_end_date=now + timedelta(days=14)
    )
    db.add(project)
    db.flush()

    # 2. Skills
    skills_map = {}
    skill_definitions = [
        ("Distributed Systems", "Engineering"),
        ("Cloud Architecture", "Architecture"),
        ("Database Optimization", "Data"),
        ("Frontend Architecture", "Engineering"),
        ("Security & IAM", "Security")
    ]
    for s_name, s_cat in skill_definitions:
        skill = Skill(id=str(uuid.uuid4()), name=s_name, category=s_cat)
        db.add(skill)
        db.flush()
        skills_map[s_name] = skill

    # 3. Users / Members
    users_data = [
        {
            "name": "Elena Rostova",
            "role": "Staff Systems Architect",
            "capacity": 8.0,
            "skills": [("Distributed Systems", "EXPERT"), ("Cloud Architecture", "EXPERT")]
        },
        {
            "name": "Marcus Vance",
            "role": "Senior Backend Engineer",
            "capacity": 8.0,
            "skills": [("Distributed Systems", "STANDARD"), ("Database Optimization", "EXPERT")]
        },
        {
            "name": "Devon Reed",
            "role": "Cloud Platform Engineer",
            "capacity": 8.0,
            "skills": [("Distributed Systems", "EXPERT"), ("Cloud Architecture", "STANDARD")]
        },
        {
            "name": "Priya Sharma",
            "role": "Lead Frontend Engineer",
            "capacity": 7.0,
            "skills": [("Frontend Architecture", "EXPERT")]
        },
        {
            "name": "Liam O'Connor",
            "role": "Security & SRE Engineer",
            "capacity": 8.0,
            "skills": [("Security & IAM", "EXPERT"), ("Cloud Architecture", "NOVICE")]
        }
    ]

    users_map = {}
    for u_info in users_data:
        user = User(
            id=str(uuid.uuid4()),
            name=u_info["name"],
            role=u_info["role"],
            daily_capacity=u_info["capacity"]
        )
        db.add(user)
        db.flush()
        users_map[user.name] = user

        for skill_name, prof in u_info["skills"]:
            user_skill = UserSkill(
                id=str(uuid.uuid4()),
                user_id=user.id,
                skill_id=skills_map[skill_name].id,
                proficiency=prof,
                source="MANUAL",
                confidence=1.0
            )
            db.add(user_skill)

    # 4. Tasks
    tasks_data = [
        {
            "id": "TASK-101",
            "title": "Distributed Session & Auth Service",
            "description": "Core token signing and session synchronization engine across geo-distributed nodes.",
            "assignee": "Elena Rostova",
            "estimated_hours": 16.0,
            "remaining_hours": 14.0,
            "status": "IN_PROGRESS",
            "priority": "CRITICAL",
            "complexity": "HIGH",
            "due_date": now + timedelta(days=2),
            "skill": "Distributed Systems"
        },
        {
            "id": "TASK-102",
            "title": "Database Sharding & Connection Pool",
            "description": "Dynamic connection pool partitioning for PostgreSQL write replicas.",
            "assignee": "Marcus Vance",
            "estimated_hours": 10.0,
            "remaining_hours": 8.0,
            "status": "IN_PROGRESS",
            "priority": "HIGH",
            "complexity": "HIGH",
            "due_date": now + timedelta(days=3),
            "skill": "Database Optimization"
        },
        {
            "id": "TASK-103",
            "title": "Event Bus Ingestion Worker",
            "description": "Consumer queue daemon ingesting Kafka topics into state stores.",
            "assignee": "Devon Reed",
            "estimated_hours": 8.0,
            "remaining_hours": 4.0,
            "status": "TODO",
            "priority": "MEDIUM",
            "complexity": "MEDIUM",
            "due_date": now + timedelta(days=5),
            "skill": "Distributed Systems"
        },
        {
            "id": "TASK-104",
            "title": "Admin Security Audit Dashboard",
            "description": "React-based real-time auditing UI for tenant authorization changes.",
            "assignee": "Priya Sharma",
            "estimated_hours": 12.0,
            "remaining_hours": 10.0,
            "status": "TODO",
            "priority": "HIGH",
            "complexity": "MEDIUM",
            "due_date": now + timedelta(days=5),
            "skill": "Frontend Architecture"
        },
        {
            "id": "TASK-105",
            "title": "OAuth Token Refresh Interceptor",
            "description": "Client-side silent renew interceptor and storage bridge.",
            "assignee": "Priya Sharma",
            "estimated_hours": 8.0,
            "remaining_hours": 6.0,
            "status": "TODO",
            "priority": "HIGH",
            "complexity": "MEDIUM",
            "due_date": now + timedelta(days=4),
            "skill": "Frontend Architecture"
        },
        {
            "id": "TASK-106",
            "title": "mTLS Certificate Rotation Service",
            "description": "Automated Let's Encrypt / internal CA certificate renewal job.",
            "assignee": "Liam O'Connor",
            "estimated_hours": 8.0,
            "remaining_hours": 6.0,
            "status": "IN_PROGRESS",
            "priority": "MEDIUM",
            "complexity": "MEDIUM",
            "due_date": now + timedelta(days=4),
            "skill": "Security & IAM"
        },
        {
            "id": "TASK-107",
            "title": "Grafana Telemetry & Rate Limiting",
            "description": "Envoy proxy rate limiter rules and dashboard visualizations.",
            "assignee": "Liam O'Connor",
            "estimated_hours": 6.0,
            "remaining_hours": 4.0,
            "status": "TODO",
            "priority": "LOW",
            "complexity": "LOW",
            "due_date": now + timedelta(days=7),
            "skill": "Cloud Architecture"
        }
    ]

    for t_info in tasks_data:
        task = Task(
            id=t_info["id"],
            title=t_info["title"],
            description=t_info["description"],
            project_id=project.id,
            assignee_id=users_map[t_info["assignee"]].id if t_info["assignee"] else None,
            estimated_hours=t_info["estimated_hours"],
            remaining_hours=t_info["remaining_hours"],
            status=t_info["status"],
            priority=t_info["priority"],
            complexity=t_info["complexity"],
            due_date=t_info["due_date"],
            required_skill_id=skills_map[t_info["skill"]].id if t_info["skill"] else None
        )
        db.add(task)

    db.flush()

    # 5. Dependencies (Explicit & Inferred)
    dependencies_data = [
        ("TASK-101", "TASK-104", "FINISH_TO_START", "EXPLICIT"),
        ("TASK-101", "TASK-105", "FINISH_TO_START", "EXPLICIT"),
        ("TASK-102", "TASK-103", "FINISH_TO_START", "EXPLICIT"),
        ("TASK-105", "TASK-104", "FINISH_TO_START", "INFERRED")
    ]
    for b_id, d_id, dep_type, conf in dependencies_data:
        dep = TaskDependency(
            id=str(uuid.uuid4()),
            blocking_task_id=b_id,
            dependent_task_id=d_id,
            dependency_type=dep_type,
            confidence=conf
        )
        db.add(dep)

    # 6. Work Events (PR Reviews, Support, Meetings, Context Switching)
    events_data = [
        # Elena: High hidden work + meetings + context switches
        (users_map["Elena Rostova"].id, "PR_REVIEW", 2.5, "github:repo-auth", now - timedelta(hours=18)),
        (users_map["Elena Rostova"].id, "MEETINGS", 2.0, "slack:#architecture", now - timedelta(hours=14)),
        (users_map["Elena Rostova"].id, "SUPPORT", 1.5, "slack:#tier3-escalations", now - timedelta(hours=10)),
        (users_map["Elena Rostova"].id, "PR_REVIEW", 1.0, "github:repo-db", now - timedelta(hours=6)),
        (users_map["Elena Rostova"].id, "INTERRUPTIONS", 0.5, "slack:#prod-incidents", now - timedelta(hours=2)),

        # Marcus: 1.5h meetings, 1.0h rework
        (users_map["Marcus Vance"].id, "MEETINGS", 1.5, "slack:#standup", now - timedelta(hours=15)),
        (users_map["Marcus Vance"].id, "REWORK", 1.0, "github:repo-db", now - timedelta(hours=8)),

        # Devon: 0.5h meetings
        (users_map["Devon Reed"].id, "MEETINGS", 0.5, "slack:#standup", now - timedelta(hours=15)),

        # Priya: 1.0h PR review
        (users_map["Priya Sharma"].id, "PR_REVIEW", 1.0, "github:repo-frontend", now - timedelta(hours=12)),

        # Liam: 2.0h customer support
        (users_map["Liam O'Connor"].id, "SUPPORT", 2.0, "slack:#security-triage", now - timedelta(hours=9)),
    ]

    for uid, ev_type, hrs, ctx, ts in events_data:
        event = WorkEvent(
            id=str(uuid.uuid4()),
            user_id=uid,
            project_id=project.id,
            event_type=ev_type,
            estimated_hidden_hours=hrs,
            context_channel=ctx,
            event_timestamp=ts
        )
        db.add(event)

    # Ensure default system settings exist
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
    return project
