"""Contradiction Detector"""

def detect_contradictions(gaps: list[dict]) -> list[dict]:
    """Detect conflicting strategies and flag them."""
    has_premium = any("premium" in g.get("opportunity", "").lower() for g in gaps)
    has_discount = any("lowest" in g.get("opportunity", "").lower() or "cheap" in g.get("opportunity", "").lower() for g in gaps)
    
    for gap in gaps:
        opp = gap.get("opportunity", "").lower()
        if has_premium and has_discount:
            if "premium" in opp or "lowest" in opp or "cheap" in opp:
                if "analysis_path" not in gap:
                    gap["analysis_path"] = []
                gap["analysis_path"].append("WARNING: Potential contradiction detected between premium branding and lowest-pricing strategies.")
                gap["confidence_reason"] = gap.get("confidence_reason", "") + " (Confidence reduced due to strategic contradiction)"
                gap["signal_strength"] = max(0.1, gap.get("signal_strength", 0.5) - 0.2)
    return gaps
