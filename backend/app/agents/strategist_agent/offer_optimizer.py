"""Offer Optimizer Engine"""

def optimize_offers(strategy_json: dict, analyst_result) -> tuple[float, list[str]]:
    """Generate smart offers based on context."""
    offers = []
    score = 0.8
    
    if analyst_result and getattr(analyst_result, "recommended_price_delta_pct", None):
        delta = analyst_result.recommended_price_delta_pct
        if delta < -10:
            offers.append(f"Blowout Sale: {abs(delta)}% OFF competitor pricing!")
            score += 0.1
        elif delta < 0:
            offers.append(f"Match & Beat: We beat market average by {abs(delta)}%.")
            score += 0.05
        else:
            offers.append("Premium Quality Guarantee: Why pay less for lower quality?")
            score -= 0.1
            
    offers.append("Limited Time: Free Consultation / Demo for First 10 Customers")
    offers.append("Bundle Offer: Add a complementary service for 20% off")
    
    return min(score, 1.0), offers
