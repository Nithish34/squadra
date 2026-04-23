"""
app/database/postgres.py — PostgreSQL connection and setup for Scout pgvector.
"""
import structlog
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.core.config import get_settings

log = structlog.get_logger()
settings = get_settings()

try:
    engine = create_async_engine(settings.postgres_url, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
except Exception as e:
    log.warning(f"Could not initialize PostgreSQL engine: {e}")
    engine = None
    AsyncSessionLocal = None

async def init_db():
    """Initialise the pgvector extension and scout_data table."""
    if engine is None:
        log.warning("PostgreSQL engine not available. Skipping DB init.")
        return

    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS scout_data (
                    id SERIAL PRIMARY KEY,
                    product_name TEXT,
                    location TEXT,
                    source TEXT,
                    content TEXT,
                    embedding VECTOR(768),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            log.info("PostgreSQL scout_data table verified.")
    except Exception as e:
        log.error(f"Failed to initialize PostgreSQL table: {e}")

async def store_scout_data(product_name: str, location: str, source: str, content: str, embedding: list[float]) -> int:
    """Store raw scout intelligence and its embedding into Postgres."""
    if AsyncSessionLocal is None:
        log.warning("PostgreSQL not configured. Skipping store_scout_data.")
        return -1

    try:
        async with AsyncSessionLocal() as session:
            # Format the embedding array for pgvector
            embedding_str = f"[{','.join(map(str, embedding))}]"
            result = await session.execute(
                text("""
                    INSERT INTO scout_data (product_name, location, source, content, embedding)
                    VALUES (:p_name, :loc, :src, :content, :emb::vector)
                    RETURNING id;
                """),
                {
                    "p_name": product_name,
                    "loc": location,
                    "src": source,
                    "content": content,
                    "emb": embedding_str
                }
            )
            await session.commit()
            row = result.fetchone()
            return row[0] if row else -1
    except Exception as e:
        log.error(f"Failed to insert scout_data: {e}")
        return -1
