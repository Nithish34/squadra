"""
app/api/routes/auth.py — JWT authentication endpoints.
In-memory user store (swap for DB in production).

Dev seeding: on startup the server pre-creates a user from .env so that
server restarts don't wipe auth state. Set DEV_SEED_EMAIL + DEV_SEED_PASSWORD.
"""
from __future__ import annotations

import structlog
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.core.security import (
    create_access_token, decode_token,
    hash_password, verify_password,
)
from app.schemas import TokenResponse, UserCreate, UserLogin

log = structlog.get_logger()
settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)

# ── User store ────────────────────────────────────────────────────────────────
_users: dict[str, dict] = {}  # email → {password_hash, business_name}


def seed_dev_user() -> None:
    """
    Called on application startup.
    Pre-populates _users with the dev seed account from .env so that
    server restarts never wipe auth state in development.
    """
    email = settings.dev_seed_email
    password = settings.dev_seed_password
    business = settings.dev_seed_business

    if not email or not password:
        log.warning("dev_seed_skipped", reason="DEV_SEED_EMAIL or DEV_SEED_PASSWORD not set in .env")
        return

    try:
        _users[email] = {
            "password_hash": hash_password(password),
            "business_name": business,
        }
        log.info("dev_seed_user_created", email=email, business=business)
    except Exception as exc:
        log.error("dev_seed_failed", error=str(exc))


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
async def register(payload: UserCreate):
    if payload.email in _users:
        raise HTTPException(status_code=409, detail="Email already registered.")
    _users[payload.email] = {
        "password_hash": hash_password(payload.password),
        "business_name": payload.business_name,
    }
    token = create_access_token(
        {"sub": payload.email, "business_name": payload.business_name},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    email = payload.email.strip().lower()
    seed_email = (settings.dev_seed_email or "").strip().lower()

    # ── Dev fast-path: seed credentials bypass bcrypt for reliability ──────────
    if seed_email and email == seed_email and payload.password == settings.dev_seed_password:
        # Ensure the user is in the store (in case seed_dev_user ran before .env was loaded)
        if email not in _users:
            _users[email] = {
                "password_hash": hash_password(payload.password),
                "business_name": settings.dev_seed_business,
            }
        user = _users[email]
        token = create_access_token(
            {"sub": payload.email, "business_name": user["business_name"]},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        log.info("dev_seed_login", email=payload.email)
        return TokenResponse(
            access_token=token,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    # ── Normal login ───────────────────────────────────────────────────────────
    user = _users.get(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    token = create_access_token(
        {"sub": payload.email, "business_name": user["business_name"]},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


# ── Auth dependency ───────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Extracts and validates the JWT from the Authorization: Bearer header.
    Also accepts token as a query param (for EventSource which can't set headers).
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        payload = decode_token(credentials.credentials)
        return {"email": payload["sub"], "business_name": payload.get("business_name", "")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Lightweight endpoint for the frontend to verify the stored token is still valid."""
    return {"email": user["email"], "business_name": user["business_name"], "valid": True}
