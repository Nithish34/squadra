"""Ranking Engine"""

def rank_gaps(gaps: list[dict]) -> list[dict]:
    """Assign priority_rank based on weighted score."""
    for gap in gaps:
        sev = gap.get("severity_score", 0.0)
        sig = gap.get("signal_strength", 0.0)
        score = (sev * 0.6) + (sig * 0.4)
        gap["_temp_score"] = score
        
    gaps.sort(key=lambda x: x["_temp_score"], reverse=True)
    
    for i, gap in enumerate(gaps):
        gap["priority_rank"] = i + 1
        del gap["_temp_score"]
        
    return gaps
