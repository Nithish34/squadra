"""Risk Engine"""

def analyze_risk(objective: str, offer_score: float) -> str:
    """Analyze campaign risks."""
    if objective == "price competition":
        return "High Risk: Margin loss and discount fatigue. Potential for price war."
    elif offer_score > 0.8:
        return "Low Risk: Balanced offer with strong margins."
    return "Medium Risk: Monitor customer acquisition cost closely."
