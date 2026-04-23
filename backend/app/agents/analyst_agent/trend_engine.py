"""Trend Engine"""

def detect_trends(gaps: list[dict], history: list) -> list[dict]:
    """Determine trend direction based on historical frequency."""
    for gap in gaps:
        if len(history) > 2:
            gap["trend_direction"] = "growing"
        elif len(history) > 0:
            gap["trend_direction"] = "stable"
        else:
            gap["trend_direction"] = "uncertain"
    return gaps
