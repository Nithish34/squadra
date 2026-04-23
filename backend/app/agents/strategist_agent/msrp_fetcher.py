"""MSRP Discovery Engine"""
import json
import httpx
from app.core.config import get_settings

settings = get_settings()

async def fetch_msrp(keywords: list[str]) -> str:
    """Use live search via Serper API to find product MSRP in INR."""
    if not keywords:
        return "N/A"
        
    query = keywords[0]
    serper_api_key = settings.serper_api_key
    if not serper_api_key:
        return "Simulated MSRP: ₹450 (SERPER_API_KEY missing)"
        
    try:
        url = "https://google.serper.dev/search"
        payload = json.dumps({"q": f"{query} manufacturer price MSRP India in INR"})
        headers = {
            'X-API-KEY': serper_api_key,
            'Content-Type': 'application/json'
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, headers=headers, data=payload)
            results = resp.json()
            snippet = results.get("organic", [{}])[0].get("snippet", "No clear search result.")
            price_guess = [word for word in snippet.split() if '₹' in word or 'Rs' in word]
            price = price_guess[0] if price_guess else "(Price not clearly visible in snippet)"
            
            return f"MSRP Search Result: {snippet} | Extracted: {price}"
    except Exception as exc:
        return f"MSRP Search Failed: {exc}"
