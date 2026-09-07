import os
import pytest
from app.database import Base, engine
import app.models.entities

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Ensure database tables exist and test secrets are set before any tests run."""
    os.environ.setdefault("JWT_SECRET", "test-secret-key-32-characters-minimum!!")
    os.environ.setdefault("GITHUB_WEBHOOK_SECRET", "test-webhook-secret-xyz")
    Base.metadata.create_all(bind=engine)
    yield
