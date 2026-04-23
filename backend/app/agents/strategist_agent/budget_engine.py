"""Budget Engine"""

def calculate_budget(niche: str, city: str, objective: str) -> dict:
    """Recommend spend based on context."""
    # Simplified logic
    base_daily = 500
    if objective in ["acquisition", "price competition"]:
        base_daily += 300
        
    return {
        "daily": base_daily,
        "monthly": base_daily * 30,
        "currency": "INR"
    }
