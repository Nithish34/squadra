"""Scoring Engine"""

def score_gaps(gaps: list[dict], scout_result) -> list[dict]:
    """Assign severity, signal strength, and competitor similarity."""
    for gap in gaps:
        risk_map = {"high": 0.9, "medium": 0.6, "low": 0.3}
        risk_val = risk_map.get(gap.get("risk_level", "medium").lower(), 0.5)
        
        comp_count = len(scout_result.competitors) if scout_result else 1
        
        severity = min(risk_val + (comp_count * 0.05), 1.0)
        gap["severity_score"] = round(severity, 2)
        
        refs = len(gap.get("source_references", []))
        signal = min(0.3 + (refs * 0.2), 1.0)
        gap["signal_strength"] = round(signal, 2)
        
        gap["competitor_similarity"] = 0.5 if gap.get("opportunity_type") == "pricing" else 0.8
        
        if not gap.get("risk_reason"):
            gap["risk_reason"] = f"Calculated based on {gap.get('risk_level')} risk profile."
            
    return gaps
