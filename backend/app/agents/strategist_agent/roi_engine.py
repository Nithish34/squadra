"""ROI Engine"""

def estimate_roi(objective: str, budget: dict) -> str:
    """Estimate expected return."""
    if objective == "price competition":
        return "Estimated ROI: 8-12% (High volume, low margin)"
    elif objective == "acquisition":
        return "Estimated ROI: 12-18% (Medium volume, medium margin)"
    return "Estimated ROI: 15-25% (Branding focus, long-term LTV)"
