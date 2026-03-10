"""
schemas/__init__.py
All Pydantic v2 request/response models.

KEY DESIGN: The pipeline has TWO modes:
  - AUTONOMOUS  : Scout → Analyst → Strategist runs fully without any pause.
                  Strategist output auto-publishes to Shopify + Instagram.
  - SCOUT_HITL  : Scout runs → PAUSES at WAITING_FOR_SCOUT_REVIEW →
                  Human reviews/edits findings → Analyst + Strategist auto-run → auto-publish.

The HITL Review page (/review) is ONLY activated in SCOUT_HITL mode.
It shows Scout findings for human editing, NOT the Strategist card.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class PipelineMode(str, Enum):
    AUTONOMOUS  = "autonomous"   # default: fully hands-off
    SCOUT_HITL  = "scout_hitl"   # human reviews Scout findings only


class PipelineStatus(str, Enum):
    IDLE                      = "IDLE"
    SCOUT_RUNNING             = "SCOUT_RUNNING"
    # ↓ Only reached in SCOUT_HITL mode
    WAITING_FOR_SCOUT_REVIEW  = "WAITING_FOR_SCOUT_REVIEW"
    SCOUT_REVIEW_APPROVED     = "SCOUT_REVIEW_APPROVED"
    SCOUT_REVIEW_REJECTED     = "SCOUT_REVIEW_REJECTED"
    # ↓ Always reached (autonomous or after scout review)
    ANALYST_RUNNING           = "ANALYST_RUNNING"
    STRATEGIST_RUNNING        = "STRATEGIST_RUNNING"
    PUBLISHING                = "PUBLISHING"   # auto-publish in progress
    COMPLETE                  = "COMPLETE"
    FAILED                    = "FAILED"


class AgentRole(str, Enum):
    SCOUT      = "scout"
    ANALYST    = "analyst"
    STRATEGIST = "strategist"
    SYSTEM     = "system"


class Niche(str, Enum):
    ECOMMERCE      = "ecommerce"
    LOCAL_SERVICES = "local_services"
    FOOD_BEVERAGE  = "food_beverage"
    FASHION        = "fashion"
    ELECTRONICS    = "electronics"


# ── SSE Event Types ────────────────────────────────────────────────────────────

class StreamEventType(str, Enum):
    THOUGHT             = "thought"         # token-by-token agent thought
    STATUS              = "status"          # pipeline status change
    HANDOFF             = "handoff"         # agent→agent relay bus event
    GRAPH_UPDATE        = "graph_update"    # React Flow node state change
    SCOUT_HITL_GATE     = "scout_hitl_gate" # Scout paused — show HITL Review page
    TRACE_EMIT          = "trace_emit"      # emitted after HITL decision → Observability
    PUBLISH_STARTED     = "publish_started" # auto-publish triggered
    PUBLISH_COMPLETE    = "publish_complete"# auto-publish done
    COMPLETE            = "complete"        # stream end
    ERROR               = "error"


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    business_name: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ── Mission / Setup ───────────────────────────────────────────────────────────

class CompetitorTarget(BaseModel):
    name: str
    url: str
    social_handle: Optional[str] = None


class MissionSetup(BaseModel):
    """POST /api/setup — configures one pipeline run."""
    mission_id: Optional[str] = None
    business_name: str
    niche: Niche
    city: str = "Coimbatore"
    country: str = "IN"
    competitors: list[CompetitorTarget] = Field(min_length=1, max_length=10)
    keywords: list[str] = Field(default=[], max_length=20)
    shopify_product_ids: list[str] = []
    instagram_post: bool = True
    # Multi-tenant / workspace ID to sandbox requests and rate limit
    tenant_id: str = "default_workspace"

    # ── The key toggle ──────────────────────────────────────────────────────
    # Default False = fully autonomous. Set True to pause after Scout.
    enable_scout_hitl: bool = False


class MissionResponse(BaseModel):
    mission_id: str
    mode: PipelineMode
    status: PipelineStatus
    created_at: datetime
    message: str


# ── Scout Agent ───────────────────────────────────────────────────────────────

class ScoutFinding(BaseModel):
    competitor_name: str
    url: str
    finding_type: str   # "price_change" | "new_product" | "promotion"
    title: str
    detail: str
    price_before: Optional[float] = None
    price_after: Optional[float] = None
    screenshot_url: Optional[str] = None  # Added for Vision analysis
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    # Human can flip this to False during HITL review to exclude a finding
    included: bool = True


class ScoutResult(BaseModel):
    mission_id: str
    findings: list[ScoutFinding]
    raw_html_snippets: list[str] = []
    completed_at: datetime = Field(default_factory=datetime.utcnow)


# ── Scout HITL Review ─────────────────────────────────────────────────────────
# Used ONLY in SCOUT_HITL mode. Human can edit/exclude individual findings.

class ScoutHITLReviewPayload(BaseModel):
    """POST /api/review/{mission_id}/scout — human submits reviewed Scout findings."""
    mission_id: str
    approved: bool
    edited_findings: Optional[list[ScoutFinding]] = None  # if None, original findings used
    reviewer_note: Optional[str] = None


class ScoutHITLResponse(BaseModel):
    mission_id: str
    status: PipelineStatus
    message: str
    findings_kept: int = 0


# ── Analyst Agent ─────────────────────────────────────────────────────────────

class GapItem(BaseModel):
    category: str
    competitor_value: str
    your_value: str
    opportunity: str
    risk_level: str   # "low" | "medium" | "high"


class AnalystResult(BaseModel):
    mission_id: str
    summary: str
    gaps: list[GapItem]
    recommended_price_delta_pct: Optional[float] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    completed_at: datetime = Field(default_factory=datetime.utcnow)


# ── Strategist Agent ──────────────────────────────────────────────────────────

class GenUICard(BaseModel):
    """Structured JSON rendered as Instagram card preview (stratpanel + genui panel)."""
    headline: str
    body_copy: str
    cta: str
    hashtags: list[str]
    suggested_image_prompt: str
    price_adjustment: Optional[dict[str, Any]] = None


class StrategistResult(BaseModel):
    mission_id: str
    recommendation_type: str   # "instagram_post" | "price_adjustment" | "both"
    gen_ui_card: GenUICard
    rationale: str
    completed_at: datetime = Field(default_factory=datetime.utcnow)


# ── Pipeline State ────────────────────────────────────────────────────────────

class PipelineState(BaseModel):
    """Full state stored in Redis & returned to polling frontend."""
    mission_id: str
    tenant_id: str = "default_workspace"
    mode: PipelineMode = PipelineMode.AUTONOMOUS
    status: PipelineStatus = PipelineStatus.IDLE
    scout_result:      Optional[ScoutResult]      = None
    analyst_result:    Optional[AnalystResult]    = None
    strategist_result: Optional[StrategistResult] = None
    publish_log:       list[str]                  = []   # auto-publish steps
    error:             Optional[str]              = None
    trace_url:         Optional[str]              = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ── SSE Payload helpers ───────────────────────────────────────────────────────

class HandoffPayload(BaseModel):
    from_agent: AgentRole
    to_agent:   AgentRole
    summary:    str
    item_count: int = 0


class GraphUpdatePayload(BaseModel):
    node_id:        str   # "scout" | "analyst" | "strategist"
    status:         str   # "idle" | "running" | "done" | "error" | "hitl_paused"
    result_summary: Optional[str] = None
    awaiting_hitl:  bool = False


class StreamEvent(BaseModel):
    event:      StreamEventType
    agent:      AgentRole
    data:       str
    mission_id: str
    timestamp:  datetime = Field(default_factory=datetime.utcnow)


# ── Publish log ───────────────────────────────────────────────────────────────

class PublishResult(BaseModel):
    """Returned after auto-publish in COMPLETE state."""
    mission_id: str
    shopify_updated: bool = False
    instagram_posted: bool = False
    instagram_post_id: Optional[str] = None
    errors: list[str] = []


# ── Shopify ───────────────────────────────────────────────────────────────────

class ShopifyPriceUpdate(BaseModel):
    product_id: str
    variant_id: str
    new_price: str
    compare_at_price: Optional[str] = None


# ── Instagram ─────────────────────────────────────────────────────────────────

class InstagramPostRequest(BaseModel):
    mission_id: str
    caption: str
    image_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class InstagramPostResponse(BaseModel):
    post_id: str
    permalink: Optional[str] = None
    status: str


# ── Observability ─────────────────────────────────────────────────────────────

class AgentTraceDetail(BaseModel):
    agent:              AgentRole
    run_id:             Optional[str] = None
    status:             str
    tokens_prompt:      int = 0
    tokens_completion:  int = 0
    tokens_total:       int = 0
    latency_ms:         int = 0
    cost_usd:           float = 0.0
    completed_at:       Optional[datetime] = None


# ── Dashboard ─────────────────────────────────────────────────────────────────

class MissionSummary(BaseModel):
    mission_id:    str
    business_name: str
    niche:         str
    city:          str
    mode:          PipelineMode
    status:        PipelineStatus
    finding_count: int = 0
    created_at:    datetime
    updated_at:    datetime
