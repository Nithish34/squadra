"""
app/core/config.py — Application settings loaded from .env
"""
from __future__ import annotations
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Try both: running from backend/ dir AND from project root
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str = ""
    openai_model: str = "gemini-1.5-pro"
    redis_url: str = "redis://localhost:6379"
    default_city: str = "Coimbatore"

    tomtom_api_key: str = ""
    serper_api_key: str = ""

    meta_access_token: str = ""
    instagram_business_account_id: str = ""

    # JWT
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours


@lru_cache
def get_settings() -> Settings:
    return Settings()
