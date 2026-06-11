# TravelOS AI Module

**Scope:** Platform agents (Phase 5) + Sales Assistant (9C) + Operations Assistant (9D)  
**Migrations:** `015`, `023`, `056`–`064`  
**Last updated:** 2026-06-04

---

## Architecture principle

TravelOS AI uses a **hybrid L1–L4 model**:

| Layer | Responsibility |
|-------|----------------|
| L1 — Deterministic engine | Scores, rules, recommendations (no LLM) |
| L2 — Materialized store | Snapshots, recommendations, insight cache tables |
| L3 — LLM | Explanation and chat only; **no CRM writes** |
| L4 — Async worker | `dispatch.ai_score`, `dispatch.ai_ops_score` jobs |

The LLM never autonomously confirms bookings, creates payments, or mutates operational records.

---

## AI Sales Assistant (Sprint 9C)

### Purpose

Prioritize leads and opportunities, surface follow-up recommendations, and explain precomputed sales metrics to agents and managers.

### Components

| Component | Location |
|-----------|----------|
| Score service | `src/lib/sales-ai/sales-score-service.ts` |
| Recommendations | `src/lib/sales-ai/recommendation-evaluator.ts` |
| Worker dispatcher | `SalesScoreDispatcher` |
| Chat API | `POST /api/ai/sales-agent` |
| Insights | `GET /api/crm/sales/insights` (RPC `get_sales_insights`) |

### Supported use cases

| Use case | Mechanism |
|----------|-----------|
| Lead health / win probability | `ai_sales_snapshots` per entity |
| Follow-up recommendations | Rules: quotation viewed, payment pending, expiring quote, hot lead untouched, etc. |
| Sales manager insights | Funnel, acceptance rate, rep leaderboard — **deterministic RPC only** |
| Agent chat | Grounded on snapshot + recommendations + timeline; citations returned |
| Dismiss/complete recommendation | `PATCH /api/crm/sales/recommendations/:id` |

### APIs (sales)

| Method | Path |
|--------|------|
| POST | `/api/ai/sales-agent` |
| GET | `/api/crm/sales/snapshots` |
| GET | `/api/crm/sales/recommendations` |
| PATCH | `/api/crm/sales/recommendations/:id` |
| GET | `/api/crm/sales/insights` |
| GET | `/api/crm/sales/widgets` |

### Permissions

| Permission | super_admin / tenant_admin | sales_agent | finance_officer |
|------------|:--------------------------:|:-----------:|:---------------:|
| `ai.sales.use` | ✓ | ✓ | — |
| `ai.sales.read` | ✓ | ✓ | — |
| `ai.sales.insights.read` | ✓ | — | — |
| `ai.sales.manage` | ✓ | — | — |

### Limitations

- No automatic CRM state changes from AI.
- Scores refresh on domain events via worker (minutes latency).
- Monthly token budget per tenant (`ai_agents.config`).
- Insights dashboard not available to sales_agent role.

---

## AI Operations Assistant (Sprint 9D)

### Purpose

Monitor booking operational readiness (travelers, passports, documents, payments) and flag departure risk before travel dates.

### Components

| Component | Location |
|-----------|----------|
| Score service | `src/lib/operations-ai/operations-score-service.ts` |
| Recommendations | `OperationsRecommendationEvaluator` |
| Worker | `dispatch.ai_ops_score` |
| Chat API | `POST /api/ai/operations-agent` |
| Insights | `GET /api/crm/operations/insights` |

### Scoring model

| Output | Range / values |
|--------|----------------|
| Health score | 0–100 |
| Risk score | 0–100 |
| Readiness | Checklist completion % |
| Status band | healthy, attention_required, at_risk, critical |

**Inputs:** payment status, travelers, passport expiry, `booking_documents.document_type`, travel date proximity.

### Supported use cases

| Use case | Mechanism |
|----------|-----------|
| Booking health badge | CRM booking show + mobile list |
| At-risk departures widget | CRM dashboard (7-day window) |
| Operations recommendations | Missing documents, unpaid balance near departure, etc. |
| Operations chat | Explains precomputed ops snapshot only |
| Customer 360 ops strip | Summary on customer overview |
| Mobile | `useOperationsAi` on booking list/dashboard |

### Event triggers

`dispatch.ai_ops_score` on: `booking.created`, `booking.updated`, `booking.cancelled`, `payment.created`, `payment.authorized`, `payment.completed`, `payment.failed`.

### APIs (operations)

| Method | Path |
|--------|------|
| POST | `/api/ai/operations-agent` |
| GET | `/api/crm/operations/snapshots` |
| GET | `/api/crm/operations/recommendations` |
| PATCH | `/api/crm/operations/recommendations/:id` |
| GET | `/api/crm/operations/widgets` |
| GET | `/api/crm/operations/metrics` |
| GET | `/api/crm/operations/insights` |
| GET | `/api/crm/operations/customer-strip` |

### Permissions

| Permission | super_admin / tenant_admin | sales_agent | finance_officer |
|------------|:--------------------------:|:-----------:|:---------------:|
| `ai.operations.use` | ✓ | ✓ | — |
| `ai.operations.read` | ✓ | ✓ | — |
| `ai.operations.insights.read` | ✓ | — | — |
| `ai.operations.manage` | ✓ | — | — |

### Limitations

- Entities scored: active bookings in departure window only (not leads).
- No autonomous document upload or booking confirmation.
- Separate from `/crm/operations` communications dashboard (queue metrics).
- finance_officer has no ops AI permissions.

---

## Legacy platform agents (Phase 5)

| Agent | API | Permission | Capability |
|-------|-----|------------|------------|
| Knowledge | `POST /api/ai/knowledge-agent` | `ai.knowledge.use` | RAG Q&A with citations |
| Booking | `POST /api/ai/booking-agent` | `ai.booking.use` | Draft bookings via tools; staff confirms |
| Support | `POST /api/ai/support-agent` | `ai.support.use` | FAQ + support tickets |

Additional:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ai/analytics` | Usage KPIs (`ai.analytics.read`) |
| GET | `/api/ai/analytics/export` | Export |
| POST | `/api/ai/feedback` | Thumbs up/down |
| GET/POST | `/api/knowledge/documents` | Knowledge admin (`knowledge.manage`) |

**Booking agent restriction:** Not granted to `finance_officer`. Agents lack `bookings.confirm` and `payments.create`.

---

## UI routes

| Route | Module |
|-------|--------|
| `/ai/knowledge` | Knowledge chat |
| `/ai/booking` | Booking assistant |
| `/ai/support` | Support console |
| `/ai/sales` | Sales assistant |
| `/ai/history` | Conversation history (`ai.read`) |
| `/crm/sales-insights` | Sales insights dashboard |
| `/crm/operations-insights` | Operations insights dashboard |

---

## Data tables (AI)

| Table | Module |
|-------|--------|
| `ai_sales_snapshots`, `ai_sales_recommendations` | Sales |
| `ai_ops_snapshots`, `ai_ops_recommendations` | Operations |
| `ai_agents` | Per-tenant enablement + token budget |
| `ai_conversations`, `ai_messages` (Phase 5) | Chat history |

RLS: authenticated read where permitted; writes via service role / worker only.

---

## Limitations (global)

| Limitation | Detail |
|------------|--------|
| No autonomous transactions | All writes remain human or explicit API workflows |
| Async scoring delay | Depends on cron worker SLA (minutes) |
| LLM cost | `ANTHROPIC_API_KEY` required; budgets enforced |
| No customer-facing AI chat | Portal has no AI endpoints |
| No WhatsApp AI | Templates only |
| No predictive ML | Rule-based engines only in pilot |
| Multi-agent orchestration | Post-MVP (FR-AI-008) |

---

## Validation gates

| Gate | Command |
|------|---------|
| Sales AI | `npm run gate:sprint9c:sales-ai` |
| Operations AI | `npm run gate:sprint9d:operations-ai` |
| Worker | `npm run gate:sprint8d:worker` |

---

## Related documents

- [09-operations-module.md](./09-operations-module.md)
- [08-mobile-module.md](./08-mobile-module.md)
- [docs/04-Modules/AI-Agents.md](../04-Modules/AI-Agents.md)
