"""
app/api/routes/stream.py
GET /api/stream/{mission_id}

Server-Sent Events — consumed by the War Room page.
Accepts JWT as Bearer header OR as ?token= query param (EventSource can't set headers).
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Query, Request, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.security import decode_token
from app.core.state_store import stream_events

router = APIRouter(prefix="/stream", tags=["SSE Stream"])


@router.get("/{mission_id}")
async def sse_stream(
    mission_id: str,
    request: Request,
    token: Optional[str] = Query(default=None),
):
    # Validate token (from query param or Authorization header)
    raw_token = token
    if not raw_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            raw_token = auth[7:]

    if not raw_token:
        from sse_starlette.sse import EventSourceResponse as ESR
        async def denied():
            yield {"event": "error", "data": json.dumps({"detail": "Not authenticated"})}
        return ESR(denied())

    try:
        token_data = decode_token(raw_token)
        user_email = token_data.get("sub")
    except Exception:
        async def invalid():
            yield {"event": "error", "data": json.dumps({"detail": "Invalid token"})}
        return EventSourceResponse(invalid())

    # Enforce tenant isolation for the stream
    from app.core.state_store import load_pipeline_state
    state = await load_pipeline_state(mission_id)
    state_tenant = getattr(state, "tenant_id", "") if state else ""
    # Only block if tenant_id is set (non-empty, non-default) and doesn't match
    if state_tenant and state_tenant != "default_workspace" and state_tenant != user_email:
        raise HTTPException(status_code=403, detail="Not authorized to access this stream")

    async def event_gen():
        async for event in stream_events(mission_id, timeout=600.0):
            if await request.is_disconnected():
                break
            yield {
                "event": event.event.value,
                "data":  event.model_dump_json(),
                "id":    event.mission_id,
            }

        yield {
            "event": "complete",
            "data":  json.dumps({"mission_id": mission_id, "message": "Stream closed"}),
        }

    return EventSourceResponse(event_gen())
