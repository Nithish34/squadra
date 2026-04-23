"""Gap Analyzer - Single Gemini Reasoning Call"""
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import get_settings

settings = get_settings()

with open("app/agents/analyst_agent/prompts/analyst_prompt.txt", "r", encoding="utf-8") as f:
    ANALYST_PROMPT = f.read()

async def run_gap_analysis(context: str, history: list, geo_advantage: str) -> dict:
    llm = ChatGoogleGenerativeAI(
        model=settings.openai_model, temperature=0.2,
        google_api_key=settings.openai_api_key,
    )
    
    prompt = f"{context}\n\nGEO ADVANTAGE:\n{geo_advantage}\n\nSIMILAR HISTORY:\n{json.dumps(history)}\n\nGenerate the Gap Analysis JSON."
    
    for attempt in range(3):
        try:
            resp = await llm.ainvoke([
                SystemMessage(content=ANALYST_PROMPT),
                HumanMessage(content=prompt)
            ])
            raw = resp.content.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw).strip()
            return json.loads(raw)
        except Exception as e:
            if "API_KEY_INVALID" in str(e) or "400" in str(e) or "INVALID_ARGUMENT" in str(e):
                break
    return {} # Fallback handled by validator
