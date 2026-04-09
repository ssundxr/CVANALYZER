from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str
    secret_key: str
    database_url: str
    upload_dir: Path
    admin_username: str
    admin_password: str
    admin_display_name: str
    session_cookie_name: str = "seekats_admin"


@lru_cache
def get_settings() -> Settings:
    # Check for Azure/Docker data volume at /data
    data_mount = Path("/data")
    is_container = data_mount.exists()
    
    default_upload = data_mount / "uploads" if is_container else BASE_DIR / "uploads"
    default_db = f"sqlite:///{(data_mount / 'assessment_recruiter.db').as_posix()}" if is_container else f"sqlite:///{(BASE_DIR / 'assessment_recruiter.db').as_posix()}"
    
    upload_dir = Path(os.getenv("UPLOAD_DIR", default_upload)).resolve()
    return Settings(
        app_name=os.getenv("APP_NAME", "SeekATS Assessment Recruiter"),
        secret_key=os.getenv("SECRET_KEY", "dev-secret-key-change-me"),
        database_url=os.getenv("DATABASE_URL", default_db),
        upload_dir=upload_dir,
        admin_username=os.getenv("ADMIN_USERNAME", "admin"),
        admin_password=os.getenv("ADMIN_PASSWORD", "Admin@123"),
        admin_display_name=os.getenv("ADMIN_DISPLAY_NAME", "Assessment Admin"),
    )


settings = get_settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
