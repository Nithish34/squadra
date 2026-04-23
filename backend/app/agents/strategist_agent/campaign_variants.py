"""Campaign Variant Generator"""

def build_variants(strategy_json: dict, cta_options: list[str]) -> list[dict]:
    """Create multiple campaign angles."""
    default_cta = cta_options[0] if cta_options else "Learn More"
    return [
        {
            "variant_name": "Aggressive Discount",
            "platform": "Instagram",
            "campaign_angle": "Price leadership and urgency",
            "offer": "20% OFF 48 hours only",
            "cta": default_cta,
            "expected_roi": "High volume, low margin"
        },
        {
            "variant_name": "Premium Branding",
            "platform": "Facebook",
            "campaign_angle": "Community trust and quality",
            "offer": "Free Consultation",
            "cta": "Book Now",
            "expected_roi": "Low volume, high margin"
        }
    ]
