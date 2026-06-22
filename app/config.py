from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

data_mount = Path("/data")
is_container = data_mount.exists()
default_upload = data_mount / "uploads" if is_container else BASE_DIR / "uploads"

class Settings(BaseSettings):
    app_name: str = "SkillSync AI Assessment Recruiter"
    secret_key: str
    gemini_api_key: str
    upload_dir: Path = default_upload

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
