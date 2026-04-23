"""
Strategist Agent Main Orchestrator
"""
from app.schemas import PipelineState, PipelineStatus, StreamEvent, StreamEventType, AgentRole, StrategistResult, GenUICard
from app.core.state_store import push_event, push_sentinel, update_pipeline_status
from app.agents.strategist_agent.contextualizer import build_context
from app.agents.strategist_agent.msrp_fetcher import fetch_msrp
from app.agents.strategist_agent.objective_engine import determine_campaign_goal
from app.agents.strategist_agent.strategy_generator import generate_strategy
from app.agents.strategist_agent.offer_optimizer import optimize_offers
from app.agents.strategist_agent.channel_optimizer import expand_channels
from app.agents.strategist_agent.budget_engine import calculate_budget
from app.agents.strategist_agent.cta_engine import generate_cta
from app.agents.strategist_agent.campaign_variants import build_variants
from app.agents.strategist_agent.roi_engine import estimate_roi
from app.agents.strategist_agent.risk_engine import analyze_risk
from app.agents.strategist_agent.ranking_engine import rank_strategy
from app.agents.strategist_agent.validator import validate_result

async def _thought(mission_id: str, text: str, event: StreamEventType = StreamEventType.THOUGHT) -> None:
    await push_event(StreamEvent(
        event=event, agent=AgentRole.STRATEGIST,
        data=text, mission_id=mission_id,
    ))

async def _graph(mission_id: str, status: str, summary: str = None) -> None:
    from app.schemas import GraphUpdatePayload
    payload = GraphUpdatePayload(node_id="strategist", status=status, result_summary=summary)
    await push_event(StreamEvent(
        event=StreamEventType.GRAPH_UPDATE, agent=AgentRole.STRATEGIST,
        data=payload.model_dump_json(), mission_id=mission_id,
    ))

async def run_strategist(state: PipelineState) -> PipelineState:
    mission_id = state.mission_id
    analyst    = state.analyst_result

    await _thought(mission_id, "🧠 Strategist Autonomous Campaign Architect online.")
    await _graph(mission_id, "running")

    business_name  = getattr(state, "_business_name", "Your Business")
    niche          = getattr(state, "_niche", "ecommerce")
    city           = getattr(state, "_city", "Coimbatore")
    keywords       = getattr(state, "_keywords", [])

    await _thought(mission_id, "🌐 Discovering MSRP baseline...")
    msrp = await fetch_msrp(keywords)
    
    await _thought(mission_id, "🏗️ Building Strategy Context...")
    context = build_context(analyst, business_name, niche, city, msrp)
    
    objective = determine_campaign_goal(analyst, business_name, niche)
    await _thought(mission_id, f"🎯 Determined Campaign Objective: {objective.upper()}")
    
    await _thought(mission_id, "✍️  Executing Gemini Strategy Generation...")
    strategy_json = await generate_strategy(context, objective)
    
    if not strategy_json:
        strategy_json = {
            "marketing_strategy": "Mock fallback marketing strategy due to generation error.",
            "location_strategy": "Mock location strategy.",
            "visual_style": "Vibrant and clear",
            "target_persona": "Local audience",
            "counter_strategy": "Focus on unique value.",
            "instagram_poster_prompt": "A modern poster for a local business.",
            "facebook_poster_prompt": "A modern facebook ad for a local business."
        }
        
    await _thought(mission_id, "⚙️ Running Offer, Channel, and Budget Optimizers...")
    offer_score, offers = optimize_offers(strategy_json, analyst)
    channels = expand_channels(strategy_json)
    budget = calculate_budget(niche, city, objective)
    
    await _thought(mission_id, "📊 Running CTA, Variant, ROI, and Risk Engines...")
    cta_options = generate_cta(objective)
    variants = build_variants(strategy_json, cta_options)
    roi = estimate_roi(objective, budget)
    risk = analyze_risk(objective, offer_score)
    priority = rank_strategy(objective, offer_score)
    
    enriched_data = {
        "campaign_goal": objective,
        "suggested_offers": offers,
        "posting_schedule": channels,
        "recommended_budget": budget,
        "cta_options": cta_options,
        "campaign_variants": variants,
        "estimated_roi": roi,
        "risk_analysis": risk,
        "execution_priority": priority,
        "offer_score": offer_score
    }
    
    await _thought(mission_id, "🛡️ Validating Final Campaign Architecture...")
    validated = validate_result(strategy_json, mission_id, enriched_data)
    
    if not validated:
        validated = StrategistResult(
            mission_id=mission_id,
            recommendation_type="marketing_strategy",
            gen_ui_card=GenUICard(
                marketing_strategy="Emergency Fallback Strategy",
                instagram_poster_prompt="",
                facebook_poster_prompt="",
                suggested_offers=[]
            ),
            rationale="Fallback due to validation failure."
        )
        
    state.strategist_result = validated
    
    await _thought(mission_id, f"📋 Architecture ready with priority {validated.gen_ui_card.execution_priority}.")
    await _graph(mission_id, "done", "Campaign Ready")

    await update_pipeline_status(
        mission_id, PipelineStatus.PUBLISHING, strategist_result=validated
    )

    state.publish_log = []
    state.status = PipelineStatus.COMPLETE
    await update_pipeline_status(
        mission_id, PipelineStatus.COMPLETE, publish_log=state.publish_log
    )

    await _thought(mission_id, "🏁 Pipeline complete.", StreamEventType.STATUS)
    await push_sentinel(mission_id)
    return state
