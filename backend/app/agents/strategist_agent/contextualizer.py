"""Strategist Context Builder"""

def build_context(analyst_result, business_name: str, niche: str, city: str, msrp_info: str) -> str:
    """Merge insights into a single strategy context payload."""
    gaps_str = "\n".join(
        f"- [{g.risk_level}] {g.category}: {g.opportunity} (Severity: {getattr(g, 'severity_score', 0.0)})"
        for g in (analyst_result.gaps if analyst_result else [])
    ) or "None identified."
    
    summary = ""
    if analyst_result:
        summary = getattr(analyst_result, "summary", getattr(analyst_result, "executive_summary", "N/A"))
        
    return (
        f"Business: {business_name} | Niche: {niche} | City: {city}\n\n"
        f"Analyst Summary:\n{summary}\n\n"
        f"Key Gaps & Opportunities:\n{gaps_str}\n\n"
        f"Manufacturer Web Search Data: {msrp_info}\n\n"
        f"Recommended price delta: {analyst_result.recommended_price_delta_pct if analyst_result else 'N/A'}%"
    )
