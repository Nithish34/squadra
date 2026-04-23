"""Scout Agent Structurer - converts raw content into structured JSON"""
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import get_settings

settings = get_settings()

SCOUT_STRUCTURER_PROMPT = """You are the Data Structurer for the Scout Agent.
Extract intelligence from the raw HTML/Markdown snippets into a structured JSON format.
Follow this schema EXACTLY:
{
  "product_info": { "name": "", "category": "", "description": "", "features": [], "target_audience": "", "benefits": [], "brand_tone": "" },
  "geo_data": { "location": "", "coordinates": null, "traffic_level": "", "nearby_landmarks": [], "distance_score": "" },
  "competitors": [ { "name": "", "url": "", "products": [], "messaging": "", "promotions": [], "included": true } ],
  "pricing": { "average_price": 0.0, "price_range": "", "competitor_prices": {} },
  "market_sentiment": { "positive_feedback": [], "customer_complaints": [], "trending_problems": [], "feature_requests": [] }
}
Return ONLY valid JSON. Use the user's business context below to make the analysis more accurate and relevant.
"""

def _build_context_block(**kwargs) -> str:
    """Builds a rich context block from the user's setup inputs."""
    lines = []
    if kwargs.get("business_name"):
        lines.append(f"Business Name: {kwargs['business_name']}")
    if kwargs.get("business_category"):
        lines.append(f"Business Category: {kwargs['business_category']}")
    if kwargs.get("address"):
        lines.append(f"Address: {kwargs['address']}")
    if kwargs.get("product_name"):
        lines.append(f"Primary Product/Service: {kwargs['product_name']}")
    if kwargs.get("price_range"):
        lines.append(f"Our Price Range: {kwargs['price_range']}")
    if kwargs.get("current_price"):
        lines.append(f"Current Price: {kwargs['current_price']}")
    if kwargs.get("usp"):
        lines.append(f"Unique Selling Point: {kwargs['usp']}")
    if kwargs.get("target_audience"):
        lines.append(f"Target Audience: {kwargs['target_audience']}")
    if kwargs.get("age_group"):
        lines.append(f"Age Group: {kwargs['age_group']}")
    if kwargs.get("business_goal"):
        lines.append(f"Business Goal: {kwargs['business_goal']}")
    if kwargs.get("website"):
        lines.append(f"Our Website: {kwargs['website']}")
    if kwargs.get("monthly_budget") and kwargs["monthly_budget"] > 0:
        lines.append(f"Monthly Marketing Budget: {kwargs['monthly_budget']}")
    if kwargs.get("business_stage"):
        lines.append(f"Business Stage: {kwargs['business_stage']}")
    if kwargs.get("brand_positioning"):
        lines.append(f"Brand Positioning: {kwargs['brand_positioning']}")
    if kwargs.get("avg_price"):
        lines.append(f"Average Selling Price: {kwargs['avg_price']}")
    if kwargs.get("discount_range"):
        lines.append(f"Discount Range: {kwargs['discount_range']}")
    if kwargs.get("spending_level"):
        lines.append(f"Audience Spending Level: {kwargs['spending_level']}")
    if kwargs.get("business_challenges"):
        challenges = kwargs["business_challenges"]
        if isinstance(challenges, list):
            lines.append(f"Business Challenges: {'; '.join(challenges)}")
    return "\n".join(lines)


async def structure_data(
    raw_content: str,
    city: str,
    niche: str,
    **context_kwargs,
) -> dict:
    llm = ChatGoogleGenerativeAI(
        model=settings.openai_model, temperature=0,
        google_api_key=settings.openai_api_key,
    )

    context_block = _build_context_block(**context_kwargs)
    prompt = (
        f"City: {city}\nNiche: {niche}\n"
        + (f"\n## User Business Context\n{context_block}\n" if context_block else "")
        + f"\n## Raw Competitor Content\n{raw_content}"
    )

    for attempt in range(3):
        try:
            resp = await llm.ainvoke([
                SystemMessage(content=SCOUT_STRUCTURER_PROMPT),
                HumanMessage(content=prompt)
            ])
            raw = resp.content.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw).strip()
            return json.loads(raw)
        except Exception as e:
            if "API_KEY_INVALID" in str(e) or "400" in str(e) or "INVALID_ARGUMENT" in str(e):
                break
            pass

    # Mock fallback
    business_name = context_kwargs.get("business_name", "Unknown Business")
    return {
        "product_info": { "name": business_name, "category": niche, "description": "A demo product", "features": ["Fast"], "target_audience": context_kwargs.get("target_audience", "Local"), "benefits": [], "brand_tone": "Professional" },
        "geo_data": { "location": city, "coordinates": None, "traffic_level": "High", "nearby_landmarks": [], "distance_score": "Close" },
        "competitors": [ { "name": "Competitor X", "url": "https://example.com", "products": [], "messaging": "We are best", "promotions": ["10% off"], "included": True } ],
        "pricing": { "average_price": 100.0, "price_range": context_kwargs.get("price_range", "50-150"), "competitor_prices": {"Competitor X": 90.0} },
        "market_sentiment": { "positive_feedback": ["Great service"], "customer_complaints": ["Slow delivery"], "trending_problems": [], "feature_requests": [] }
    }
