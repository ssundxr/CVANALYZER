from __future__ import annotations
import os
from pathlib import Path
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parents[1]
TEST_UPLOADS = BASE_DIR / "test_uploads"

os.environ["SECRET_KEY"] = "test-secret"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOADS)
os.environ["GEMINI_API_KEY"] = "test-key"

from app.main import app

def test_health_check() -> None:
    with TestClient(app) as client:
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
