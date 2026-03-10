"""
app/main.py — FastAPI application entry point.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, setup, stream, hitl, graph, dashboard

app = FastAPI(
    title="Market Intelligence War Room",
    version="2.0.0",
    description="Multi-agent market intelligence: Scout → Analyst → Strategist",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router,      prefix=API_PREFIX)
app.include_router(setup.router,     prefix=API_PREFIX)
app.include_router(stream.router,    prefix=API_PREFIX)
app.include_router(hitl.router,      prefix=API_PREFIX)
app.include_router(graph.router,     prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "market-intelligence-backend"}
