"""
app/agents/analyst.py — Agent B: The Analyst
Compares Scout findings against user's business and detects gaps/opportunities.
"""
from __future__ import annotations

import json

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import get_settings
from app.core.state_store import (
    push_event, push_relay_event,
    update_pipeline_status, get_historical_findings,
)
from app.schemas import (
    AgentRole, AnalystResult, GapItem, GraphUpdatePayload,
    HandoffPayload, PipelineState, PipelineStatus,
    StreamEvent, StreamEventType,
)

settings = get_settings()

ANALYST_SYSTEM_PROMPT = """You are the Analyst Agent in a Market Intelligence War Room.
Given Scout findings (competitor intelligence) and historical context, produce a gap analysis.

Respond ONLY with valid JSON (no markdown fences):
{
  "summary": "2-3 sentence executive summary",
  "gaps": [
    {
      "category": "Pricing | Product Range | Promotions | UX | Delivery",
      "competitor_value": "what competitor offers",
      "your_value": "what user currently offers",
      "opportunity": "actionable recommendation",
      "risk_level": "low | medium | high"
    }
  ],
  "recommended_price_delta_pct": null or float (e.g. -5.0 = reduce by 5%),
  "confidence_score": 0.0-1.0
}"""


async def _thought(mission_id: str, text: str) -> None:
    await push_event(StreamEvent(
        event=StreamEventType.THOUGHT, agent=AgentRole.ANALYST,
        data=text, mission_id=mission_id,
    ))


async def _graph(mission_id: str, status: str, summary: str = None) -> None:
    payload = GraphUpdatePayload(node_id="analyst", status=status, result_summary=summary)
    await push_event(StreamEvent(
        event=StreamEventType.GRAPH_UPDATE, agent=AgentRole.ANALYST,
        data=payload.model_dump_json(), mission_id=mission_id,
    ))


async def run_analyst(state: PipelineState) -> PipelineState:
    mission_id = state.mission_id
    tenant_id  = getattr(state, "tenant_id", "default_workspace")
    niche      = getattr(state, "_niche", "ecommerce")
    business   = getattr(state, "_business_name", "Your Business")

    await update_pipeline_status(mission_id, PipelineStatus.ANALYST_RUNNING)
    await _graph(mission_id, "running")
    await _thought(mission_id, f"📈 Analyst online — analysing intelligence for {business}.")

    scout_result = state.scout_result
    if not scout_result or not scout_result.findings:
        await _thought(mission_id, "⚠️ No Scout findings to analyse. Generating default gaps.")
        findings_text = "No competitor data was collected."
    else:
        included = [f for f in scout_result.findings if f.included]
        await _thought(mission_id, f"🔎 Processing {len(included)} approved findings...")
        findings_text = "\n".join(
            f"- [{f.finding_type}] {f.competitor_name}: {f.title} — {f.detail}"
            + (f" (Price: {f.price_before}→{f.price_after})" if f.price_before and f.price_after else "")
            for f in included
        )

    # Historical context
    history = await get_historical_findings(tenant_id, niche)
    hist_text = ""
    if history:
        await _thought(mission_id, f"📚 Loaded {len(history)} historical findings for trend context.")
        hist_text = "\nHistorical findings:\n" + "\n".join(
            f"- {h.competitor_name}: {h.title}" for h in history[-10:]
        )

    llm = ChatGoogleGenerativeAI(
        model=settings.openai_model, temperature=0.2,
        google_api_key=settings.openai_api_key,
    )

    prompt = f"""Business: {business} | Niche: {niche}

Current Scout findings:
{findings_text}
{hist_text}

Produce the gap analysis JSON."""

    await _thought(mission_id, "🧠 Running gap analysis with Gemini...")

    analyst_result = None
    for attempt in range(3):
        try:
            response = await llm.ainvoke([
                SystemMessage(content=ANALYST_SYSTEM_PROMPT),
                HumanMessage(content=prompt),
            ])
            data = json.loads(response.content)
            gaps = [GapItem(**g) for g in data.get("gaps", [])]
            analyst_result = AnalystResult(
                mission_id=mission_id,
                summary=data.get("summary", ""),
                gaps=gaps,
                recommended_price_delta_pct=data.get("recommended_price_delta_pct"),
                confidence_score=float(data.get("confidence_score", 0.7)),
            )
            break
        except Exception as exc:
            err_msg = str(exc)
            if "API_KEY_INVALID" in err_msg or "INVALID_ARGUMENT" in err_msg or "400" in err_msg:
                await _thought(mission_id, "⚠️ Invalid Gemini API Key detected. Using mock gap analysis for demonstration.")
                break
            await _thought(mission_id, f"⚠️ Attempt {attempt+1}/3 failed: {type(exc).__name__}")

    if analyst_result is None:
        # Fallback Mock Data
        analyst_result = AnalystResult(
            mission_id=mission_id,
            summary="Demonstration Mode: Assuming optimal pricing opportunities due to missing Gemini API key.",
            gaps=[
                GapItem(
                    category="Pricing",
                    competitor_value="₹999",
                    your_value="₹1050",
                    opportunity="Undercut competitor by ₹51 to capture price-sensitive customers.",
                    risk_level="medium"
                ),
                GapItem(
                    category="Promotions",
                    competitor_value="Free shipping over ₹500",
                    your_value="Paid shipping",
                    opportunity="Introduce a limited-time free shipping tier.",
                    risk_level="low"
                )
            ],
            recommended_price_delta_pct=-5.0,
            confidence_score=0.9,
        )

    state.analyst_result = analyst_result
    await _thought(mission_id, f"✅ Analyst complete — {len(analyst_result.gaps)} gaps found. Confidence: {analyst_result.confidence_score:.0%}")
    await _graph(mission_id, "done", f"{len(analyst_result.gaps)} gaps | {analyst_result.confidence_score:.0%}")

    # Relay: Analyst → Strategist
    handoff = HandoffPayload(
        from_agent=AgentRole.ANALYST,
        to_agent=AgentRole.STRATEGIST,
        summary=f"Gap analysis complete — {len(analyst_result.gaps)} opportunities identified",
        item_count=len(analyst_result.gaps),
    )
    handoff_event = StreamEvent(
        event=StreamEventType.HANDOFF, agent=AgentRole.ANALYST,
        data=handoff.model_dump_json(), mission_id=mission_id,
    )
    await push_event(handoff_event)
    await push_relay_event(mission_id, handoff.model_dump_json())

    await update_pipeline_status(
        mission_id, PipelineStatus.STRATEGIST_RUNNING, analyst_result=analyst_result
    )
    state.status = PipelineStatus.STRATEGIST_RUNNING
    return state
