"""Embeddings generation for Scout data"""
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import get_settings
import json

settings = get_settings()

async def create_embedding(data: dict) -> list[float]:
    try:
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.openai_api_key
        )
        text_to_embed = json.dumps(data)
        vector = await embeddings.aembed_query(text_to_embed)
        return vector
    except Exception as e:
        print(f"Embedding error: {e}")
        return [0.0] * 768
