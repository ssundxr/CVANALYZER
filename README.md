# SkillSync AI

FastAPI-based admin console for recruiter job posting and assessment generation prep.

## What It Includes

- Basic admin login with seeded credentials
- Professional recruiter dashboard UI
- Full job post intake flow based on your screenshots
- Company logo + multiple job photo uploads
- SQLite persistence for saved jobs
- Assessment blueprint builder for screening, difficulty, competencies, question mix, time, and weightage
- API response that returns a structured JSON payload ready to send to an external assessment-generation service

## Stack

- FastAPI
- Jinja2 templates
- SQLAlchemy + SQLite
- Vanilla JavaScript
- Custom CSS

## Run Locally

1. Create a virtual environment and install dependencies.
2. Start the app:

```bash
uvicorn app.main:app --reload
```

3. Open `http://127.0.0.1:8000`

## Default Admin Credentials

- Username: `admin`
- Password: `Admin@123`

You can override these with environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_DISPLAY_NAME`
- `SECRET_KEY`
- `DATABASE_URL`
- `UPLOAD_DIR`

## Key Routes

- `GET /login`
- `GET /dashboard`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/assessment-payload`

## Request Pattern For Job Creation

`POST /api/jobs` expects `multipart/form-data`:

- `payload`: JSON string with recruiter/job/assessment data
- `company_logo`: optional image file
- `job_photos`: optional repeated image files

## Returned Payload Shape

The API returns:

- `job`: the saved job record
- `assessment_payload`: the external-request JSON

The generated payload is grouped into:

- `assessment_request.employer`
- `assessment_request.job_posting`
- `assessment_request.pre_assessment_screening`
- `assessment_request.ai_generation_context`
- `assessment_request.assessment_blueprint`
- `assessment_request.recruiter_instructions`
- `assessment_request.audit`

## Assumption

No external API schema was provided, so the app produces a clean, explicit payload contract that can be mapped directly to a downstream assessment-generation API. If you have that target schema later, we can swap the mapper in `app/services/payload_builder.py` without redesigning the UI.

## Tests

Run:

```bash
pytest
```
