"""
app/api/routes/dashboard.py — Mission list + stats.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any
from fastapi import APIRouter, Depends
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# In-memory mission registry (keyed by user email)
_mission_registry: dict[str, list[dict]] = {}


def register_mission(user_email: str, mission_id: str, setup_data: dict) -> None:
    _mission_registry.setdefault(user_email, []).append({
        "mission_id": mission_id,
        "created_at": datetime.utcnow().isoformat(),
        **setup_data,
    })


@router.get("/missions")
async def list_missions(user: dict = Depends(get_current_user)) -> Any:
    missions = _mission_registry.get(user["email"], [])
    return {"missions": list(reversed(missions)), "total": len(missions)}
