/**
 * api.ts — Centralized API client
 * All calls to http://localhost:8000 go through here.
 * JWT token is stored in authStore and injected as Bearer header.
 */

const BASE = "http://127.0.0.1:8000/api";

// ── Token accessor (set by authStore after login) ────────────────────────────
let _getToken: (() => string | null) = () => null;
export function setTokenAccessor(fn: () => string | null) {
    _getToken = fn;
}

// ── 401 handler (set by authStore to clear session & redirect) ────────────────
let _on401: (() => void) | null = null;
export function set401Handler(fn: () => void) {
    _on401 = fn;
}

function authHeaders(): HeadersInit {
    const token = _getToken();
    return token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers ?? {}) },
    });
    if (res.status === 401) {
        // Token is invalid or expired — clear auth state and redirect to login
        _on401?.();
        throw new Error("[401] Session expired. Please sign in again.");
    }
    if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        throw new Error(`[${res.status}] ${text}`);
    }
    return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export async function apiLogin(email: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export async function apiSignup(
    email: string,
    password: string,
    business_name: string
): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, business_name }),
    });
}

// ── Mission Setup ─────────────────────────────────────────────────────────────

export interface CompetitorTarget {
    name: string;
    url: string;
    social_handle?: string;
}

export interface MissionSetupPayload {
    business_name: string;
    niche: string;
    city: string;
    country: string;
    competitors: CompetitorTarget[];
    keywords: string[];
    shopify_product_ids: string[];
    instagram_post: boolean;
    enable_scout_hitl: boolean;
    // Advanced Scout context (all optional)
    business_category?: string;
    business_type?: string;
    address?: string;
    service_radius_km?: number;
    latitude?: number | null;
    longitude?: number | null;
    product_name?: string;
    price_range?: string;
    usp?: string;
    target_audience?: string;
    age_group?: string;
    income_level?: string;
    business_goal?: string;
    current_price?: string;
    website?: string;
    social_links?: string[];
    delivery_enabled?: boolean;
    delivery_radius_km?: number;
    delivery_platforms?: string[];
    monthly_budget?: number;
    business_stage?: string;
    brand_positioning?: string;
    avg_price?: string;
    discount_range?: string;
    spending_level?: string;
    business_challenges?: string[];
}

export interface MissionResponse {
    mission_id: string;
    mode: string;
    status: string;
    created_at: string;
    message: string;
}

export async function apiCreateMission(payload: MissionSetupPayload): Promise<MissionResponse> {
    return request<MissionResponse>("/setup", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function apiGetMissionState(missionId: string) {
    return request<PipelineState>(`/setup/${missionId}`);
}

// ── Dashboard Mission History ──────────────────────────────────────────────────

export interface MissionListItem {
    mission_id: string;
    created_at: string;
    business_name: string;
    niche: string;
    city: string;
    country: string;
    competitors: CompetitorTarget[];
    keywords: string[];
}

export interface MissionListResponse {
    missions: MissionListItem[];
    total: number;
}

export async function apiGetMissions(): Promise<MissionListResponse> {
    return request<MissionListResponse>("/dashboard/missions");
}

// ── Agent Graph (server-driven) ───────────────────────────────────────────────

export interface GraphNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        label: string;
        role: string;
        mode: string;
        status: string;
        result_summary: string | null;
        hitl_enabled: boolean;
        awaiting_hitl: boolean;
    };
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    animated: boolean;
    label: string;
    type: string;
    style: Record<string, string>;
}

export interface GraphResponse {
    mission_id: string;
    mode: string;
    pipeline_status: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export async function apiGetGraph(missionId: string): Promise<GraphResponse> {
    return request<GraphResponse>(`/graph/${missionId}`);
}

// ── Pipeline State ─────────────────────────────────────────────────────────────

export interface ScoutFinding {
    competitor_name: string;
    url: string;
    finding_type: string;
    title: string;
    detail: string;
    price_before: number | null;
    price_after: number | null;
    screenshot_url: string | null;
    scraped_at: string;
    included: boolean;
}

export interface ProductInfo {
    name: string;
    category: string;
    description: string;
    features: string[];
    target_audience: string;
    benefits: string[];
    brand_tone: string;
}

export interface GeoData {
    location: string;
    coordinates: string | null;
    traffic_level: string;
    nearby_landmarks: string[];
    distance_score: string;
}

export interface CompetitorInfo {
    name: string;
    url: string;
    products: string[];
    messaging: string;
    promotions: string[];
    included: boolean;
}

export interface PricingData {
    average_price: number;
    price_range: string;
    competitor_prices: Record<string, number>;
}

export interface MarketSentiment {
    positive_feedback: string[];
    customer_complaints: string[];
    trending_problems: string[];
    feature_requests: string[];
}

export interface ScoutResult {
    mission_id: string;
    product_info: ProductInfo;
    geo_data: GeoData;
    competitors: CompetitorInfo[];
    pricing: PricingData;
    market_sentiment: MarketSentiment;
    embedding_id: string | null;
    source_links: string[];
    findings: ScoutFinding[];
    raw_html_snippets: string[];
    completed_at: string;
}

export interface GapItem {
    category: string;
    competitor_value: string;
    your_value: string;
    opportunity: string;
    risk_level: "low" | "medium" | "high";
    risk_reason: string;
    severity_score: number;
    signal_strength: number;
    priority_rank: number;
    opportunity_type: string;
    confidence_reason: string;
    source_references: string[];
    cluster: string;
    trend_direction: string;
    competitor_similarity: number;
    geo_advantage: string;
    analysis_path: string[];
}

export interface AnalystResult {
    mission_id: string;
    executive_summary: string;
    gaps: GapItem[];
    recommended_price_delta_pct: number | null;
    confidence_score: number;
    reason_trace_id: string;
    completed_at: string;
}

export interface CampaignVariant {
    variant_name: string;
    platform: string;
    campaign_angle: string;
    offer: string;
    cta: string;
    expected_roi: string;
}

export interface GenUICard {
    marketing_strategy: string;
    instagram_poster_prompt: string;
    facebook_poster_prompt: string;
    suggested_offers: string[];
    campaign_goal: string;
    estimated_roi: string;
    execution_priority: number;
    risk_analysis: string;
    location_strategy: string;
    visual_style: string;
    target_persona: string;
    counter_strategy: string;
    offer_score: number;
    recommended_budget: Record<string, any>;
    cta_options: string[];
    posting_schedule: Record<string, string>;
    campaign_variants: CampaignVariant[];
}

export interface StrategistResult {
    mission_id: string;
    recommendation_type: string;
    gen_ui_card: GenUICard;
    rationale: string;
    completed_at: string;
}

export interface PipelineState {
    mission_id: string;
    tenant_id: string;
    mode: string;
    status: string;
    scout_result: ScoutResult | null;
    analyst_result: AnalystResult | null;
    strategist_result: StrategistResult | null;
    publish_log: string[];
    error: string | null;
    trace_url: string | null;
    updated_at: string;
}

// ── HITL Review ───────────────────────────────────────────────────────────────

export interface HITLReviewState {
    mission_id: string;
    mode: string;
    pipeline_status: string;
    hitl_gate_status: string | null;
    scout_result: ScoutResult | null;
    analyst_result: AnalystResult | null;
    strategist_result: StrategistResult | null;
    is_autonomous: boolean;
}

export async function apiGetReviewState(missionId: string): Promise<HITLReviewState> {
    return request<HITLReviewState>(`/review/${missionId}`);
}

export async function apiSubmitScoutReview(
    missionId: string,
    approved: boolean,
    editedFindings?: ScoutFinding[],
    reviewerNote?: string
) {
    return request(`/review/${missionId}/scout`, {
        method: "POST",
        body: JSON.stringify({
            mission_id: missionId,
            approved,
            edited_findings: editedFindings ?? null,
            reviewer_note: reviewerNote ?? null,
        }),
    });
}

// ── SSE Stream ────────────────────────────────────────────────────────────────

export interface StreamEvent {
    event: string;
    agent: string;
    data: string;
    mission_id: string;
    timestamp: string;
}

/**
 * Opens an EventSource for the mission SSE stream.
 * Automatically injects the JWT token as a URL query param
 * (EventSource doesn't support custom headers).
 */
export function openMissionStream(missionId: string): EventSource {
    const token = _getToken();
    const url = `${BASE}/stream/${missionId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    return new EventSource(url);
}
