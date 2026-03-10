"""
api/routes/setup.py
POST /api/setup              → validate + launch pipeline (returns 202)
GET  /api/setup/{mission_id} → poll full pipeline state

The enable_scout_hitl flag on MissionSetup is the single switch:
  false (default) → AUTONOMOUS mode — Scout/Analyst/Strategist run fully autonomously
  true            → SCOUT_HITL mode — pipeline pauses after Scout for human review
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.agents.pipeline       import launch_pipeline
from app.api.routes.auth       import get_current_user
from app.api.routes.dashboard  import register_mission
from app.core.state_store      import load_pipeline_state
from app.schemas import (
    MissionResponse, MissionSetup,
    PipelineMode, PipelineStatus,
)

router = APIRouter(prefix="/setup", tags=["Mission Setup"])


@router.post("", response_model=MissionResponse, status_code=202)
async def create_mission(
    payload: MissionSetup,
    _user: dict = Depends(get_current_user),
):
    """
    Validates config and launches the pipeline as a background task.
    Returns 202 Accepted immediately.

    enable_scout_hitl=false (default):
      → AUTONOMOUS — Scout→Analyst→Strategist runs fully without pausing.
        Frontend only needs the SSE stream to show live thoughts.

    enable_scout_hitl=true:
      → SCOUT_HITL — Scout runs, then emits scout_hitl_gate event.
        Frontend should listen for this event and route to /review.
        After human approval, Analyst+Strategist run autonomously.
    """
    mode = PipelineMode.SCOUT_HITL if payload.enable_scout_hitl else PipelineMode.AUTONOMOUS
    mission_id = await launch_pipeline(payload)

    register_mission(
        user_email=_user["email"],
        mission_id=mission_id,
        setup_data={**payload.model_dump(), "mode": mode},
    )

    if payload.enable_scout_hitl:
        msg = (
            "SCOUT_HITL pipeline launched. "
            "Subscribe to /api/stream/{id} — pipeline will emit 'scout_hitl_gate' "
            "when Scout findings are ready for your review at /review."
        )
    else:
        msg = (
            "AUTONOMOUS pipeline launched. "
            "Subscribe to /api/stream/{id} for live thoughts. "
            "No human intervention required — strategy will auto-publish when complete."
        )

    return MissionResponse(
        mission_id=mission_id,
        mode=mode,
        status=PipelineStatus.SCOUT_RUNNING,
        created_at=datetime.utcnow(),
        message=msg,
    )


@router.get("/{mission_id}")
async def get_mission_state(
    mission_id: str,
    _user: dict = Depends(get_current_user),
):
    """Full pipeline state — polled by TanStack Query on Dashboard Shell."""
    state = await load_pipeline_state(mission_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"Mission {mission_id} not found")
    return state
