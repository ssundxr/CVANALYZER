from __future__ import annotations

from datetime import datetime

from ..models import JobPost


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def build_assessment_payload(job: JobPost) -> dict:
    employer = job.employer_details or {}
    details = job.job_details or {}
    salary = job.salary_details or {}
    candidate = job.candidate_profile or {}
    experience = job.experience_requirement or {}
    education = job.education_requirements or []
    skills = job.skills_requirement or {}
    assessment = job.assessment_config or {}
    photos = job.photos or {}

    question_breakdown = []
    total_questions = 0
    total_minutes = 0.0
    total_weight = 0.0

    for item in assessment.get("question_plan", []):
        count = int(item.get("count") or 0)
        minutes = float(item.get("minutes_per_question") or 0)
        weight = float(item.get("weight") or 0)
        subtotal = round(count * minutes, 2)
        total_questions += count
        total_minutes += subtotal
        total_weight += weight
        question_breakdown.append(
            {
                "type": item.get("key"),
                "label": item.get("label"),
                "count": count,
                "minutes_per_question": minutes,
                "total_minutes": subtotal,
                "weight": weight,
            }
        )

    return {
        "assessment_request": {
            "assessment_name": assessment.get("assessment_name") or f"{details.get('job_title', 'Role')} Assessment",
            "assessment_number": job.assessment_number,
            "job_number": job.job_number,
            "status": job.status,
            "employer": employer,
            "job_posting": {
                "job_details": details,
                "salary_details": salary,
                "candidate_profile": candidate,
                "experience_requirement": experience,
                "education_requirements": education,
                "skills_requirement": skills,
                "custom_questions": job.custom_questions or [],
                "application_mode": job.application_mode,
                "media_assets": photos,
            },
            "pre_assessment_screening": {
                "enabled_fields": assessment.get("screening_fields", []),
                "candidate_questions": job.custom_questions or [],
            },
            "ai_generation_context": {
                "knowledge_sources": assessment.get("knowledge_sources", []),
                "roles_and_responsibilities": details.get("roles_and_responsibilities"),
                "desired_candidate_profile": details.get("desired_candidate_profile"),
                "functional_skills": skills.get("functional_skills", []),
                "professional_skills": skills.get("professional_skills", []),
                "it_skills": skills.get("it_skills", []),
                "experience_general_years": experience.get("work_experience_years", {}),
                "experience_gcc_years": experience.get("gcc_experience_years", {}),
            },
            "assessment_blueprint": {
                "goals": assessment.get("goals", []),
                "difficulty": assessment.get("difficulty"),
                "competencies": assessment.get("competencies", []),
                "delivery_rules": assessment.get("delivery_rules", []),
                "question_breakdown": question_breakdown,
                "totals": {
                    "question_count": total_questions,
                    "estimated_minutes": round(total_minutes, 2),
                    "weightage_percent": round(total_weight, 2),
                },
            },
            "recruiter_instructions": job.recruiter_instructions,
            "audit": {
                "created_at": _isoformat(job.created_at),
                "updated_at": _isoformat(job.updated_at),
                "created_by": getattr(job.creator, "display_name", None),
            },
        }
    }
