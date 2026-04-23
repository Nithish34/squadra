"""Validator Engine"""
from app.schemas import AnalystResult, GapItem
from typing import Optional

def validate_output(llm_output: dict, mission_id: str, confidence_score: float) -> Optional[AnalystResult]:
    """Validates the output against the schema."""
    try:
        if "gaps" not in llm_output or not isinstance(llm_output["gaps"], list):
            return None
            
        valid_gaps = []
        for g in llm_output["gaps"]:
            if not g.get("category") or not g.get("opportunity"):
                continue
            
            rl = g.get("risk_level", "medium").lower()
            if rl not in ["low", "medium", "high"]:
                rl = "medium"
            g["risk_level"] = rl
            
            if not isinstance(g.get("source_references"), list):
                g["source_references"] = []
            if not isinstance(g.get("analysis_path"), list):
                g["analysis_path"] = []
                
            try:
                valid_gaps.append(GapItem(**g))
            except Exception as e:
                print(f"Gap validation error: {e}")
                
        if not valid_gaps:
            return None
            
        return AnalystResult(
            mission_id=mission_id,
            executive_summary=llm_output.get("executive_summary", "Market intelligence analyzed successfully."),
            gaps=valid_gaps,
            confidence_score=confidence_score
        )
    except Exception as e:
        print(f"Validation error: {e}")
        return None
