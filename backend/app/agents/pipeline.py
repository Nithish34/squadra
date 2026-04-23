"""
agents/pipeline.py
LangGraph orchestration — two compiled graphs:

  AUTONOMOUS_GRAPH : Scout → Analyst → Strategist (no pause, no human gate)
  SCOUT_HITL_GRAPH : Scout (pause gate) → Analyst → Strategist

Both graphs share the same node functions. The branching is handled
inside run_scout() by reading state.mode and blocking on the Redis gate.

The graph is launched as an asyncio background task so FastAPI can return
202 Accepted immediately.
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime

import structlog
from langgraph.graph import StateGraph, END

from app.agents.scout_agent.main import run_scout
from app.agents.analyst_agent.main import run_analyst
from app.agents.strategist_agent.main import run_strategist
from app.core.state_store  import (
    save_pipeline_state, update_pipeline_status,
    push_event, push_sentinel,
)
from app.schemas import (
    AgentRole, MissionSetup,
    PipelineMode, PipelineState, PipelineStatus,
    StreamEvent, StreamEventType,
)

log = structlog.get_logger()


# ── Node adapter ──────────────────────────────────────────────────────────────
# LangGraph works with plain dicts; we wrap/unwrap PipelineState.

def _node(fn):
    async def wrapped(d: dict) -> dict:
        state = PipelineState.model_validate(d)
        result = await fn(state)
        return result.model_dump(mode="python")
    return wrapped


def _build_graph() -> object:
    g = StateGraph(dict)
    g.add_node("scout",      _node(run_scout))
    g.add_node("analyst",    _node(run_analyst))
    g.add_node("strategist", _node(run_strategist))
    g.set_entry_point("scout")
    g.add_edge("scout",      "analyst")
    g.add_edge("analyst",    "strategist")
    g.add_edge("strategist", END)
    return g.compile()


# One compiled graph handles both modes (branching is inside run_scout)
_GRAPH = _build_graph()


# ── Public API ────────────────────────────────────────────────────────────────

async def launch_pipeline(setup: MissionSetup) -> str:
    """
    Initialise pipeline state in Redis, spawn background task, return mission_id.
    mode is determined by setup.enable_scout_hitl:
      False → AUTONOMOUS
      True  → SCOUT_HITL
    """
    mission_id = setup.mission_id or str(uuid.uuid4())
    mode = PipelineMode.SCOUT_HITL if setup.enable_scout_hitl else PipelineMode.AUTONOMOUS

    initial_state = PipelineState(
        mission_id=mission_id,
        tenant_id=setup.tenant_id,   # ← lock to user's email for tenant isolation
        mode=mode,
        status=PipelineStatus.IDLE,
    )
    await save_pipeline_state(initial_state)

    asyncio.create_task(
        _run_graph(mission_id, setup, mode),
        name=f"pipeline-{mission_id}",
    )

    log.info("pipeline_launched", mission_id=mission_id, mode=mode, niche=setup.niche)
    return mission_id


async def _run_graph(mission_id: str, setup: MissionSetup, mode: PipelineMode) -> None:
    try:
        seed = {
            "mission_id":           mission_id,
            "tenant_id":            setup.tenant_id,   # ← required for 403 tenant check
            "mode":                 mode,
            "status":               PipelineStatus.SCOUT_RUNNING,
            "scout_result":         None,
            "analyst_result":       None,
            "strategist_result":    None,
            "publish_log":          [],
            "error":                None,
            "trace_url":            None,
            "updated_at":           datetime.utcnow().isoformat(),
            # Private setup fields read by agent nodes
            "_business_name":       setup.business_name,
            "_niche":               setup.niche,
            "_city":                setup.city,
            "_country":             setup.country,
            "_competitors":         [c.model_dump() for c in setup.competitors],
            "_keywords":            setup.keywords,
            "_shopify_product_ids": setup.shopify_product_ids,
            "_instagram_post":      setup.instagram_post,
            # Advanced Scout context
            "_business_category":   setup.business_category,
            "_business_type":       setup.business_type,
            "_address":             setup.address,
            "_service_radius_km":   setup.service_radius_km,
            "_latitude":            setup.latitude,
            "_longitude":           setup.longitude,
            "_product_name":        setup.product_name,
            "_price_range":         setup.price_range,
            "_usp":                 setup.usp,
            "_target_audience":     setup.target_audience,
            "_age_group":           setup.age_group,
            "_income_level":        setup.income_level,
            "_business_goal":       setup.business_goal,
            "_current_price":       setup.current_price,
            "_website":             setup.website,
            "_social_links":        setup.social_links,
            "_delivery_enabled":    setup.delivery_enabled,
            "_delivery_radius_km":  setup.delivery_radius_km,
            "_delivery_platforms":  setup.delivery_platforms,
            "_monthly_budget":      setup.monthly_budget,
            "_business_stage":      setup.business_stage,
            "_brand_positioning":   setup.brand_positioning,
            "_avg_price":           setup.avg_price,
            "_discount_range":      setup.discount_range,
            "_spending_level":      setup.spending_level,
            "_business_challenges": setup.business_challenges,
        }
        await _GRAPH.ainvoke(seed)

    except Exception as exc:
        log.error("pipeline_failed", mission_id=mission_id, error=str(exc))
        await update_pipeline_status(mission_id, PipelineStatus.FAILED, error=str(exc))
        await push_event(StreamEvent(
            event=StreamEventType.ERROR,
            agent=AgentRole.SYSTEM,
            data=f"Pipeline failed: {exc}",
            mission_id=mission_id,
        ))
        await push_sentinel(mission_id)
