# Sprint 9D — AI Operations Assistant Implementation Report

**Status:** Implemented (9D-A through 9D-E)  
**Date:** June 2026  
**Architecture:** Hybrid L1–L4 (parallel to Sprint 9C Sales AI; does not extend sales module)

## Summary

Sprint 9D delivers a deterministic **AI Operations Assistant** for booking readiness, departure risk, and operations recommendations. The LLM layer (L3) explains precomputed scores only; it never writes CRM, booking, traveler, document, or payment state.

## Deliverables by phase

### 9D-A — Foundation

| Item | Location |
|------|----------|
| Migration 060 | `database/migrations/060_ai_ops_assistant.sql` — snapshots, history, `dispatch.ai_ops_score`, `operations` agent key |
| Migration 061 | `database/migrations/061_ai_ops_recommendations.sql` |
| Migration 062 | `database/migrations/062_ai_ops_insights.sql` — `get_operations_insights()` |
| Migration 063 | `database/migrations/063_ai_ops_rls_permissions.sql` — RLS + `ai.operations.*` |
| Migration 064 | `database/migrations/064_booking_document_type.sql` — semantic doc types |
| Score service | `src/lib/operations-ai/operations-score-service.ts` |
| Event dispatcher | `src/lib/operations-ai/operations-score-dispatcher.ts` |
| Worker integration | `src/lib/events/job-queue-service.ts`, `event-dispatch-worker.ts` |

### 9D-B — Recommendations & widgets

- `OperationsRecommendationEvaluator` — `src/lib/operations-ai/recommendation-evaluator.ts`
- APIs: `/api/crm/operations/recommendations`, `snapshots`, `widgets`
- CRM dashboard ops widgets (at-risk, departures 7d, open rec count)

### 9D-C — Operations Agent & UX

- `POST /api/ai/operations-agent` — explanation-only chat
- `OperationsAssistantPanel` on booking show
- `Customer360OperationsStrip` on Customer 360 overview

### 9D-D — Insights & mobile

- `/crm/operations-insights` dashboard
- Mobile booking health/readiness badges (`useOperationsAi`, `BookingListScreen`)
- Mobile dashboard ops recommendation KPI

### 9D-E — Hardening

- Rate limits + monthly token budget (`src/lib/operations-ai/rate-limit.ts`)
- Unit tests: `npm run test:operations-ai`
- Gate script: `npm run gate:sprint9d:operations-ai`

## Scoring model (L1)

- **Entities:** `booking` only (draft/confirmed, active departure window)
- **Scores:** health (0–100), risk (0–100), readiness (checklist %)
- **Status bands:** healthy → attention_required → at_risk → critical
- **Inputs:** payment status, travelers, passports, documents (incl. `document_type`), travel date

## Event triggers

`dispatch.ai_ops_score` enqueued on:

- `booking.created`, `booking.updated`, `booking.cancelled`
- `payment.created`, `payment.authorized`, `payment.completed`, `payment.failed`

## Permissions

| Permission | Purpose |
|------------|---------|
| `ai.operations.use` | Operations Assistant chat |
| `ai.operations.read` | Scores & recommendations |
| `ai.operations.insights.read` | Operations Insights dashboard |
| `ai.operations.manage` | Rule/config management (reserved) |

## Out of scope (unchanged)

- Autonomous booking/traveler/document/payment changes
- Customer-facing AI, WhatsApp AI, predictive ML
- Merge with communications dashboard at `/crm/operations`

## Apply & validate

```bash
npm run db:sync && npm run db:push
npm run test:operations-ai
npm run gate:sprint9d:operations-ai
```

## UAT checklist

- [ ] Create/update booking → snapshot appears on booking show
- [ ] Unpaid confirmed booking near departure → payment_gap recommendation
- [ ] Missing passport → missing_passport recommendation
- [ ] Operations Assistant answers cite snapshot/recommendation IDs only
- [ ] Dismiss recommendation → status updated, feedback row inserted
- [ ] Operations Insights loads KPIs and upcoming departures table
- [ ] Mobile booking list shows health/readiness badges (read-only)
- [ ] Token budget exceeded returns 429 on agent API

## Next pillars (roadmap)

- **Sprint 10A** — Supplier / GDS integrations
- **Sprint 10B** — Marketplace & partner ecosystem
- **Sprint 10C** — Customer mobile app
