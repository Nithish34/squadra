"""TomTom Router for Geo Intelligence"""
import httpx
from app.core.config import get_settings

settings = get_settings()

async def discover_local_competitors(niche: str, city: str) -> list[dict]:
    tomtom_key = settings.tomtom_api_key
    if not tomtom_key:
        return []
    try:
        url = f"https://api.tomtom.com/search/2/search/{niche}%20in%20{city}.json"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params={"key": tomtom_key, "limit": 4})
            results = resp.json().get("results", [])
            
        discovered = []
        for r in results:
            name = r.get("poi", {}).get("name", "Unknown Store")
            website = r.get("poi", {}).get("url")
            if website:
                if not website.startswith("http"):
                    website = "https://" + website
                discovered.append({"name": name, "url": website})
        return discovered
    except Exception as exc:
        print(f"TomTom API error: {exc}")
        return []
