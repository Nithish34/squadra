"""Validator Engine"""
from app.schemas import StrategistResult, GenUICard, CampaignVariant
from typing import Optional

def validate_result(llm_output: dict, mission_id: str, enriched_data: dict) -> Optional[StrategistResult]:
    """Validate Strategist output."""
    try:
        if not llm_output.get("marketing_strategy"):
            return None
            
        variants = []
        for v in enriched_data.get("campaign_variants", []):
            try:
                variants.append(CampaignVariant(**v))
            except Exception as e:
                print(f"Variant validation error: {e}")
                
        gen_ui_card = GenUICard(
            marketing_strategy=llm_output.get("marketing_strategy", ""),
            instagram_poster_prompt=llm_output.get("instagram_poster_prompt", ""),
            facebook_poster_prompt=llm_output.get("facebook_poster_prompt", ""),
            suggested_offers=enriched_data.get("suggested_offers", []),
            campaign_goal=enriched_data.get("campaign_goal", ""),
            estimated_roi=enriched_data.get("estimated_roi", ""),
            execution_priority=enriched_data.get("execution_priority", 1),
            risk_analysis=enriched_data.get("risk_analysis", ""),
            location_strategy=llm_output.get("location_strategy", ""),
            visual_style=llm_output.get("visual_style", ""),
            target_persona=llm_output.get("target_persona", ""),
            counter_strategy=llm_output.get("counter_strategy", ""),
            offer_score=enriched_data.get("offer_score", 0.0),
            recommended_budget=enriched_data.get("recommended_budget", {}),
            cta_options=enriched_data.get("cta_options", []),
            posting_schedule=enriched_data.get("posting_schedule", {}),
            campaign_variants=variants
        )
        
        return StrategistResult(
            mission_id=mission_id,
            recommendation_type="marketing_strategy",
            gen_ui_card=gen_ui_card,
            rationale="Strategy validated and enriched by deterministic engines."
        )
    except Exception as e:
        print(f"Strategist validation error: {e}")
        return None
