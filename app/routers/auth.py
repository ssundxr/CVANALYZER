from __future__ import annotations

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..auth import authenticate_user, create_access_token, get_current_user, require_admin_api
from ..config import settings
from ..database import get_db
from ..schemas import LoginRequest, TokenResponse
from ..templating import templates

router = APIRouter(tags=["auth"])


@router.post("/api/auth/login", response_model=TokenResponse)
def api_login(body: LoginRequest, db: Session = Depends(get_db)):
    """JWT login for the React frontend."""
    user = authenticate_user(db, body.username, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")
    token = create_access_token(user.id, settings.secret_key)
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "username": user.username, "display_name": user.display_name},
    )


@router.get("/api/auth/me")
def get_me(request: Request, db: Session = Depends(get_db)):
    user = require_admin_api(request, db)
    return {"id": user.id, "username": user.username, "display_name": user.display_name}


# Legacy session routes (kept for /docs usage)
@router.post("/auth/login")
def login(request: Request, username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = authenticate_user(db, username, password)
    if not user:
        return templates.TemplateResponse(
            request, "login.html",
            {"error": "Invalid username or password.", "default_username": settings.admin_username},
            status_code=400,
        )
    request.session["user_id"] = user.id
    return RedirectResponse(url="/admin/dashboard", status_code=303)


@router.post("/auth/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/admin/login", status_code=303)
