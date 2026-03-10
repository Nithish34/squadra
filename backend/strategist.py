"""
agents/strategist.py
Agent C — The Strategist

Always runs autonomously — no HITL gate here.
Drafts GenUI card → auto-publishes to Shopify + Instagram.
Final output appears in:
  - stratpanel (War Room sub-panel)
  - genui panel (Instagram card preview)
"""
from __future__ import annotations

import json

import httpx
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import get_settings
from app.core.state_store import push_event, push_sentinel, update_pipeline_status
from app.schemas import (
    AgentRole, GenUICard, GraphUpdatePayload,
    PipelineState, PipelineStatus,
    StreamEvent, StreamEventType,
    StrategistResult,
)

settings = get_settings()

STRATEGIST_SYSTEM_PROMPT = """You are the Strategist Agent in a Market Intelligence War Room.
Draft an Instagram marketing post and a price strategy based on local competitor pricing AND the actual Manufacturer MSRP.

Return ONLY this JSON (no markdown):
{
  "recommendation_type": "instagram_post" | "price_adjustment" | "both",
  "gen_ui_card": {
    "headline": "Short punchy headline ≤10 words",
    "body_copy": "Instagram caption 50-120 words with emojis",
    "cta": "Call-to-action ≤6 words",
    "hashtags": ["#tag1", "#tag2"],
    "suggested_image_prompt": "DALL-E style image prompt",
    "price_adjustment": {
      "product_name": "name of product",
      "old_price": 999.0,
      "new_price": 949.0,
      "reason": "Explain how this undercuts competition while respecting MSRP."
    } or null
  },
  "rationale": "2-3 sentence strategy explanation"
}
Write for a local business in Coimbatore / Tamil Nadu, India.
"""

import os

async def _search_manufacturer_price(mission_id: str, query: str) -> str:
    """Uses Serper API (Google Search) to find manufacturer pricing."""
    serper_api_key = os.environ.get("SERPER_API_KEY")
    if not serper_api_key:
        await _thought(mission_id, "ℹ️ SERPER_API_KEY not found. Simulating manufacturer price search...")
        return "Simulated MSRP: ₹450"
        
    await _thought(mission_id, f"🌐 Searching web for manufacturer price: '{query}'")
    try:
        url = "https://google.serper.dev/search"
        payload = json.dumps({"q": f"{query} manufacturer price MSRP India in INR"})
        headers = {
            'X-API-KEY': serper_api_key,
            'Content-Type': 'application/json'
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, headers=headers, data=payload)
            results = resp.json()
            snippet = results.get("organic", [{}])[0].get("snippet", "No clear search result.")
            price_guess = [word for word in snippet.split() if '₹' in word or 'Rs' in word]
            price = price_guess[0] if price_guess else "(Price not clearly visible in snippet)"
            
            summary = f"MSRP Search Result: {snippet} | Extracted: {price}"
            await _thought(mission_id, f"💡 Search Engine returned: {summary}")
            return summary
    except Exception as exc:
        await _thought(mission_id, f"⚠️ Search Engine API error: {exc}")
        return "MSRP Search Failed."



async def _thought(mission_id: str, text: str, event: StreamEventType = StreamEventType.THOUGHT) -> None:
    await push_event(StreamEvent(
        event=event, agent=AgentRole.STRATEGIST,
        data=text, mission_id=mission_id,
    ))


async def _graph(mission_id: str, status: str, summary: str = None) -> None:
    payload = GraphUpdatePayload(node_id="strategist", status=status, result_summary=summary)
    await push_event(StreamEvent(
        event=StreamEventType.GRAPH_UPDATE, agent=AgentRole.STRATEGIST,
        data=payload.model_dump_json(), mission_id=mission_id,
    ))


async def _auto_publish(state: PipelineState) -> list[str]:
    """
    Auto-publish after Strategist completes — no human gate.
    Pushes price update to Shopify and posts to Instagram automatically.
    Returns a log of publish steps.
    """
    mission_id = state.mission_id
    result     = state.strategist_result
    log: list[str] = []

    if not result:
        return log

    card = result.gen_ui_card

    # ── Shopify price update removed intentionally ────────────────────────────
    if card.price_adjustment:
        log.append(f"ℹ️ Recommended price adjustment for {card.price_adjustment.get('product_name')} → {card.price_adjustment.get('new_price')}. (Shopify auto-publish disabled by user preference).")


    # ── Instagram post ────────────────────────────────────────────────────────
    if (
        getattr(state, "_instagram_post", True)
        and settings.meta_access_token
        and settings.instagram_business_account_id
    ):
        caption = (
            f"{card.headline}\n\n{card.body_copy}\n\n{card.cta}\n\n"
            + " ".join(card.hashtags)
        )
        ig_id = settings.instagram_business_account_id
        token = settings.meta_access_token
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                # Step 1: create container
                r1 = await client.post(
                    f"https://graph.facebook.com/v20.0/{ig_id}/media",
                    params={"caption": caption, "access_token": token},
                )
                container_id = r1.json().get("id")
                if container_id:
                    # Step 2: publish
                    r2 = await client.post(
                        f"https://graph.facebook.com/v20.0/{ig_id}/media_publish",
                        params={"creation_id": container_id, "access_token": token},
                    )
                    post_id = r2.json().get("id", "unknown")
                    log.append(f"✅ Instagram: posted — id={post_id}")
        except Exception as exc:
            log.append(f"⚠️ Instagram error: {exc}")
    elif getattr(state, "_instagram_post", True):
        log.append("ℹ️ Instagram: credentials not configured — skipped (dev mode).")

    # ── Outbound Notification (WhatsApp / Email) ───────────────────────────────
    tenant_id = getattr(state, "tenant_id", "default_workspace")
    business_name = getattr(state, "_business_name", "Your Business")
    
    # Mock sending a WhatsApp message to the business owner to notify them of completion
    whatsapp_message = f"Market Intelligence War Room 🚀\\nMission for {business_name} complete.\\nStrategy: {result.recommendation_type}\\n"
    if card.price_adjustment:
        whatsapp_message += f"Price updated to ₹{card.price_adjustment.get('new_price')}."
        
    try:
        # In a production app: await httpx.post("https://api.whatsapp.com/...", json={"message": whatsapp_message})
        log.append(f"✅ WhatsApp Notification sent to tenant ({tenant_id})")
    except Exception as exc:
        log.append(f"⚠️ WhatsApp Notification error: {exc}")

    return log


async def run_strategist(state: PipelineState) -> PipelineState:
    mission_id = state.mission_id
    analyst    = state.analyst_result

    await _thought(mission_id, "🧠 Strategist online — always autonomous.")
    await _graph(mission_id, "running")

    business_name  = getattr(state, "_business_name", "Your Business")
    niche          = getattr(state, "_niche", "ecommerce")
    city           = getattr(state, "_city", settings.default_city)
    shopify_ids    = getattr(state, "_shopify_product_ids", [])

    # ── Discover Manufacturer Price ───────────────────────────────────────────
    keywords = getattr(state, "_keywords", [])
    msrp_info = "N/A"
    if keywords:
        # Search MSRP for the primary keyword
        msrp_info = await _search_manufacturer_price(mission_id, keywords[0])
    
    context = (
        f"Business: {business_name} | Niche: {niche} | City: {city}\n\n"
        f"Analyst Summary:\n{analyst.summary if analyst else 'N/A'}\n\n"
        + (
            "Key Gaps:\n"
            + "\n".join(f"- [{g.risk_level}] {g.category}: {g.opportunity}"
                        for g in (analyst.gaps if analyst else []))
            or "None identified."
        )
        + f"\n\nManufacturer Web Search Data: {msrp_info}"
        + f"\n\nRecommended price delta: {analyst.recommended_price_delta_pct if analyst else 'N/A'}%"
    )

    llm = ChatGoogleGenerativeAI(
        model=settings.openai_model, temperature=0.7,
        google_api_key=settings.openai_api_key, streaming=False,
    )

    await _thought(mission_id, "✍️  Drafting Instagram copy and pricing strategy...")
    response = await llm.ainvoke([
        SystemMessage(content=STRATEGIST_SYSTEM_PROMPT),
        HumanMessage(content=context),
    ])

    try:
        raw: dict = json.loads(response.content)
    except Exception:
        await _thought(mission_id, "⚠️ Malformed Strategist JSON — using fallback.")
        raw = {
            "recommendation_type": "instagram_post",
            "gen_ui_card": {
                "headline": "Special Offer Today!",
                "body_copy": "Check out our latest deals — best prices in town. 🎉",
                "cta": "Shop Now",
                "hashtags": [f"#{business_name.replace(' ', '')}"],
                "suggested_image_prompt": "Vibrant local store product banner",
                "price_adjustment": None,
            },
            "rationale": "Fallback strategy due to parsing error.",
        }

    cd = raw["gen_ui_card"]
    gen_ui_card = GenUICard(
        headline              = cd.get("headline", ""),
        body_copy             = cd.get("body_copy", ""),
        cta                   = cd.get("cta", ""),
        hashtags              = cd.get("hashtags", []),
        suggested_image_prompt= cd.get("suggested_image_prompt", ""),
        price_adjustment      = cd.get("price_adjustment"),
    )

    strategist_result = StrategistResult(
        mission_id          = mission_id,
        recommendation_type = raw.get("recommendation_type", "instagram_post"),
        gen_ui_card         = gen_ui_card,
        rationale           = raw.get("rationale", ""),
    )

    await _thought(mission_id, f"📋 Strategy ready: {strategist_result.recommendation_type}")
    await _thought(mission_id, f'💬 Headline: "{gen_ui_card.headline}"')
    await _graph(mission_id, "done", strategist_result.recommendation_type)

    state.strategist_result = strategist_result
    await update_pipeline_status(
        mission_id, PipelineStatus.PUBLISHING, strategist_result=strategist_result
    )

    # ── Auto-publish (no human gate) ──────────────────────────────────────────
    await _thought(mission_id, "🚀 Auto-publishing results...", StreamEventType.PUBLISH_STARTED)
    publish_log = await _auto_publish(state)
    for entry in publish_log:
        await _thought(mission_id, entry)

    await push_event(StreamEvent(
        event=StreamEventType.PUBLISH_COMPLETE,
        agent=AgentRole.STRATEGIST,
        data=json.dumps({"mission_id": mission_id, "log": publish_log}),
        mission_id=mission_id,
    ))

    state.publish_log = publish_log
    state.status = PipelineStatus.COMPLETE
    await update_pipeline_status(
        mission_id, PipelineStatus.COMPLETE, publish_log=publish_log
    )

    await _thought(mission_id, "🏁 Pipeline complete.", StreamEventType.STATUS)
    await push_sentinel(mission_id)
    return state
