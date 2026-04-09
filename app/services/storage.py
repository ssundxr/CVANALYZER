from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from ..config import settings


def save_upload(file: UploadFile | None) -> dict | None:
    if file is None or not file.filename:
        return None

    extension = Path(file.filename).suffix.lower() or ".bin"
    stored_name = f"{uuid4().hex}{extension}"
    destination = settings.upload_dir / stored_name

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "original_name": file.filename,
        "stored_name": stored_name,
        "content_type": file.content_type,
        "url": f"/media/{stored_name}",
    }
