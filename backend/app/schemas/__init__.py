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
from pydantic import BaseModel, Field, ConfigDict


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
    ECOMMERCE           = "ecommerce"
    LOCAL_SERVICES      = "local_services"
    FOOD_BEVERAGE       = "food_beverage"
    FASHION             = "fashion"
    ELECTRONICS         = "electronics"
    HEALTH_WELLNESS     = "health_wellness"
    EDUCATION           = "education"
    BEAUTY_PERSONAL_CARE = "beauty_personal_care"
    REAL_ESTATE         = "real_estate"
    FITNESS             = "fitness"


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
    password: str = Field(min_length=6)
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
    notes: Optional[str] = None            # optional competitor observation


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

    # ── Advanced Scout Context (all optional — enriches LLM prompts) ────────
    business_category: str = ""        # e.g. "Cafe", "Clothing Store"
    business_type: str = ""            # e.g. "Local Retail", "D2C", "Franchise"
    address: str = ""                  # street / neighbourhood
    service_radius_km: int = 5         # radius for TomTom geo search
    latitude: Optional[float] = None   # from browser GPS auto-detect
    longitude: Optional[float] = None  # from browser GPS auto-detect
    product_name: str = ""             # primary product/service name
    price_range: str = ""              # e.g. "₹120–₹180"
    usp: str = ""                      # unique selling point
    target_audience: str = ""          # e.g. "College students"
    age_group: str = ""                # e.g. "18–25"
    income_level: str = ""             # e.g. "Low-Mid"
    business_goal: str = ""            # e.g. "Increase local customer visits"
    current_price: str = ""            # existing product price
    website: str = ""                  # business website
    social_links: list[str] = []       # Instagram, Facebook, etc.
    delivery_enabled: bool = False
    delivery_radius_km: int = 0
    delivery_platforms: list[str] = []     # e.g. ["Swiggy", "Zomato"]
    monthly_budget: int = 0                # marketing budget in local currency
    # Stage & positioning
    business_stage: str = ""              # "New" | "Growing" | "Established" | "Declining"
    brand_positioning: str = ""           # "Budget" | "Premium" | "Eco-Friendly" etc.
    avg_price: str = ""                   # average selling price
    discount_range: str = ""              # e.g. "10%–20%"
    spending_level: str = ""              # "Low" | "Mid" | "High" audience spending
    business_challenges: list[str] = []   # free-text problems the user faces


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


class ProductInfo(BaseModel):
    name: str = ""
    category: str = ""
    description: str = ""
    features: list[str] = []
    target_audience: str = ""
    benefits: list[str] = []
    brand_tone: str = ""


class GeoData(BaseModel):
    location: str = ""
    coordinates: Optional[str] = None
    traffic_level: str = ""
    nearby_landmarks: list[str] = []
    distance_score: str = ""


class CompetitorInfo(BaseModel):
    name: str = ""
    url: str = ""
    products: list[str] = []
    messaging: str = ""
    promotions: list[str] = []
    included: bool = True


class PricingData(BaseModel):
    average_price: float = 0.0
    price_range: str = ""
    competitor_prices: dict[str, float] = {}


class MarketSentiment(BaseModel):
    positive_feedback: list[str] = []
    customer_complaints: list[str] = []
    trending_problems: list[str] = []
    feature_requests: list[str] = []


class ScoutResult(BaseModel):
    mission_id: str
    product_info: ProductInfo = Field(default_factory=ProductInfo)
    geo_data: GeoData = Field(default_factory=GeoData)
    competitors: list[CompetitorInfo] = []
    pricing: PricingData = Field(default_factory=PricingData)
    market_sentiment: MarketSentiment = Field(default_factory=MarketSentiment)
    embedding_id: Optional[str] = None
    source_links: list[str] = []
    findings: list[ScoutFinding] = []  # Kept for backward UI compatibility during transition
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
    risk_reason: str = ""
    severity_score: float = 0.0
    signal_strength: float = 0.0
    priority_rank: int = 1
    opportunity_type: str = ""
    confidence_reason: str = ""
    source_references: list[str] = Field(default_factory=list)
    cluster: str = ""
    trend_direction: str = ""
    competitor_similarity: float = 0.0
    geo_advantage: str = ""
    analysis_path: list[str] = Field(default_factory=list)


class AnalystResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mission_id: str
    summary: str = Field(alias="executive_summary")
    gaps: list[GapItem]
    recommended_price_delta_pct: Optional[float] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    reason_trace_id: str = ""
    completed_at: datetime = Field(default_factory=datetime.utcnow)


# ── Strategist Agent ──────────────────────────────────────────────────────────

class CampaignVariant(BaseModel):
    variant_name: str
    platform: str
    campaign_angle: str
    offer: str
    cta: str
    expected_roi: str


class GenUICard(BaseModel):
    """Structured JSON rendered as Strategy Output card preview."""
    marketing_strategy: str
    instagram_poster_prompt: str
    facebook_poster_prompt: str
    suggested_offers: list[str]
    campaign_goal: str = ""
    estimated_roi: str = ""
    execution_priority: int = 1
    risk_analysis: str = ""
    location_strategy: str = ""
    visual_style: str = ""
    target_persona: str = ""
    counter_strategy: str = ""
    offer_score: float = 0.0
    recommended_budget: dict = Field(default_factory=dict)
    cta_options: list[str] = Field(default_factory=list)
    posting_schedule: dict = Field(default_factory=dict)
    campaign_variants: list[CampaignVariant] = Field(default_factory=list)


class StrategistResult(BaseModel):
    mission_id: str
    recommendation_type: str   # "instagram_post" | "price_adjustment" | "both"
    gen_ui_card: GenUICard
    rationale: str
    reason_trace_id: str = ""
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
