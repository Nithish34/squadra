# 🏴 Market Intelligence War Room — Backend v2

> FastAPI + LangGraph multi-agent backend.
> **Scout → Analyst → Strategist** with two pipeline modes.

---

## 🔑 Core Design: Two Pipeline Modes

```
AUTONOMOUS mode (default)
─────────────────────────
  POST /api/setup { enable_scout_hitl: false }
  
  Scout ──────────────► Analyst ──────────────► Strategist
  (scrape)              (gap analysis)           (GenUI card)
                                                      │
                                          auto-publish to Shopify + Instagram
                                                      │
                                               stream ends ✅

  No human intervention at any point.
  Frontend only watches the SSE stream for live thoughts.


SCOUT_HITL mode (optional button in Mission Setup)
──────────────────────────────────────────────────
  POST /api/setup { enable_scout_hitl: true }

  Scout ─── PAUSE ──► Human reviews/edits findings ──► Analyst ──► Strategist
  (scrape)   🛡️        at /review                       (auto)       (auto)
             │                                                          │
             │  frontend listens for 'scout_hitl_gate' SSE event    auto-publish ✅
             │  then routes to /review page
             │
             POST /api/review/{id}/scout  { approved: true, edited_findings: [...] }
             │
             Scout unblocks → Analyst + Strategist run automatically

  Human only touches: Scout findings.
  Analyst and Strategist always run without intervention.
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               FRONTEND (Next.js 16)                  │
│                                                      │
│  Mission Setup ──── [🔘 Enable Scout HITL] button    │
│  War Room      ←── SSE stream all agent thoughts     │
│  Agent Graph   ←── graph_update events (React Flow)  │
│  HITL Review   ←── only in SCOUT_HITL mode           │
│  Observability ←── trace_emit events                 │
└────────────────────┬─────────────────────────────────┘
                     │ /api/*
                     ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI (main.py)                    │
│                                                        │
│  /api/setup       /api/stream   /api/review            │
│  /api/graph       /api/relay    /api/observe           │
│  /api/geo         /api/shopify  /api/instagram         │
└──────────────────────┬─────────────────────────────────┘
                       │ asyncio background task
                       ▼
┌────────────────────────────────────────────────────────┐
│          LangGraph Pipeline (agents/pipeline.py)        │
│                                                        │
│  ┌──────────┐     ┌──────────┐     ┌───────────────┐  │
│  │  Scout   │────▶│ Analyst  │────▶│  Strategist   │  │
│  │ Jina Vision│   │ Trend/Gap│     │(GenUI+publish)│  │
│  └────┬─────┘     └──────────┘     └───────────────┘  │
│       │                                                │
│  SCOUT_HITL mode: pause here, emit scout_hitl_gate     │
│  AUTONOMOUS mode: pass through immediately             │
└──────────────────────┬─────────────────────────────────┘
          ┌────────────┴───────────┐
          ▼                        ▼
       Redis                  LangSmith
  (state + SSE queue          (traces)
   + scout_hitl gate
   + history:tenant trends)
```

---

## ⚡ Recent Upgrades
The `v2` backend now includes several production-grade improvements:
1. **Robust Multimodal Scraping:** Uses the **Jina Reader API** (`https://r.jina.ai`) to bypass anti-bot protections, render JavaScript, and take full-page visual screenshots that are passed directly to GPT-4o Vision.
2. **Historical Memory & Trend Tracking:** Scout findings are now appended to a Redis `history:{tenant_id}:{niche}` layer, allowing the Analyst to reference past price drops instead of acting statelessly.
3. **LangGraph Self-Correction Validation:** LLM outputs are trapped natively inside the LangGraph node and retried up to 3 times if non-compliant JSON schemas are detected.
4. **Multitenancy & Notifications:** Workspaces are cleanly isolated via a centralized `tenant_id`, preventing data bleed. The Strategist natively attempts to push Mock WhatsApp Notifications on successful GenUI Strategy deployment.

---

## API Reference

| Method | Route | Description | Mode |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Create account | — |
| POST | `/api/auth/login` | Get JWT | — |
| POST | `/api/setup` | Launch pipeline (202) | Both |
| GET  | `/api/setup/{id}` | Poll pipeline state | Both |
| **GET**  | **`/api/stream/{id}`** | **SSE live feed** | Both |
| GET  | `/api/graph/{id}` | React Flow nodes+edges | Both |
| GET  | `/api/review/{id}` | Poll Scout HITL state | SCOUT_HITL only |
| POST | `/api/review/{id}/scout` | Submit Scout review | SCOUT_HITL only |
| GET  | `/api/review/{id}/status` | Lightweight gate status | SCOUT_HITL only |
| POST | `/api/shopify/price-update` | Manual price update | Both |
| POST | `/api/instagram/post` | Manual Instagram post | Both |
| GET  | `/api/observe/{id}` | Trace overview | Both |
| GET  | `/api/observe/{id}/agents` | Per-agent token/latency | Both |
| GET  | `/api/observe/{id}/live` | SSE trace updates | Both |
| GET  | `/api/relay/{id}` | Relay Bus SSE | Both |
| GET  | `/api/relay/{id}/history` | Handoff history | Both |
| GET  | `/api/geo/check` | Edge Middleware geo-fence | Both |
| GET  | `/api/dashboard/missions` | Mission list | Both |
| GET  | `/api/health` | Health check | Both |

---

## SSE Event Types

```typescript
type EventType =
  | 'thought'          // agent log line → Scout/Analyst/Strategist panels
  | 'status'           // pipeline status changed
  | 'handoff'          // agent→agent message → Relay Bus animation
  | 'graph_update'     // node state change → React Flow node colour
  | 'scout_hitl_gate'  // Scout paused → redirect to /review  [SCOUT_HITL only]
  | 'publish_started'  // auto-publish began
  | 'publish_complete' // auto-publish finished
  | 'complete'         // stream closed normally
  | 'error'            // pipeline failed
```

Frontend subscription pattern:
```typescript
const es = new EventSource(`/api/stream/${missionId}`, { withCredentials: true })

// Route events to the right sub-panel
es.addEventListener('thought', e => {
  const ev = JSON.parse(e.data)
  panels[ev.agent].append(ev.data)   // scout | analyst | strategist
})

// Animate Relay Bus on handoff
es.addEventListener('handoff', e => relayBus.animate(JSON.parse(e.data)))

// Update React Flow node colours
es.addEventListener('graph_update', e => graphStore.update(JSON.parse(e.data)))

// SCOUT_HITL only — navigate to review page
es.addEventListener('scout_hitl_gate', () => router.push('/review'))

es.addEventListener('complete', () => es.close())
es.addEventListener('error',    () => es.close())
```

---

## SCOUT_HITL Flow Detail

```
1. User checks "Enable Scout Review" toggle in Mission Setup
2. POST /api/setup  { enable_scout_hitl: true, ... }
3. Scout scrapes competitors, emits thoughts to War Room panels
4. Scout completes scraping → emits scout_hitl_gate SSE event
5. Frontend receives event → routes to /review
6. GET /api/review/{id} → returns { pipeline_status: "WAITING_FOR_SCOUT_REVIEW",
                                     scout_result: { findings: [...] } }
7. User reviews findings — can edit titles, exclude items, add notes
8. POST /api/review/{id}/scout  { approved: true, edited_findings: [...] }
9. Redis gate resolves → Scout node unblocks
10. Analyst starts automatically (no user action needed)
11. Strategist generates GenUI card automatically
12. Results auto-publish to Shopify + Instagram
13. SSE emits publish_complete → frontend shows final card
```

---

## Quick Start

```bash
cp .env.example .env
# Set OPENAI_API_KEY at minimum
docker-compose up --build
# API:   http://localhost:8000
# Docs:  http://localhost:8000/api/docs
```

---

## Project Structure

```
app/
├── main.py
├── agents/
│   ├── scout.py          # AUTONOMOUS: pass-through | SCOUT_HITL: pause+gate
│   ├── analyst.py        # always autonomous
│   ├── strategist.py     # always autonomous, auto-publishes
│   └── pipeline.py       # LangGraph compile + launch_pipeline()
├── api/routes/
│   ├── auth.py           # JWT auth
│   ├── setup.py          # POST /api/setup — enable_scout_hitl toggle
│   ├── stream.py         # SSE stream (all modes)
│   ├── hitl.py           # Scout review (SCOUT_HITL mode only)
│   ├── graph.py          # React Flow graph API
│   ├── relay.py          # Relay Bus SSE + history
│   ├── observability.py  # LangSmith traces + token usage
│   ├── geo.py            # Edge Middleware geo-fence
│   ├── dashboard.py      # Mission list + stats
│   ├── shopify.py        # Price update + webhook
│   └── instagram.py      # Meta Graph API publish
├── core/
│   ├── config.py         # Settings
│   ├── security.py       # JWT + bcrypt
│   └── state_store.py    # Redis: pipeline state, SSE queue, scout_hitl gate
└── schemas/
    └── __init__.py       # All Pydantic models
```
