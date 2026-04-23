"""Confidence Engine"""

def calculate_confidence(gaps: list[dict], scout_result, history: list) -> tuple[float, list[dict]]:
    """Generate overall confidence score and individual gap confidence reasons."""
    comp_count = len(scout_result.competitors) if scout_result else 0
    hist_count = len(history)
    
    overall_confidence = min(0.5 + (comp_count * 0.1) + (hist_count * 0.05), 0.98)
    
    for gap in gaps:
        refs = len(gap.get("source_references", []))
        gap["confidence_reason"] = f"Supported by {comp_count} market competitors, {hist_count} historical trends, and {refs} direct sources."
        
    return round(overall_confidence, 2), gaps
