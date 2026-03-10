"""
agents/scout.py
Agent A — The Scout

Behaviour depends on pipeline mode:
  AUTONOMOUS : Scrape → extract findings → immediately hand off to Analyst.
  SCOUT_HITL : Scrape → extract findings → PAUSE → emit scout_hitl_gate event →
               wait for human to approve/edit findings → then hand off to Analyst.

Streams SSE thoughts throughout for the Scout Panel.
"""
from __future__ import annotations

import asyncio
import json
import re

import httpx
from bs4 import BeautifulSoup
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage

from app.core.config import get_settings
from app.core.state_store import (
    push_event, push_relay_event,
    set_scout_hitl_gate, wait_for_scout_hitl,
    get_scout_hitl_status,
    save_scout_findings_to_history,
    update_pipeline_status, load_pipeline_state,
)
from app.schemas import (
    AgentRole, GraphUpdatePayload, HandoffPayload,
    PipelineMode, PipelineState, PipelineStatus,
    ScoutFinding, ScoutResult, StreamEvent, StreamEventType,
)

settings = get_settings()

SCOUT_SYSTEM_PROMPT = """You are the Scout Agent in a Market Intelligence War Room.
Analyse raw HTML from competitor websites and extract:
1. Price changes (before → after if detectable)
2. New product launches
3. Active promotions / discount banners

Respond ONLY with a JSON array. Each item:
{
  "competitor_name": str,
  "url": str,
  "finding_type": "price_change" | "new_product" | "promotion",
  "title": str,
  "detail": str,
  "price_before": float | null,
  "price_after": float | null
}
Return [] if nothing interesting. No markdown fences.
"""


async def _scrape(url: str, timeout: int = 30) -> tuple[str, str]:
    """Uses Jina Reader API to render JS and extract clean markdown + screenshot."""
    headers = {
        "Accept": "application/json",
        "X-Return-Format": "markdown,screenshot",
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            resp = await client.get(f"https://r.jina.ai/{url}", headers=headers)
            resp.raise_for_status()
            data = resp.json().get("data", {})
            markdown_content = data.get("content", "")
            screenshot_url = data.get("screenshotUrl", "")
            if not markdown_content:
                return f"[SCRAPE_ERROR] No content found", ""
            return markdown_content[:6000], screenshot_url
    except Exception as exc:
        return f"[SCRAPE_ERROR] {exc}", ""

import os

async def _discover_local_competitors(niche: str, city: str, mission_id: str) -> list[dict]:
    tomtom_key = settings.tomtom_api_key
    if not tomtom_key:
        await push_event(StreamEvent(
            event=StreamEventType.THOUGHT, agent=AgentRole.SCOUT,
            data="ℹ️ TOMTOM_API_KEY not found in environment. Skipping dynamic map discovery.",
            mission_id=mission_id
        ))
        return []
        
    await push_event(StreamEvent(
        event=StreamEventType.THOUGHT, agent=AgentRole.SCOUT,
        data=f"🗺️ Searching TomTom Maps for '{niche}' stores in '{city}'...",
        mission_id=mission_id
    ))
    try:
        url = f"https://api.tomtom.com/search/2/search/{niche}%20in%20{city}.json"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params={"key": tomtom_key, "limit": 4})
            results = resp.json().get("results", [])
            
        discovered = []
        for r in results:
            name = r.get("poi", {}).get("name", "Unknown Store")
            website = r.get("poi", {}).get("url")
            if website:
                if not website.startswith("http"):
                    website = "https://" + website
                discovered.append({"name": name, "url": website})
                await push_event(StreamEvent(
                    event=StreamEventType.THOUGHT, agent=AgentRole.SCOUT,
                    data=f"📍 Discovered: {name} ({website})",
                    mission_id=mission_id
                ))
        return discovered
    except Exception as exc:
        await push_event(StreamEvent(
            event=StreamEventType.THOUGHT, agent=AgentRole.SCOUT,
            data=f"⚠️ TomTom API error: {exc}",
            mission_id=mission_id
        ))
        return []


# ── Emit helpers ──────────────────────────────────────────────────────────────

async def _thought(mission_id: str, text: str) -> None:
    await push_event(StreamEvent(
        event=StreamEventType.THOUGHT, agent=AgentRole.SCOUT,
        data=text, mission_id=mission_id,
    ))


async def _graph(mission_id: str, status: str, summary: str = None, awaiting: bool = False) -> None:
    payload = GraphUpdatePayload(
        node_id="scout", status=status,
        result_summary=summary, awaiting_hitl=awaiting,
    )
    await push_event(StreamEvent(
        event=StreamEventType.GRAPH_UPDATE, agent=AgentRole.SCOUT,
        data=payload.model_dump_json(), mission_id=mission_id,
    ))


# ── Main node ─────────────────────────────────────────────────────────────────

async def run_scout(state: PipelineState) -> PipelineState:
    """LangGraph node: Scout."""
    mission_id  = state.mission_id
    tenant_id   = getattr(state, "tenant_id", "default_workspace")
    mode        = state.mode
    competitors = getattr(state, "_competitors", [])
    keywords    = getattr(state, "_keywords", [])
    city        = getattr(state, "_city", settings.default_city)

    await update_pipeline_status(mission_id, PipelineStatus.SCOUT_RUNNING)
    await _graph(mission_id, "running")
    await _thought(mission_id, f"🛰️ Scout online — city filter: {city}.")
    if mode == PipelineMode.SCOUT_HITL:
        await _thought(mission_id, "👤 Scout HITL mode active — findings will pause for your review.")
    else:
        await _thought(mission_id, "🤖 Autonomous mode — pipeline will run end-to-end without pausing.")

    niche = getattr(state, "_niche", "ecommerce")
    
    # ── TomTom Maps Dynamic Discovery ─────────────────────────────────────────
    discovered = await _discover_local_competitors(niche, city, mission_id)
    if discovered:
        competitors = discovered + competitors

    llm = ChatGoogleGenerativeAI(
        model=settings.openai_model, temperature=0,
        google_api_key=settings.openai_api_key, streaming=False,
    )

    all_findings: list[ScoutFinding] = []
    raw_snippets: list[str] = []

    for comp in competitors:
        await _thought(mission_id, f"🔍 Scraping {comp['name']} → {comp['url']} ...")
        html_text, screenshot_url = await _scrape(comp["url"])

        if html_text.startswith("[SCRAPE_ERROR]"):
            await _thought(mission_id, f"⚠️ Cannot reach {comp['url']} — skipping.")
            continue

        raw_snippets.append(html_text[:1000])

        kw_hint  = f"Focus on: {', '.join(keywords)}. " if keywords else ""
        geo_hint = f"Prioritise results relevant to {city}, India. "

        # Pass vision details to the LLM (Multimodal)
        messages: list[BaseMessage] = [
            SystemMessage(content=SCOUT_SYSTEM_PROMPT),
            HumanMessage(content=[
                {"type": "text", "text": f"{geo_hint}{kw_hint}Competitor: {comp['name']} ({comp['url']})\\n\\n{html_text}"},
                *( [{"type": "image_url", "image_url": {"url": screenshot_url}}] if screenshot_url else [] )
            ])
        ]

        await _thought(mission_id, f"🧠 Extracting intelligence from {comp['name']}...")
        
        # Self-correction logic inside the LangGraph node
        raw_list = []
        for attempt in range(3):
            try:
                response = await llm.ainvoke(messages)
                raw_list = json.loads(response.content)
                break
            except Exception as exc:
                err_msg = str(exc)
                if "API_KEY_INVALID" in err_msg or "INVALID_ARGUMENT" in err_msg or "400" in err_msg:
                    await _thought(mission_id, "⚠️ Invalid Gemini API Key detected. Using mock scout findings for demonstration.")
                    raw_list = [
                        {
                            "finding_type": "price_change",
                            "title": "Competitor Price Dropped",
                            "detail": "They reduced the price of their primary printed t-shirt line.",
                            "price_before": 899.0,
                            "price_after": 799.0
                        }
                    ]
                    break
                await _thought(mission_id, f"⚠️ Generation or validation failed. Attempt {attempt+1}/3. Retrying...")
                try:
                    messages.append(response)
                except UnboundLocalError:
                    pass
                messages.append(HumanMessage(content=f"Your response failed. Error: {exc}. Please return ONLY a valid JSON array."))
        else:
            await _thought(mission_id, f"⚠️ Unparseable LLM response for {comp['name']} after 3 attempts.")
            raw_list = []

        for f in raw_list:
            finding = ScoutFinding(
                competitor_name=comp["name"],
                url=comp["url"],
                finding_type=f.get("finding_type", "promotion"),
                title=f.get("title", ""),
                detail=f.get("detail", ""),
                price_before=f.get("price_before"),
                price_after=f.get("price_after"),
                screenshot_url=screenshot_url,
            )
            all_findings.append(finding)
            await _thought(mission_id, f"📌 [{finding.finding_type}] {finding.title}")

        await asyncio.sleep(0.5)

    await _thought(
        mission_id,
        f"✅ Scout scraping complete — {len(all_findings)} findings from {len(competitors)} competitors."
    )

    scout_result = ScoutResult(
        mission_id=mission_id,
        findings=all_findings,
        raw_html_snippets=raw_snippets,
    )
    state.scout_result = scout_result

    # Save to history for Analyst trend tracking
    niche = getattr(state, "_niche", "ecommerce")
    await save_scout_findings_to_history(tenant_id, niche, all_findings)

    # ── Branch: SCOUT_HITL vs AUTONOMOUS ──────────────────────────────────────

    if mode == PipelineMode.SCOUT_HITL:
        # Pause and wait for human review
        await _graph(mission_id, "hitl_paused", f"{len(all_findings)} findings — awaiting review", awaiting=True)
        await set_scout_hitl_gate(mission_id)
        await update_pipeline_status(
            mission_id, PipelineStatus.WAITING_FOR_SCOUT_REVIEW, scout_result=scout_result
        )

        # Emit the dedicated gate event — frontend listens for this to open HITL Review page
        await push_event(StreamEvent(
            event=StreamEventType.SCOUT_HITL_GATE,
            agent=AgentRole.SCOUT,
            data=scout_result.model_dump_json(),
            mission_id=mission_id,
        ))
        await _thought(
            mission_id,
            f"🛡️ HITL gate open — {len(all_findings)} findings ready for your review at /review."
        )

        # Block until human approves or rejects
        decision = await wait_for_scout_hitl(mission_id, timeout=600.0)

        if decision == "rejected":
            await _thought(mission_id, "❌ Scout review rejected — pipeline halted.", )
            await _graph(mission_id, "error", "Rejected by reviewer")
            state.status = PipelineStatus.SCOUT_REVIEW_REJECTED
            await update_pipeline_status(mission_id, PipelineStatus.SCOUT_REVIEW_REJECTED)
            return state

        # Human approved — reload state to pick up any edited findings
        refreshed = await load_pipeline_state(mission_id)
        if refreshed and refreshed.scout_result:
            state.scout_result = refreshed.scout_result
            kept = sum(1 for f in state.scout_result.findings if f.included)
            await _thought(
                mission_id,
                f"✅ Scout review approved — {kept} findings forwarded to Analyst."
            )

        await _graph(mission_id, "done", f"{len(state.scout_result.findings)} findings approved")
        state.status = PipelineStatus.SCOUT_REVIEW_APPROVED

    else:
        # Autonomous: straight through
        await _graph(mission_id, "done", f"{len(all_findings)} findings")

    # ── Relay Bus: Scout → Analyst handoff ────────────────────────────────────
    included = [f for f in state.scout_result.findings if f.included]
    handoff = HandoffPayload(
        from_agent=AgentRole.SCOUT,
        to_agent=AgentRole.ANALYST,
        summary=f"Passing {len(included)} findings to Analyst",
        item_count=len(included),
    )
    handoff_event = StreamEvent(
        event=StreamEventType.HANDOFF,
        agent=AgentRole.SCOUT,
        data=handoff.model_dump_json(),
        mission_id=mission_id,
    )
    await push_event(handoff_event)
    await push_relay_event(mission_id, handoff.model_dump_json())

    await update_pipeline_status(
        mission_id, PipelineStatus.ANALYST_RUNNING, scout_result=state.scout_result
    )
    state.status = PipelineStatus.ANALYST_RUNNING
    return state
