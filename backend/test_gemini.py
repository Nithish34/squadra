import asyncio
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

async def test_gemini():
    api_key = "AIzaSyBFrjwRBBkEUv96Ztp7-RVS6Mf7IMNlY8E"
    
    print("Testing gemini-2.5-flash...")
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash", temperature=0,
            google_api_key=api_key, streaming=False,
        )
        response = await llm.ainvoke([HumanMessage(content="Reply with 'GEMINI_OK'")])
        print(f"gemini-2.5-flash response: {response.content}")
        return "2.5-flash"
    except Exception as e:
        print(f"gemini-2.5-flash failed with: {e}")
        return "none"

if __name__ == "__main__":
    result = asyncio.run(test_gemini())
    print(f"Result: {result}")
