"""Cluster Engine"""

def cluster_gaps(gaps: list[dict]) -> list[dict]:
    """Group related gaps into macro opportunities."""
    for gap in gaps:
        cat = gap.get("category", "").lower()
        opp_type = gap.get("opportunity_type", "").lower()
        
        combined = cat + " " + opp_type
        
        if "price" in combined or "cost" in combined:
            gap["cluster"] = "Pricing Strategy Optimization"
        elif "promo" in combined or "discount" in combined:
            gap["cluster"] = "Aggressive Promotion Campaign"
        elif "deliver" in combined or "convenience" in combined or "geo" in combined:
            gap["cluster"] = "Local Convenience Dominance"
        elif "ux" in combined or "service" in combined:
            gap["cluster"] = "Customer Experience Enhancement"
        else:
            gap["cluster"] = "Product & Brand Positioning"
    return gaps
