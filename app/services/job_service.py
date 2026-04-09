from __future__ import annotations

from datetime import datetime, timezone
from secrets import randbelow

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AdminUser, JobPost
from ..schemas import JobCreate, Photos


class JobService:
    @staticmethod
    def _make_reference(prefix: str) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
        return f"{prefix}{timestamp}{randbelow(900) + 100}"

    @classmethod
    def create_job(
        cls,
        db: Session,
        admin: AdminUser,
        data: JobCreate,
        photos: Photos,
    ) -> JobPost:
        job = JobPost(
            job_number=cls._make_reference("JOB"),
            assessment_number=cls._make_reference("ASM"),
            status=data.status,
            creator_id=admin.id,
            employer_details=data.employer_details.model_dump(mode="json"),
            job_details=data.job_details.model_dump(mode="json"),
            salary_details=data.salary_details.model_dump(mode="json"),
            candidate_profile=data.candidate_profile.model_dump(mode="json"),
            experience_requirement=data.experience_requirement.model_dump(mode="json"),
            education_requirements=[
                edu.model_dump(mode="json") for edu in data.education_requirements
            ],
            skills_requirement=data.skills_requirement.model_dump(mode="json"),
            custom_questions=data.custom_questions,
            recruiter_instructions=data.recruiter_instructions,
            application_mode=data.application_mode,
            photos=photos.model_dump(mode="json"),
            assessment_config=data.assessment_config.model_dump(mode="json"),
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def list_jobs(db: Session) -> list[JobPost]:
        return list(db.scalars(select(JobPost).order_by(JobPost.created_at.desc())).all())

    @staticmethod
    def get_job(db: Session, job_id: int) -> JobPost | None:
        return db.get(JobPost, job_id)
