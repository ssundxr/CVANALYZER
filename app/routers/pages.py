from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import JobPost
from ..services.reference_data import DEFAULT_ASSESSMENT_CONFIG, REFERENCE_DATA
from ..templating import templates

router = APIRouter(tags=["pages"])


@router.get("/", include_in_schema=False)
def root(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    return RedirectResponse(url="/admin" if user else "/login", status_code=303)


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request, db: Session = Depends(get_db)):
    if get_current_user(request, db):
        return RedirectResponse(url="/admin", status_code=303)

    return templates.TemplateResponse(
        request,
        "login.html",
        {
            "default_username": settings.admin_username,
            "default_password": settings.admin_password,
        },
    )


@router.get("/admin", response_class=HTMLResponse)
def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=303)

    jobs = db.scalars(select(JobPost).order_by(JobPost.created_at.desc()).limit(8)).all()
    recent_jobs = [
        {
            "id": job.id,
            "job_number": job.job_number,
            "assessment_number": job.assessment_number,
            "status": job.status,
            "job_title": (job.job_details or {}).get("job_title", "Untitled Role"),
            "company_name": (job.employer_details or {}).get("company_name", "Unknown Company"),
            "created_at": job.created_at.strftime("%d %b %Y") if job.created_at else "-",
        }
        for job in jobs
    ]

    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "user": user,
            "recent_jobs": recent_jobs,
            "reference_data_json": json.dumps(REFERENCE_DATA),
            "default_assessment_json": json.dumps(DEFAULT_ASSESSMENT_CONFIG),
        },
    )
