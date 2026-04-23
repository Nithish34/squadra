"""Single Gemini Strategy Generation"""
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import get_settings

settings = get_settings()

with open("app/agents/strategist_agent/prompts/strategist_prompt.txt", "r", encoding="utf-8") as f:
    STRATEGIST_PROMPT = f.read()

async def generate_strategy(context: str, objective: str) -> dict:
    llm = ChatGoogleGenerativeAI(
        model=settings.openai_model, temperature=0.7,
        google_api_key=settings.openai_api_key,
    )
    
    prompt = f"CAMPAIGN OBJECTIVE: {objective}\n\nCONTEXT:\n{context}\n\nGenerate the Strategy JSON."
    
    for attempt in range(3):
        try:
            resp = await llm.ainvoke([
                SystemMessage(content=STRATEGIST_PROMPT),
                HumanMessage(content=prompt)
            ])
            raw = resp.content.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw).strip()
            return json.loads(raw)
        except Exception as e:
            if "API_KEY_INVALID" in str(e) or "400" in str(e) or "INVALID_ARGUMENT" in str(e):
                break
    return {}
