"""
api/routes/graph.py
GET /api/graph/{mission_id}

Returns React Flow nodes + edges reflecting LIVE pipeline status.
Handles both AUTONOMOUS and SCOUT_HITL modes — Scout node shows
"hitl_paused" state in SCOUT_HITL mode when waiting for review.

Connection: warroom → agentgraph (SSE update)
            agentgraph → hitlreview (WAITING state) — only in SCOUT_HITL mode
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.auth  import get_current_user
from app.core.state_store import load_pipeline_state
from app.schemas          import PipelineMode, PipelineStatus

router = APIRouter(prefix="/graph", tags=["Agent Graph"])


def _node_status(pipeline_status: PipelineStatus, node_id: str, mode: PipelineMode) -> str:
    """
    Returns visual state for a React Flow node:
    idle | running | hitl_paused | done | error
    """
    ORDER = ["scout", "analyst", "strategist"]

    if pipeline_status == PipelineStatus.FAILED:
        return "error"

    if pipeline_status == PipelineStatus.SCOUT_REVIEW_REJECTED:
        return "error" if node_id == "scout" else "idle"

    if pipeline_status == PipelineStatus.WAITING_FOR_SCOUT_REVIEW:
        if node_id == "scout":
            return "hitl_paused"
        return "idle"

    if pipeline_status in (PipelineStatus.SCOUT_REVIEW_APPROVED, PipelineStatus.ANALYST_RUNNING):
        if node_id == "scout":    return "done"
        if node_id == "analyst":  return "running"
        return "idle"

    if pipeline_status == PipelineStatus.STRATEGIST_RUNNING:
        if node_id == "scout":      return "done"
        if node_id == "analyst":    return "done"
        if node_id == "strategist": return "running"

    if pipeline_status in (PipelineStatus.PUBLISHING, PipelineStatus.COMPLETE):
        return "done"

    if pipeline_status == PipelineStatus.SCOUT_RUNNING:
        if node_id == "scout": return "running"
        return "idle"

    return "idle"


@router.get("/{mission_id}")
async def get_agent_graph(
    mission_id: str,
    _user: dict = Depends(get_current_user),
):
    """
    React Flow graph payload.
    Frontend polls/subscribes via SSE graph_update events to update nodes.
    """
    state = await load_pipeline_state(mission_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Mission not found")

    mode = state.mode

    nodes = [
        {
            "id":       "scout",
            "type":     "agentNode",
            "position": {"x": 100, "y": 200},
            "data": {
                "label":          "🛰️ Scout",
                "role":           "scout",
                "mode":           mode,
                "status":         _node_status(state.status, "scout", mode),
                "result_summary": (
                    f"{len(state.scout_result.findings)} findings"
                    if state.scout_result else None
                ),
                # HITL badge — only shown in SCOUT_HITL mode
                "hitl_enabled":   mode == PipelineMode.SCOUT_HITL,
                "awaiting_hitl":  state.status == PipelineStatus.WAITING_FOR_SCOUT_REVIEW,
            },
        },
        {
            "id":       "analyst",
            "type":     "agentNode",
            "position": {"x": 450, "y": 200},
            "data": {
                "label":          "📈 Analyst",
                "role":           "analyst",
                "mode":           mode,
                "status":         _node_status(state.status, "analyst", mode),
                "result_summary": (
                    f"{len(state.analyst_result.gaps)} gaps | {state.analyst_result.confidence_score:.0%}"
                    if state.analyst_result else None
                ),
                "hitl_enabled":   False,   # Analyst is never HITL
                "awaiting_hitl":  False,
            },
        },
        {
            "id":       "strategist",
            "type":     "agentNode",
            "position": {"x": 800, "y": 200},
            "data": {
                "label":          "🧠 Strategist",
                "role":           "strategist",
                "mode":           mode,
                "status":         _node_status(state.status, "strategist", mode),
                "result_summary": (
                    state.strategist_result.recommendation_type
                    if state.strategist_result else None
                ),
                "hitl_enabled":   False,   # Strategist is never HITL
                "awaiting_hitl":  False,
            },
        },
    ]

    edges = [
        {
            "id":        "scout-analyst",
            "source":    "scout",
            "target":    "analyst",
            "animated":  state.status == PipelineStatus.ANALYST_RUNNING,
            "label":     "findings" if mode == PipelineMode.AUTONOMOUS else "approved findings",
            "type":      "smoothstep",
            "style":     {"stroke": "#b06aff"},
        },
        {
            "id":        "analyst-strategist",
            "source":    "analyst",
            "target":    "strategist",
            "animated":  state.status == PipelineStatus.STRATEGIST_RUNNING,
            "label":     "gap analysis",
            "type":      "smoothstep",
            "style":     {"stroke": "#ffb830"},
        },
    ]

    # In SCOUT_HITL mode: add a dotted edge from Scout to HITL Review page
    if mode == PipelineMode.SCOUT_HITL:
        edges.append({
            "id":     "scout-hitl",
            "source": "scout",
            "target": "hitl_review_page",   # virtual node rendered by frontend
            "animated": state.status == PipelineStatus.WAITING_FOR_SCOUT_REVIEW,
            "label":  "human review" if state.status == PipelineStatus.WAITING_FOR_SCOUT_REVIEW else "optional",
            "type":   "smoothstep",
            "style":  {"stroke": "#ff3f6c", "strokeDasharray": "6 3"},
        })

    return {
        "mission_id":      mission_id,
        "mode":            mode,
        "pipeline_status": state.status,
        "nodes":           nodes,
        "edges":           edges,
    }
