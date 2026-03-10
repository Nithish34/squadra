"""
api/routes/stream.py
GET /api/stream/{mission_id}

Server-Sent Events — consumed by the War Room page for all three agent panels.

Event types emitted (listen with es.addEventListener(type, handler)):
  thought          → agent is thinking — append to Scout/Analyst/Strategist panel log
  status           → pipeline status changed — update status bar
  handoff          → agent-to-agent message passed — animate Relay Bus
  graph_update     → node status changed — update Agent Graph node colour
  scout_hitl_gate  → Scout paused for human review — route to /review (SCOUT_HITL mode only)
  publish_started  → auto-publish initiated
  publish_complete → auto-publish finished
  complete         → stream ended normally
  error            → pipeline failed

Connection: warroom → api (agent calls)
            warroom → agentgraph (SSE update — via graph_update events)
            warroom → scoutpanel / analystpanel / stratpanel / relaybus (sub-panels)
"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse

from app.api.routes.auth  import get_current_user
from app.core.state_store import stream_events

router = APIRouter(prefix="/stream", tags=["SSE Stream"])


@router.get("/{mission_id}")
async def sse_stream(
    mission_id: str,
    request: Request,
    _user: dict = Depends(get_current_user),
):
    """
    SSE endpoint. Subscribe from the War Room page:

    const es = new EventSource(`/api/stream/${missionId}`, { withCredentials: true })

    // Scout Panel
    es.addEventListener('thought', e => {
      const ev = JSON.parse(e.data)
      if (ev.agent === 'scout') appendToScoutPanel(ev.data)
      if (ev.agent === 'analyst') appendToAnalystPanel(ev.data)
      if (ev.agent === 'strategist') appendToStratPanel(ev.data)
    })

    // Relay Bus (agent handoffs)
    es.addEventListener('handoff', e => animateRelayBus(JSON.parse(e.data)))

    // Agent Graph (React Flow node updates)
    es.addEventListener('graph_update', e => updateGraphNode(JSON.parse(e.data)))

    // SCOUT_HITL mode: redirect to review page when Scout pauses
    es.addEventListener('scout_hitl_gate', e => router.push('/review'))

    es.addEventListener('complete', () => es.close())
    """
    async def event_gen():
        async for event in stream_events(mission_id, timeout=600.0):
            if await request.is_disconnected():
                break
            yield {
                "event": event.event.value,   # SSE "event:" field
                "data":  event.model_dump_json(),
                "id":    event.mission_id,
            }

        # Terminal event — tells client to close the EventSource
        yield {
            "event": "complete",
            "data":  json.dumps({"mission_id": mission_id, "message": "Stream closed"}),
        }

    return EventSourceResponse(event_gen())
