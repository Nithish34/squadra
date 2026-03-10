"""
api/routes/hitl.py
Scout HITL Review — only active in SCOUT_HITL pipeline mode.

GET  /api/review/{mission_id}         → poll state for HITL Review page
                                        returns WAITING_FOR_SCOUT_REVIEW + Scout findings
POST /api/review/{mission_id}/scout   → human submits reviewed/edited Scout findings
GET  /api/review/{mission_id}/status  → lightweight status check for TanStack Query

Flow (SCOUT_HITL mode only):
  Scout runs → emits scout_hitl_gate event
    → frontend routes to /review
    → TanStack Query polls GET /api/review/{id}
    → user sees Scout findings, can edit/exclude individual entries
    → user clicks Approve or Reject
    → POST /api/review/{id}/scout resolves the Redis gate
    → Scout node unblocks → Analyst → Strategist run autonomously

In AUTONOMOUS mode, this page is never reached.
The agentgraph → hitlreview connection fires only when state == WAITING_FOR_SCOUT_REVIEW.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.auth  import get_current_user
from app.core.state_store import (
    get_scout_hitl_status,
    load_pipeline_state, save_pipeline_state,
    resolve_scout_hitl_gate,
    push_event,
)
from app.schemas import (
    AgentRole, PipelineMode, PipelineStatus,
    ScoutHITLResponse, ScoutHITLReviewPayload,
    StreamEvent, StreamEventType,
)

router = APIRouter(prefix="/review", tags=["HITL Review"])


@router.get("/{mission_id}")
async def get_review_state(
    mission_id: str,
    _user: dict = Depends(get_current_user),
):
    """
    Polled by TanStack Query on the HITL Review page.
    Returns pipeline status + full Scout findings for human review.

    Frontend behaviour:
    - If pipeline_status == WAITING_FOR_SCOUT_REVIEW  → render "Review & Edit Findings" card
    - If pipeline_status == ANALYST_RUNNING etc.       → show "Approved — running analysis..." spinner
    - If pipeline_status == SCOUT_REVIEW_REJECTED      → show rejection state
    - If mode == AUTONOMOUS                            → redirect back (this page shouldn't be here)
    """
    state = await load_pipeline_state(mission_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Mission not found")

    hitl_gate_status = await get_scout_hitl_status(mission_id)

    return {
        "mission_id":        mission_id,
        "mode":              state.mode,
        "pipeline_status":   state.status,
        "hitl_gate_status":  hitl_gate_status,     # "waiting" | "approved" | "rejected" | null
        "scout_result":      state.scout_result,   # findings for human to review/edit
        "analyst_result":    state.analyst_result,  # available after approval
        "strategist_result": state.strategist_result,
        "is_autonomous":     state.mode == PipelineMode.AUTONOMOUS,
    }


@router.post("/{mission_id}/scout", response_model=ScoutHITLResponse)
async def submit_scout_review(
    mission_id: str,
    payload: ScoutHITLReviewPayload,
    _user: dict = Depends(get_current_user),
):
    """
    Human submits the Scout review decision.

    - approved=True  + edited_findings=None  → original findings forwarded as-is
    - approved=True  + edited_findings=[...] → human-edited findings replace originals
    - approved=False → pipeline halts, no Analyst/Strategist runs

    After this call, the Scout node unblocks and the autonomous
    Analyst → Strategist chain begins automatically.
    """
    state = await load_pipeline_state(mission_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Mission not found")

    if state.mode != PipelineMode.SCOUT_HITL:
        raise HTTPException(
            status_code=409,
            detail="This mission is in AUTONOMOUS mode — no HITL review required.",
        )
    if state.status != PipelineStatus.WAITING_FOR_SCOUT_REVIEW:
        raise HTTPException(
            status_code=409,
            detail=f"Mission status is {state.status}, not WAITING_FOR_SCOUT_REVIEW.",
        )

    # Apply human edits to Scout findings if provided
    if payload.approved and payload.edited_findings is not None and state.scout_result:
        state.scout_result.findings = payload.edited_findings
        await save_pipeline_state(state)

    # Count included findings
    kept = 0
    if state.scout_result:
        kept = sum(1 for f in state.scout_result.findings if f.included)

    # Resolve Redis gate — Scout node will unblock on next poll
    await resolve_scout_hitl_gate(mission_id, approved=payload.approved)

    # Emit trace event so Observability page updates (hitlreview → observability)
    import json
    await push_event(StreamEvent(
        event=StreamEventType.TRACE_EMIT,
        agent=AgentRole.SCOUT,
        data=json.dumps({
            "mission_id":    mission_id,
            "decision":      "approved" if payload.approved else "rejected",
            "findings_kept": kept,
            "reviewer_note": payload.reviewer_note,
        }),
        mission_id=mission_id,
    ))

    new_status = (
        PipelineStatus.ANALYST_RUNNING
        if payload.approved
        else PipelineStatus.SCOUT_REVIEW_REJECTED
    )

    return ScoutHITLResponse(
        mission_id    = mission_id,
        status        = new_status,
        message       = (
            f"Approved — {kept} findings forwarded. Analyst starting automatically."
            if payload.approved
            else "Rejected — pipeline halted."
        ),
        findings_kept = kept,
    )


@router.get("/{mission_id}/status")
async def hitl_status(
    mission_id: str,
    _user: dict = Depends(get_current_user),
):
    """
    Lightweight status endpoint polled every 3s by the HITL Review page
    to detect when the pipeline has moved past the Scout gate.
    Used by the agentgraph → hitlreview (WAITING state) connection.
    """
    state = await load_pipeline_state(mission_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Mission not found")

    gate = await get_scout_hitl_status(mission_id)
    return {
        "mission_id":     mission_id,
        "pipeline_status": state.status,
        "gate_status":    gate,
        "needs_review":   state.status == PipelineStatus.WAITING_FOR_SCOUT_REVIEW,
    }
