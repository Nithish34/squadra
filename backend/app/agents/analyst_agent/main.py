"""
Analyst Agent Main Orchestrator
"""
from app.schemas import PipelineState, PipelineStatus, StreamEvent, StreamEventType, AgentRole, AnalystResult, HandoffPayload, GapItem
from app.core.state_store import push_event, push_relay_event, update_pipeline_status, get_historical_findings
from app.agents.analyst_agent.contextualizer import build_context
from app.agents.analyst_agent.similarity_retriever import retrieve_similar_records
from app.agents.analyst_agent.geo_reasoner import enrich_geo_context
from app.agents.analyst_agent.gap_analyzer import run_gap_analysis
from app.agents.analyst_agent.scorer import score_gaps
from app.agents.analyst_agent.clusterer import cluster_gaps
from app.agents.analyst_agent.trend_engine import detect_trends
from app.agents.analyst_agent.confidence_engine import calculate_confidence
from app.agents.analyst_agent.contradiction_detector import detect_contradictions
from app.agents.analyst_agent.ranking_engine import rank_gaps
from app.agents.analyst_agent.validator import validate_output

async def _thought(mission_id: str, text: str) -> None:
    await push_event(StreamEvent(
        event=StreamEventType.THOUGHT, agent=AgentRole.ANALYST,
        data=text, mission_id=mission_id,
    ))

async def _graph(mission_id: str, status: str, summary: str = None) -> None:
    from app.schemas import GraphUpdatePayload
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
    await _thought(mission_id, f"📈 Analyst Reasoning Engine online — analyzing market context.")

    scout_result = state.scout_result
    
    # Context
    history = await get_historical_findings(tenant_id, niche)
    context = build_context(scout_result, business, niche, history)
    
    await _thought(mission_id, "🧠 Retrieving similar historical market scenarios from pgvector...")
    similar_history = await retrieve_similar_records(scout_result)
    
    geo_advantage = enrich_geo_context(scout_result.geo_data if scout_result else None)
    await _thought(mission_id, f"🗺️ Geo context: {geo_advantage}")
    
    await _thought(mission_id, "🔬 Executing Gemini Gap Analysis...")
    llm_result = await run_gap_analysis(context, similar_history, geo_advantage)
    
    if not llm_result:
        llm_result = {
            "executive_summary": "Demonstration Mock Output due to failure.",
            "gaps": [{
                "category": "Pricing",
                "competitor_value": "High",
                "your_value": "Medium",
                "opportunity": "Undercut top competitors",
                "risk_level": "medium",
                "opportunity_type": "pricing",
                "source_references": ["Demo Data"],
                "analysis_path": ["Fallback mock path triggered"]
            }]
        }
        
    gaps = llm_result.get("gaps", [])
    
    await _thought(mission_id, "⚙️ Running Scorer and Confidence Engines...")
    gaps = score_gaps(gaps, scout_result)
    confidence, gaps = calculate_confidence(gaps, scout_result, history)
    
    await _thought(mission_id, "📊 Running Trend & Cluster Engines...")
    gaps = detect_trends(gaps, history)
    gaps = cluster_gaps(gaps)
    
    await _thought(mission_id, "⚖️ Running Contradiction Detector & Ranking Engines...")
    gaps = detect_contradictions(gaps)
    gaps = rank_gaps(gaps)
    
    llm_result["gaps"] = gaps
    
    await _thought(mission_id, "🛡️ Validating final JSON...")
    validated = validate_output(llm_result, mission_id, confidence)
    
    if not validated:
        validated = AnalystResult(
            mission_id=mission_id,
            executive_summary="Emergency Fallback",
            gaps=[],
            confidence_score=0.1
        )
        
    state.analyst_result = validated
    
    await _thought(mission_id, f"✅ Analyst complete — {len(validated.gaps)} highly prioritized gaps identified. Confidence: {validated.confidence_score:.0%}")
    await _graph(mission_id, "done", f"{len(validated.gaps)} gaps | {validated.confidence_score:.0%}")

    handoff = HandoffPayload(
        from_agent=AgentRole.ANALYST,
        to_agent=AgentRole.STRATEGIST,
        summary=f"Gap analysis complete — passing {len(validated.gaps)} prioritized opportunities",
        item_count=len(validated.gaps),
    )
    handoff_event = StreamEvent(
        event=StreamEventType.HANDOFF, agent=AgentRole.ANALYST,
        data=handoff.model_dump_json(), mission_id=mission_id,
    )
    await push_event(handoff_event)
    await push_relay_event(mission_id, handoff.model_dump_json())

    await update_pipeline_status(
        mission_id, PipelineStatus.STRATEGIST_RUNNING, analyst_result=validated
    )
    state.status = PipelineStatus.STRATEGIST_RUNNING
    return state
