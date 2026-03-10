"""
app/api/routes/auth.py — JWT authentication endpoints.
In-memory user store (swap for DB in production).
"""
from __future__ import annotations

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

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)

# ── Simple in-memory user store (replace with DB in production) ───────────────
# Mock users for testing purposes
_users: dict[str, dict] = {
    "test@abc.com": {
        "password_hash": hash_password("password123"),
        "business_name": "Test Company",
    },
    "demo@abc.com": {
        "password_hash": hash_password("demo123"),
        "business_name": "Demo Startup",
    },
    "admin@abc.com": {
        "password_hash": hash_password("admin123"),
        "business_name": "Admin Enterprise",
    }
}  # email → {password_hash, business_name}


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


# ── Dependency injected by all protected routes ───────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Extracts and validates the JWT from the Authorization: Bearer header.
    Also accepts token as a query param (for EventSource which can't set headers).
    """
    from fastapi import Request
    # This path is primarily used via Depends; query-param token is handled in stream.py
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        payload = decode_token(credentials.credentials)
        return {"email": payload["sub"], "business_name": payload.get("business_name", "")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
