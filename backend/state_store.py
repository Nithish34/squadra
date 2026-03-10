"""
core/state_store.py
Redis-backed state store.

Keys:
  pipeline:{mission_id}        → PipelineState JSON (24h TTL)
  sse:{mission_id}             → SSE event queue (List, 30min TTL)
  scout_hitl:{mission_id}      → Scout HITL gate: "waiting" | "approved" | "rejected"
  relay_history:{mission_id}   → List of HandoffPayload JSON
  history:{tenant_id}:{mission_id} → Historic ScoutFindings JSON
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import AsyncIterator, Optional

import redis.asyncio as aioredis

from app.core.config import get_settings
from app.schemas import (
    PipelineState, PipelineStatus, PipelineMode,
    StreamEvent, StreamEventType,
)

settings = get_settings()
_redis: Optional[aioredis.Redis] = None

SENTINEL = "__DONE__"


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True,
        )
    return _redis


# ── Pipeline State ─────────────────────────────────────────────────────────────

async def save_pipeline_state(state: PipelineState) -> None:
    r = await get_redis()
    await r.set(f"pipeline:{state.mission_id}", state.model_dump_json(), ex=86400)


async def load_pipeline_state(mission_id: str) -> Optional[PipelineState]:
    r = await get_redis()
    raw = await r.get(f"pipeline:{mission_id}")
    return PipelineState.model_validate_json(raw) if raw else None


async def update_pipeline_status(
    mission_id: str, status: PipelineStatus, **kwargs
) -> PipelineState:
    state = await load_pipeline_state(mission_id)
    if state is None:
        raise KeyError(f"No pipeline state for mission_id={mission_id}")
    state.status = status
    state.updated_at = datetime.utcnow()
    for k, v in kwargs.items():
        setattr(state, k, v)
    await save_pipeline_state(state)
    return state


# ── Historical Memory (Trend Tracking) ─────────────────────────────────────────

async def save_scout_findings_to_history(tenant_id: str, niche: str, findings: list[ScoutFinding]) -> None:
    """Stores past Scout findings to allow Analyst agent to track historical trends."""
    if not findings:
        return
    r = await get_redis()
    key = f"history:{tenant_id}:{niche}"
    import json
    for f in findings:
        # Save timestamped findings to track price drops over time
        await r.rpush(key, f.model_dump_json())
    # Keep the last 1000 items
    await r.ltrim(key, -1000, -1)

async def get_historical_findings(tenant_id: str, niche: str) -> list[ScoutFinding]:
    """Retrieves historic trends for the Analyst agent."""
    r = await get_redis()
    key = f"history:{tenant_id}:{niche}"
    raw_items = await r.lrange(key, 0, -1)
    results = []
    for raw in raw_items:
        try:
            results.append(ScoutFinding.model_validate_json(raw))
        except Exception:
            pass
    return results



# ── SSE Queue ──────────────────────────────────────────────────────────────────

async def push_event(event: StreamEvent) -> None:
    r = await get_redis()
    key = f"sse:{event.mission_id}"
    await r.rpush(key, event.model_dump_json())
    await r.expire(key, 1800)


async def push_sentinel(mission_id: str) -> None:
    r = await get_redis()
    await r.rpush(f"sse:{mission_id}", SENTINEL)
    await r.expire(f"sse:{mission_id}", 1800)


async def stream_events(mission_id: str, timeout: float = 600.0) -> AsyncIterator[StreamEvent]:
    r = await get_redis()
    key = f"sse:{mission_id}"
    deadline = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = deadline - asyncio.get_event_loop().time()
        if remaining <= 0:
            break
        result = await r.blpop([key], timeout=min(2.0, remaining))
        if result is None:
            continue
        _, raw = result
        if raw == SENTINEL:
            break
        yield StreamEvent.model_validate_json(raw)


# ── Scout HITL Gate ────────────────────────────────────────────────────────────
# Only active when mission.mode == SCOUT_HITL

async def set_scout_hitl_gate(mission_id: str) -> None:
    r = await get_redis()
    await r.set(f"scout_hitl:{mission_id}", "waiting", ex=1800)


async def resolve_scout_hitl_gate(mission_id: str, approved: bool) -> None:
    r = await get_redis()
    value = "approved" if approved else "rejected"
    await r.set(f"scout_hitl:{mission_id}", value, ex=1800)


async def get_scout_hitl_status(mission_id: str) -> Optional[str]:
    r = await get_redis()
    return await r.get(f"scout_hitl:{mission_id}")


async def wait_for_scout_hitl(
    mission_id: str, poll_interval: float = 1.5, timeout: float = 600.0
) -> str:
    """Blocks until human resolves the Scout gate. Returns 'approved' or 'rejected'."""
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        status = await get_scout_hitl_status(mission_id)
        if status in ("approved", "rejected"):
            return status
        await asyncio.sleep(poll_interval)
    return "rejected"


# ── Relay Bus History ──────────────────────────────────────────────────────────

async def push_relay_event(mission_id: str, payload_json: str) -> None:
    r = await get_redis()
    key = f"relay_history:{mission_id}"
    await r.rpush(key, payload_json)
    await r.expire(key, 86400)


async def get_relay_history(mission_id: str) -> list[dict]:
    r = await get_redis()
    raw_items = await r.lrange(f"relay_history:{mission_id}", 0, -1)
    result = []
    for raw in raw_items:
        try:
            result.append(json.loads(raw))
        except Exception:
            pass
    return result
