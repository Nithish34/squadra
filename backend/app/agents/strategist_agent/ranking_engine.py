"""Ranking Engine"""

def rank_strategy(objective: str, offer_score: float) -> int:
    """Assign execution priority."""
    if offer_score > 0.8:
        return 1
    elif objective in ["acquisition", "price competition"]:
        return 2
    return 3
