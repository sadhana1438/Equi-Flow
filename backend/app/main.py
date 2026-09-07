from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import app.models.entities
from app.database import engine, Base
from app.routers import (
    auth,
    projects,
    users,
    skills,
    tasks,
    dependencies,
    work_events,
    intelligence,
    simulation,
    analytics,
    integrations,
    notifications,
    settings,
    webhooks,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables exist on startup
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="EquiFlow Intelligence Engine API",
    description="Intelligent Workload Management & Decision Support Engine",
    version="1.0.0",
    lifespan=lifespan
)

import os

# CORS Configuration
_raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [orig.strip() for orig in _raw_origins.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(users.router)
app.include_router(skills.router)
app.include_router(tasks.router)
app.include_router(dependencies.router)
app.include_router(work_events.router)
app.include_router(intelligence.router)
app.include_router(simulation.router)
app.include_router(analytics.router)
app.include_router(integrations.router)
app.include_router(notifications.router)
app.include_router(settings.router)
app.include_router(webhooks.router)

@app.get("/")
def root():
    return {
        "app": "EquiFlow Intelligence Engine",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health():
    return {"status": "healthy"}
