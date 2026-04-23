"""CTA Engine"""

def generate_cta(objective: str) -> list[str]:
    """Generate multiple CTA options."""
    if objective == "acquisition":
        return ["Buy Now", "Claim Offer", "Get 20% Off"]
    elif objective == "local footfall":
        return ["Visit Us Today", "Get Directions", "Claim In-Store Offer"]
    elif objective == "retention":
        return ["Join Loyalty Program", "Exclusive VIP Access"]
    return ["Learn More", "Contact Us", "See Products"]
