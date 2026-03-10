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

export interface ScoutResult {
    mission_id: string;
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
}

export interface AnalystResult {
    mission_id: string;
    summary: string;
    gaps: GapItem[];
    recommended_price_delta_pct: number | null;
    confidence_score: number;
    completed_at: string;
}

export interface GenUICard {
    headline: string;
    body_copy: string;
    cta: string;
    hashtags: string[];
    suggested_image_prompt: string;
    price_adjustment: Record<string, unknown> | null;
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
