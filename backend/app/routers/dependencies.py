from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import networkx as nx

from app.database import get_db
from app.models.entities import TaskDependency, Task, User
from app.schemas.dtos import DependencyCreate, DependencyResponse
from app.security import get_current_user, verify_project_access

router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])

@router.get("", response_model=List[DependencyResponse])
def list_dependencies(
    task_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(TaskDependency)
    if task_id:
        query = query.filter(
            (TaskDependency.blocking_task_id == task_id) | 
            (TaskDependency.dependent_task_id == task_id)
        )
    return query.all()

@router.post("", response_model=DependencyResponse)
def create_dependency(
    payload: DependencyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.blocking_task_id == payload.dependent_task_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A task cannot depend on itself.")

    b_task = db.query(Task).filter(Task.id == payload.blocking_task_id).first()
    d_task = db.query(Task).filter(Task.id == payload.dependent_task_id).first()
    if not b_task or not d_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both tasks not found.")

    verify_project_access(b_task.project_id, current_user, db)

    # Check for duplicate
    existing = db.query(TaskDependency).filter(
        TaskDependency.blocking_task_id == payload.blocking_task_id,
        TaskDependency.dependent_task_id == payload.dependent_task_id
    ).first()
    if existing:
        return existing

    # Cycle detection check via NetworkX
    all_deps = db.query(TaskDependency).all()
    G = nx.DiGraph()
    for d in all_deps:
        G.add_edge(d.blocking_task_id, d.dependent_task_id)
    G.add_edge(payload.blocking_task_id, payload.dependent_task_id)

    if not nx.is_directed_acyclic_graph(G):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Creating this dependency introduces a circular dependency cycle.")

    dep = TaskDependency(
        id=str(uuid.uuid4()),
        blocking_task_id=payload.blocking_task_id,
        dependent_task_id=payload.dependent_task_id,
        dependency_type=payload.dependency_type,
        confidence=payload.confidence
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep

@router.delete("/{dependency_id}")
def delete_dependency(
    dependency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dep = db.query(TaskDependency).filter(TaskDependency.id == dependency_id).first()
    if not dep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dependency not found")

    b_task = db.query(Task).filter(Task.id == dep.blocking_task_id).first()
    if b_task:
        verify_project_access(b_task.project_id, current_user, db)

    db.delete(dep)
    db.commit()
    return {"message": "Dependency deleted successfully"}
