"""Jina Reader router for web scraping"""
import httpx

async def scrape_website(url: str, timeout: int = 30) -> tuple[str, str]:
    headers = {
        "Accept": "application/json",
        "X-Return-Format": "markdown,screenshot",
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            resp = await client.get(f"https://r.jina.ai/{url}", headers=headers)
            resp.raise_for_status()
            data = resp.json().get("data", {})
            markdown_content = data.get("content", "")
            screenshot_url = data.get("screenshotUrl", "")
            if not markdown_content:
                return f"[SCRAPE_ERROR] No content found", ""
            return markdown_content[:6000], screenshot_url
    except Exception as exc:
        return f"[SCRAPE_ERROR] {exc}", ""
