"""Context Builder for Analyst Agent"""
from app.schemas import ScoutResult

def build_context(scout_result: ScoutResult, business_name: str, niche: str, history: list) -> str:
    """Combines inputs into a single structured reasoning context."""
    # Convert scout result to dict for formatting
    scout_dict = {
        "product_info": scout_result.product_info.model_dump() if scout_result.product_info else {},
        "competitors": [c.model_dump() for c in scout_result.competitors if c.included],
        "pricing": scout_result.pricing.model_dump() if scout_result.pricing else {},
        "market_sentiment": scout_result.market_sentiment.model_dump() if scout_result.market_sentiment else {}
    }
    
    import json
    scout_str = json.dumps(scout_dict, indent=2)
    
    # Safely dump history ensuring models are serialized if they are objects
    try:
        history_str = json.dumps([h.model_dump() for h in history[-5:]], indent=2) if history else "No history."
    except AttributeError:
        history_str = json.dumps(history[-5:], indent=2) if history else "No history."
        
    return f"""BUSINESS: {business_name}
NICHE: {niche}

FRESH SCOUT INTELLIGENCE:
{scout_str}

HISTORICAL TRENDS:
{history_str}
"""
