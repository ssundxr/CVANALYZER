from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .config import BASE_DIR, settings
from .database import init_db
from .routers import api, auth


import subprocess
import os
import time
import httpx
import sys
from fastapi import Request
from fastapi.responses import StreamingResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    init_db()
    
    # Start Datasette in the background on port 8001
    db_path = settings.database_url.replace("sqlite:///", "")
    if not db_path.startswith("/") and ":" not in db_path:
        db_path = str(BASE_DIR / db_path)
    
    print(f"Starting Datasette on {db_path} with base-url /db-explorer/")
    try:
        # Use sys.executable to ensure we use the same python environment
        # --setting base_url /db-explorer/ ensures internal links work with the proxy
        proc = subprocess.Popen([
            sys.executable, "-m", "datasette", "serve",
            db_path, 
            "--port", "8001", 
            "--host", "127.0.0.1",
            "--setting", "base_url", "/db-explorer/",
            "--cors"
        ])
        app.state.db_proc = proc
    except Exception as e:
        print(f"WARNING: Failed to start Datasette: {e}")
        app.state.db_proc = None
    
    yield
    
    # Cleanup
    if app.state.db_proc:
        app.state.db_proc.terminate()

app = FastAPI(
    title="SeekATS Assessment Recruiter API",
    description="Recruiter portal for job posting and AI-powered assessment generation",
    version="0.2.0",
    lifespan=lifespan,
)

# ── Database Explorer Proxy (Datasette) ──────────────────────────────────
@app.api_route("/db-explorer/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def db_explorer_proxy(request: Request, path: str):
    # Datasette is configured with base_url /db-explorer/, so we proxy to the root
    # but include the /db-explorer/ prefix in the internal request
    url = f"http://127.0.0.1:8001/db-explorer/{path}"
    
    if request.query_params:
        url += f"?{request.query_params}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            content = await request.body()
            resp = await client.request(
                method=request.method,
                url=url,
                headers={k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length", "accept-encoding")},
                content=content,
                follow_redirects=False
            )
            
            return StreamingResponse(
                resp.aiter_raw(),
                status_code=resp.status_code,
                headers={k: v for k, v in resp.headers.items() if k.lower() not in ("content-encoding", "transfer-encoding")}
            )
    except Exception as e:
        return HTMLResponse(f"<h3>Database Explorer Unavailable</h3><p>{e}</p>", status_code=503)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    session_cookie=settings.session_cookie_name,
    same_site="lax",
    https_only=False,
)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "app" / "static")), name="static")
app.mount("/media", StaticFiles(directory=str(settings.upload_dir)), name="media")

app.include_router(auth.router)
app.include_router(api.router)

from .routers import candidate_auth, candidate_api
app.include_router(candidate_auth.router)
app.include_router(candidate_api.router)

from cv_analyzer_api.router import router as cv_analyzer_router
app.include_router(cv_analyzer_router)

# Serve React SPA as the primary frontend.
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react_app(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        
        # If it's a request for an asset that doesn't exist, return 404 instead of index.html
        if full_path.startswith("assets/") or full_path.startswith("static/"):
            raise HTTPException(status_code=404, detail="Asset not found")

        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return HTMLResponse(
            "<h1 style='font-family:monospace'>SeekATS API running</h1>"
            "<p>Build the frontend first:<br>"
            "<code>cd frontend && npm install && npm run build</code></p>"
            "<p><a href='/docs'>API Docs →</a></p>"
        )
