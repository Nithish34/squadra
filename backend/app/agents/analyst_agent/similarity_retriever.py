"""Similarity Retrieval Engine"""
import json
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import get_settings
from app.database.postgres import engine
from sqlalchemy import text

settings = get_settings()

async def retrieve_similar_records(scout_result) -> list[dict]:
    """Retrieve similar historical analyses from PostgreSQL pgvector."""
    if engine is None:
        return []
    try:
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.openai_api_key
        )
        query = json.dumps({
            "niche": scout_result.product_info.category if scout_result.product_info else "unknown",
            "competitors": [c.name for c in scout_result.competitors]
        })
        vector = await embeddings.aembed_query(query)
        vector_str = f"[{','.join(map(str, vector))}]"
        
        async with engine.begin() as conn:
            # Reusing scout_data table to find similar past markets based on embedding L2 distance
            result = await conn.execute(
                text("""
                    SELECT content 
                    FROM scout_data 
                    ORDER BY embedding <-> :emb::vector 
                    LIMIT 3;
                """),
                {"emb": vector_str}
            )
            rows = result.fetchall()
            return [{"content": row[0]} for row in rows]
    except Exception as e:
        print(f"Similarity Retrieval Error: {e}")
        return []
