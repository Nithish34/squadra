"""
app/agents/scout_agent/main.py
Agent A — The Scout (Modular Architecture)

Coordinates Planner → Source Router → Cleaner → Structurer → Embeddings → Postgres
"""
from __future__ import annotations

import asyncio
from app.core.config import get_settings
from app.core.state_store import (
    push_event, push_relay_event,
    set_scout_hitl_gate, wait_for_scout_hitl,
    save_scout_findings_to_history,
    update_pipeline_status, load_pipeline_state,
)
from app.schemas import (
    AgentRole, GraphUpdatePayload, HandoffPayload,
    PipelineMode, PipelineState, PipelineStatus,
    ScoutFinding, ScoutResult, StreamEvent, StreamEventType,
    ProductInfo, GeoData, CompetitorInfo, PricingData, MarketSentiment
)

from app.agents.scout_agent.planner import plan_tasks
from app.agents.scout_agent.routers.tomtom_router import discover_local_competitors
from app.agents.scout_agent.routers.jina_router import scrape_website
from app.agents.scout_agent.structurer import structure_data
from app.agents.scout_agent.embeddings import create_embedding
from app.database.postgres import store_scout_data

settings = get_settings()

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

async def run_scout(state: PipelineState) -> PipelineState:
    """LangGraph node: Scout. Modular pipeline."""
    mission_id  = state.mission_id
    tenant_id   = getattr(state, "tenant_id", "default_workspace")
    mode        = state.mode
    competitors = getattr(state, "_competitors", [])
    city        = getattr(state, "_city", settings.default_city)
    niche       = getattr(state, "_niche", "ecommerce")
    business    = getattr(state, "_business_name", "Unknown Business")

    await update_pipeline_status(mission_id, PipelineStatus.SCOUT_RUNNING)
    await _graph(mission_id, "running")
    await _thought(mission_id, f"🛰️ Scout online — Initializing collection pipeline for {business}.")

    # Extract advanced context fields
    address             = getattr(state, "_address", "")
    service_radius      = getattr(state, "_service_radius_km", 5)
    product_name        = getattr(state, "_product_name", "")
    price_range         = getattr(state, "_price_range", "")
    usp                 = getattr(state, "_usp", "")
    target_audience     = getattr(state, "_target_audience", "")
    age_group           = getattr(state, "_age_group", "")
    business_goal       = getattr(state, "_business_goal", "")
    current_price       = getattr(state, "_current_price", "")
    business_category   = getattr(state, "_business_category", "")
    website             = getattr(state, "_website", "")
    monthly_budget      = getattr(state, "_monthly_budget", 0)
    business_stage      = getattr(state, "_business_stage", "")
    brand_positioning   = getattr(state, "_brand_positioning", "")
    avg_price           = getattr(state, "_avg_price", "")
    discount_range      = getattr(state, "_discount_range", "")
    spending_level      = getattr(state, "_spending_level", "")
    business_challenges = getattr(state, "_business_challenges", [])

    if address:
        await _thought(mission_id, f"📍 Location context: {address}, {city}")
    if product_name:
        await _thought(mission_id, f"📦 Primary product: {product_name} | {price_range} | USP: {usp}")
    if business_goal:
        await _thought(mission_id, f"🎯 Business goal: {business_goal}")
    if business_stage:
        await _thought(mission_id, f"📊 Business stage: {business_stage} | Positioning: {brand_positioning}")
    if business_challenges:
        await _thought(mission_id, f"⚠️ Key challenges: {', '.join(business_challenges[:3])}")

    # Step 1-3: Intent & Planner
    tasks = plan_tasks(niche, city, competitors)
    await _thought(mission_id, f"📋 Planner created {len(tasks)} collection subtasks.")

    raw_snippets = []
    source_links = []
    all_findings: list[ScoutFinding] = []  # For UI backward compatibility

    # Step 4-5: Source Selection & Data Collection
    for task in tasks:
        if task["type"] == "geo_discovery":
            await _thought(mission_id, f"🗺️ Routing to TomTom API: {task['description']}")
            discovered = await discover_local_competitors(task["niche"], task["city"])
            for d in discovered:
                # Add new tasks dynamically
                tasks.append({
                    "type": "scrape",
                    "description": f"Read dynamically discovered competitor: {d['name']}",
                    "url": d['url'],
                    "name": d['name']
                })
        elif task["type"] == "scrape":
            await _thought(mission_id, f"🔍 Routing to Jina API: {task['description']}")
            content, screenshot = await scrape_website(task["url"])
            if content and not content.startswith("[SCRAPE_ERROR]"):
                raw_snippets.append(content)
                source_links.append(task["url"])
                # Also generate legacy findings for the UI fallback
                all_findings.append(ScoutFinding(
                    competitor_name=task["name"],
                    url=task["url"],
                    finding_type="promotion",
                    title=f"Data from {task['name']}",
                    detail="Content ingested for processing.",
                    screenshot_url=screenshot
                ))

    # Step 6-7: Cleaning & Structuring
    await _thought(mission_id, "🧠 Structuring raw intelligence...")
    combined_raw = "\n---\n".join(raw_snippets[:3]) # Limit to avoid massive tokens
    structured = await structure_data(
        combined_raw, city, niche,
        business_name=business,
        business_category=business_category,
        address=address,
        product_name=product_name,
        price_range=price_range,
        usp=usp,
        target_audience=target_audience,
        age_group=age_group,
        business_goal=business_goal,
        current_price=current_price,
        website=website,
        monthly_budget=monthly_budget,
        business_stage=business_stage,
        brand_positioning=brand_positioning,
        avg_price=avg_price,
        discount_range=discount_range,
        spending_level=spending_level,
        business_challenges=business_challenges,
    )

    scout_result = ScoutResult(
        mission_id=mission_id,
        product_info=ProductInfo(**structured.get("product_info", {})),
        geo_data=GeoData(**structured.get("geo_data", {})),
        competitors=[CompetitorInfo(**c) for c in structured.get("competitors", [])],
        pricing=PricingData(**structured.get("pricing", {})),
        market_sentiment=MarketSentiment(**structured.get("market_sentiment", {})),
        source_links=source_links,
        raw_html_snippets=raw_snippets,
        findings=all_findings # backward compatibility
    )

    # Step 8: Embeddings
    await _thought(mission_id, "🧬 Generating vector embeddings...")
    vector = await create_embedding(structured)
    
    # Step 9: Store in Postgres
    await _thought(mission_id, "💾 Storing intelligence in PostgreSQL (pgvector)...")
    row_id = await store_scout_data(
        product_name=business,
        location=city,
        source=",".join(source_links),
        content=combined_raw[:2000],
        embedding=vector
    )
    if row_id != -1:
        scout_result.embedding_id = str(row_id)
        await _thought(mission_id, f"✅ Data stored successfully. ID: {row_id}")
    else:
        await _thought(mission_id, "⚠️ Skipping PostgreSQL storage (not configured or unavailable).")

    state.scout_result = scout_result

    # Save to history for Analyst trend tracking (Redis fallback history)
    await save_scout_findings_to_history(tenant_id, niche, all_findings)

    # ── Branch: SCOUT_HITL vs AUTONOMOUS ──────────────────────────────────────
    if mode == PipelineMode.SCOUT_HITL:
        await _graph(mission_id, "hitl_paused", f"Review intelligence", awaiting=True)
        await set_scout_hitl_gate(mission_id)
        await update_pipeline_status(
            mission_id, PipelineStatus.WAITING_FOR_SCOUT_REVIEW, scout_result=scout_result
        )

        await push_event(StreamEvent(
            event=StreamEventType.SCOUT_HITL_GATE,
            agent=AgentRole.SCOUT,
            data=scout_result.model_dump_json(),
            mission_id=mission_id,
        ))
        await _thought(mission_id, "🛡️ HITL gate open — intelligence ready for review at /review.")

        decision = await wait_for_scout_hitl(mission_id, timeout=600.0)

        if decision == "rejected":
            await _thought(mission_id, "❌ Scout review rejected — pipeline halted.")
            await _graph(mission_id, "error", "Rejected by reviewer")
            state.status = PipelineStatus.SCOUT_REVIEW_REJECTED
            await update_pipeline_status(mission_id, PipelineStatus.SCOUT_REVIEW_REJECTED)
            return state

        refreshed = await load_pipeline_state(mission_id)
        if refreshed and refreshed.scout_result:
            state.scout_result = refreshed.scout_result
            await _thought(mission_id, "✅ Scout review approved.")

        await _graph(mission_id, "done", "Intelligence approved")
        state.status = PipelineStatus.SCOUT_REVIEW_APPROVED

    else:
        await _graph(mission_id, "done", "Intelligence collected")

    # Step 10: Relay Bus - Output JSON to Analyst
    handoff = HandoffPayload(
        from_agent=AgentRole.SCOUT,
        to_agent=AgentRole.ANALYST,
        summary="Passing structured intelligence to Analyst",
        item_count=len(state.scout_result.competitors),
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
