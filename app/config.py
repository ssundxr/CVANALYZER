from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

data_mount = Path("/data")
is_container = data_mount.exists()
default_upload = data_mount / "uploads" if is_container else BASE_DIR / "uploads"
default_db = f"sqlite:///{(data_mount / 'assessment_recruiter.db').as_posix()}" if is_container else f"sqlite:///{(BASE_DIR / 'assessment_recruiter.db').as_posix()}"

class Settings(BaseSettings):
    app_name: str = "SkillSync AI Assessment Recruiter"
    secret_key: str
    gemini_api_key: str
    database_url: str = default_db
    upload_dir: Path = default_upload
    admin_username: str = "admin"
    admin_password: str = "Admin@123"
    admin_display_name: str = "Assessment Admin"
    session_cookie_name: str = "skillsync_admin"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
