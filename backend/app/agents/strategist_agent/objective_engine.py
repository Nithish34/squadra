"""Campaign Objective Engine"""

def determine_campaign_goal(analyst_result, business_name: str, niche: str) -> str:
    """Determine the primary objective of the campaign based on analyst gaps."""
    if not analyst_result or not analyst_result.gaps:
        return "awareness"
        
    categories = [g.category.lower() for g in analyst_result.gaps]
    
    if any("price" in c for c in categories):
        return "price competition"
    elif any("promo" in c for c in categories):
        return "acquisition"
    elif any("loyalty" in c for c in categories):
        return "retention"
    elif any("geo" in c or "deliver" in c for c in categories):
        return "local footfall"
        
    return "awareness"
