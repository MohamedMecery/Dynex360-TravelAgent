# TravelOS Sprint 8C — Customer Communications & Automation Architecture Review

**Sprint:** 8C (Architecture review only — no implementation)  
**Status of prerequisites:** CRM Core ✅ · Mobile MVP ✅ · Portal 8A ✅ · Portal 8B ✅  
**Date:** 2026-06-03  
**Decision:** **Proceed to implementation planning** (pending approval of this review)

---

## Executive Summary

TravelOS today has **fragmented communication primitives** that work but do not scale as a unified platform:

| Primitive | Exists | Used for | Gap |
|-----------|--------|----------|-----|
| `notifications` | ✅ (migration 005) | Staff in-app (schema only) | **No application code writes or reads it** |
| `email_delivery_logs` | ✅ (migration 024) | Outbound email audit | Channel-specific; not linked to business events |
| `audit_logs` | ✅ | Staff DB change trail + portal customer actions (8B) | Compliance/audit, not user-facing notifications |
| `v_customer_timeline_events` | ✅ | Customer 360 read model | SQL view derived from domain tables; no portal/email events |
| Direct email calls | ✅ | welcome, booking, support, quotation accept/reject | Ad-hoc; synchronous in request handlers |

Sprint 8C should introduce a **thin canonical event layer** plus **persisted notification projections** for staff and customers — without implementing WhatsApp, AI, or payments.

**Recommendation:** Adopt a **hybrid model** — **Option B-lite** (canonical `domain_events` log + notification projections), not a full external message bus and not notification tables alone.

---

## 1. Event Architecture

### 1.1 Option A — Simple Notification Tables

**Description:** On each business action, application code directly inserts rows into `notifications` (staff) and a new `customer_notifications` table (portal), optionally calling email helpers.

```
quotation accept API
  → UPDATE quotations
  → INSERT customer_notifications
  → INSERT notifications (owner)
  → sendTransactionalEmail()
```

| Pros | Cons |
|------|------|
| Fast to ship | Every new event type = new insert paths scattered across services |
| Matches existing unused `notifications` table | No single source of truth for “what happened” |
| Low conceptual overhead | WhatsApp / push / AI each need new hooks per workflow |
| | Customer 360 timeline stays separate (view vs notifications diverge) |
| | Hard to replay, audit uniformly, or build automation rules |

**Verdict:** Suitable for a single sprint demo, **insufficient** as the communications foundation for 8C goals.

---

### 1.2 Option B — Central Event Bus Pattern

**Description:** Every significant business occurrence emits a **canonical domain event** (e.g. `quotation.accepted`). Subscribers create notifications, send email, update timeline projections, and (future) WhatsApp/AI/payment hooks.

```
quotation accept API
  → UPDATE quotations (authoritative state)
  → emit domain_event { type: quotation.accepted, payload, ... }
  → dispatchers (sync or queued):
       → staff notification projection
       → customer notification projection
       → email delivery job
       → (future) whatsapp / ai / webhook subscribers
```

| Pros | Cons |
|------|------|
| Single event vocabulary for CRM, portal, mobile, future channels | Requires disciplined emit points and idempotency |
| Subscribers decouple delivery from workflows | Slightly more schema and service code upfront |
| Natural fit for WhatsApp, AI, payment webhooks later | Must avoid over-engineering (no Kafka required at current scale) |
| Customer 360 can UNION domain events instead of duplicating logic | Migration path from ad-hoc email calls |

**Verdict:** **Recommended**, implemented as **PostgreSQL-native B-lite** (append-only `domain_events` + in-process or pg_cron dispatch), not an external broker.

---

### 1.3 Recommended Model: Option B-lite

**Canonical store:** `domain_events` (append-only, immutable)

**Event naming convention** (dot-separated, stable):

| Event type | Trigger |
|------------|---------|
| `quotation.accepted` | Customer or staff accepts |
| `quotation.rejected` | Customer or staff rejects |
| `quotation.sent` | Staff sends to customer |
| `quotation.viewed` | Portal/mark-viewed |
| `booking.created` | Booking created |
| `booking.updated` | Status or material field change |
| `booking.cancelled` | Status → cancelled |
| `customer.created` | Customer record created |
| `customer.portal_registered` | Portal account linked |
| `customer.password_reset_requested` | Auth reset initiated |
| `email.delivery_completed` | Optional meta-event from email layer |

**Emit authority:** Server-side only (API routes / admin services after validation). Never from portal client or Refine direct Supabase writes.

**Dispatch modes (phased):**

1. **Phase 8C:** Synchronous dispatch in API handler after commit (same request, non-blocking email via fire-and-forget with delivery log).
2. **Phase 8D+:** `pg_cron` or Supabase Edge Function worker polling `domain_events` where `dispatched_at IS NULL` for retryable channels.

**Relationship to existing systems:**

| System | Role after 8C |
|--------|---------------|
| `audit_logs` | **Unchanged** — compliance trail (INSERT/UPDATE/DELETE + portal `event_name`) |
| `email_delivery_logs` | **Delivery channel log** — linked to `domain_event_id` |
| `v_customer_timeline_events` | **Read projection** — UNION domain events + existing derived rows |
| Portal quotation timeline | **Thin client** — reads same event types or dedicated timeline API backed by domain events |

**Do not** replace authoritative domain tables (quotations, bookings). Events are **facts emitted after** successful mutations.

---

## 2. Notification Architecture

### 2.1 Audience Model

| Audience | Identity | Storage | Primary UX |
|----------|----------|---------|------------|
| **Customer** | `customer_id` + optional `portal_account_id` | `customer_notifications` | Portal `/portal/notifications` |
| **Staff (CRM)** | `users.id` within tenant | Extend `notifications` | CRM inbox / header bell |
| **Operations** | Role- or team-scoped | Same table + `audience` metadata | Finance/ops filtered inbox |

Portal users are **not** in `public.users`. Customer notifications **must not** reuse the staff `notifications.user_id FK`.

### 2.2 Design Decisions

| Question | Recommendation | Rationale |
|----------|----------------|-----------|
| Persist notifications? | **Yes** | In-app UX requires history, unread counts, deep links |
| Read/unread? | **Yes** | Already in `notifications`; add to `customer_notifications` |
| Future channels? | **Yes — via delivery table** | In-app row ≠ email sent ≠ WhatsApp sent |
| Delivery status tracking? | **Yes — `notification_deliveries`** | Unifies email logs; extensible per channel |

### 2.3 Proposed Logical Model

```
domain_events (1)
    └── notification_deliveries (N)   ← channel: in_app | email | push | whatsapp
            ├── links to staff notification row OR customer notification row
            └── status: pending | sent | failed | skipped
```

**Staff notification row** (`notifications` — extended):

- `event_id` → `domain_events.id`
- `user_id`, `tenant_id`, `type`, `title`, `message`, `entity_type`, `entity_id`
- `is_read`, `read_at`, `priority`, `action_url`

**Customer notification row** (`customer_notifications` — new):

- `event_id`, `customer_id`, `portal_account_id`, `tenant_id`
- `type`, `title`, `message`, `entity_type`, `entity_id`
- `is_read`, `read_at`, `action_url` (portal path)

**Email** continues through `sendTransactionalEmail()` but is invoked by an **email dispatcher subscriber**, not directly from portal action services (refactor over time).

### 2.4 Idempotency

Emit events with deterministic idempotency key:

```
{event_type}:{tenant_id}:{aggregate_type}:{aggregate_id}:{occurred_at_bucket_or_version}
```

Dispatchers use `UNIQUE(event_id, channel, recipient)` on `notification_deliveries` to prevent duplicate sends on retry.

---

## 3. CRM Inbox Architecture

### 3.1 Purpose

Give staff a **multi-tenant, RBAC-aware inbox** for customer and operations signals without polling Customer 360.

**Example items:**

- Customer accepted quotation Q-2026-0042
- Customer rejected quotation (with reason)
- Booking BK-2026-001 confirmed
- New portal account for customer Ahmed Hassan

### 3.2 Routing Rules

| Event | Default recipients |
|-------|-------------------|
| `quotation.accepted` / `quotation.rejected` | Quotation `owner_id` + users with `crm.quotations.read_all` |
| `booking.created` / `booking.updated` | Booking creator + tenant_admin |
| `customer.portal_registered` | tenant_admin + sales_agent role (configurable) |

**Implementation:** `notification_routing_rules` table (tenant overrides) OR static rules in dispatcher service for 8C MVP, tenant settings JSON for 8D.

### 3.3 RBAC

| Check | Mechanism |
|-------|-----------|
| Tenant isolation | `tenant_id = current_tenant_id()` on all inbox queries |
| User scope | `notifications.user_id = auth.uid()` |
| Role-based fan-out | Dispatcher creates N notification rows only for eligible users (resolve via `user_roles` + permission strings mirroring CRM RBAC) |
| Sensitive events | Finance events require `dashboard.financial` or role filter |

**API (future implementation):**

```
GET  /api/notifications?unread=true&limit=20
PATCH /api/notifications/[id]/read
POST /api/notifications/read-all
```

Uses existing `requireActiveApiAccess()` — **not** portal API.

### 3.4 UI Placement

- Refine resource or header bell component in CRM shell
- Deep link to quotation/booking/customer show pages
- Unread badge count query: `COUNT(*) WHERE user_id = ? AND is_read = false`

---

## 4. Customer Notification Center (Portal)

### 4.1 Portal Page

**Route:** `/portal/notifications`  
**Nav:** Add to `PortalNav` alongside Dashboard, Quotations, Bookings, Profile.

**Content examples:**

| Type | Title pattern |
|------|---------------|
| `quotation.accepted` | “You accepted quotation {number}” |
| `quotation.rejected` | “You declined quotation {number}” |
| `booking.updated` | “Booking {ref} status: {status}” |
| `customer.portal_registered` | “Welcome — your portal account is active” |
| `customer.password_reset_requested` | “Password reset requested” |

### 4.2 Storage Model

Table: **`customer_notifications`**

| Column | Notes |
|--------|-------|
| `id` | UUID PK |
| `tenant_id` | Required for staff admin queries |
| `customer_id` | RLS scope for portal |
| `portal_account_id` | Optional; null for pre-login email-only events |
| `domain_event_id` | FK to canonical event |
| `type` | Mirrors event type string |
| `title`, `message` | Rendered copy (locale resolved at dispatch) |
| `entity_type`, `entity_id` | Deep link target |
| `action_url` | Portal-relative path |
| `is_read`, `read_at` | Unread state |
| `created_at` | Sort key |

### 4.3 API Model

| Method | Route | Gate |
|--------|-------|------|
| GET | `/api/portal/notifications` | `requirePortalApiAccess()` |
| GET | `/api/portal/notifications/unread-count` | portal |
| PATCH | `/api/portal/notifications/[id]/read` | portal |
| POST | `/api/portal/notifications/read-all` | portal |

List filtered by `customer_id` from resolved portal session — **never** from client-supplied customer ID.

### 4.4 RLS Strategy

```sql
-- Portal SELECT/UPDATE own customer rows only
USING (
  is_portal_user()
  AND customer_id = portal_customer_id()
  AND tenant_id = portal_tenant_id()
)
```

Staff read via separate policy: `is_crm_staff_user() AND tenant_id = current_tenant_id()`.

Portal JWT still has **no `tenant_id` claim** — `portal_tenant_id()` reads from `customer_portal_accounts` (8A pattern preserved).

---

## 5. Customer 360 Timeline Expansion

### 5.1 Current State

- **`v_customer_timeline_events`** — SQL view UNIONing leads, opportunities, activities, bookings, invoices, payments, tickets, quotations (lifecycle timestamps).
- **`TIMELINE_EVENT_TYPE`** constants in `src/lib/crm/timeline-events.ts` — stable naming contract.
- **Portal quotation timeline** (8B) — application-built from quotation columns; **not** in Customer 360 view today.
- **`email_delivery_logs`** — not in timeline.
- **`audit_logs` with `event_name`** — portal accept/reject; not in timeline.

### 5.2 Problem: Duplicate History Systems

If 8C adds notifications without coordinating timeline, we risk:

- Same “quotation accepted” appearing from view derivation AND notification insert AND audit row
- Email sends invisible in Customer 360
- Portal-only actions missing for staff in 360

### 5.3 Recommended Integration — Single Event Vocabulary

**Principle:** `domain_events` is the **write model for communicative facts**; timelines are **read projections**.

```
                    ┌─────────────────────┐
                    │   domain_events     │  ← canonical emit on business action
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
  customer_notifications  staff notifications  email_delivery
           │                   │
           └─────────┬─────────┘
                     ▼
         v_customer_timeline_events_v2
              (UNION domain_events + legacy derived rows)
```

**Migration strategy for the view:**

1. **8C:** Add UNION branch for `domain_events` where `customer_id IS NOT NULL`, mapping `event_type` → `TIMELINE_EVENT_TYPE` via lookup table.
2. **Keep** existing quotation timestamp branches until backfill confirms parity.
3. **Add** `timeline_bucket` for new types: `portal`, `communications`.
4. **Deprecate** portal-only `buildPortalQuotationTimeline()` in favor of shared timeline API filtered by `entity_type=quotation` (optional 8D cleanup).

**Email in timeline:** Emit `communication.email_sent` domain event when email dispatcher succeeds (or link `email_delivery_logs.domain_event_id` into view JOIN).

**Do not** use `notifications` rows as timeline source — notifications are user-specific; timeline is customer-centric.

---

## 6. Future WhatsApp Compatibility (Design Only)

WhatsApp is **out of scope** for 8C. Architecture should allow a **subscriber**:

```
domain_events WHERE type IN ('quotation.sent', 'booking.updated', ...)
  → whatsapp_dispatcher (future)
  → notification_deliveries.channel = 'whatsapp'
  → external provider API
```

**Requirements for future compatibility:**

| Requirement | 8C foundation |
|-------------|---------------|
| Event payload includes customer phone | Include `customer_id` + resolved phone in event payload snapshot |
| Template mapping | `notification_templates` table keyed by `event_type` + channel |
| Opt-in / consent | `customer_communication_preferences` (defer table to WhatsApp sprint) |
| Idempotent send | `notification_deliveries` unique constraint |
| Inbound replies | Separate `inbound_messages` table subscribing to webhook (future) — not 8C |

**Do not** hardcode WhatsApp calls in quotation/booking services — only emit events.

---

## 7. Future AI Compatibility (Design Only)

AI agents (existing `ai-conversations`, knowledge RAG) should **consume**, not duplicate, event streams.

**Recommended interfaces:**

| Interface | Use |
|-----------|-----|
| `GET /api/customers/[id]/360/timeline` | Already exists — extend with communication events |
| `GET /api/internal/domain-events?customer_id=` | Service-role or agent-scoped API (future) |
| Domain event payload JSON | Structured context for agent prompts (quotation totals, booking status) |

**Agent patterns:**

- **Reactive:** User asks “what happened with this customer?” → timeline + recent domain events.
- **Proactive (future):** Cron agent scans `domain_events` for `quotation.viewed` + no follow-up → suggest staff task (creates CRM activity, not notification duplicate).

**Guardrails:**

- AI must not read cross-tenant events (RLS + API tenant gate).
- PII in event payloads — minimize; reference IDs + lazy load details.

---

## 8. Database Design Proposal

**No migrations in this sprint.** Proposed schema for implementation approval:

### 8.1 New Tables

#### `domain_events` (canonical)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID NOT NULL | |
| `event_type` | VARCHAR(100) NOT NULL | e.g. `quotation.accepted` |
| `aggregate_type` | VARCHAR(50) | quotation, booking, customer |
| `aggregate_id` | UUID | |
| `customer_id` | UUID NULL | Denormalized for timeline/notifications |
| `actor_type` | ENUM staff, customer, system | |
| `actor_user_id` | UUID NULL | staff users.id |
| `actor_customer_id` | UUID NULL | |
| `actor_portal_account_id` | UUID NULL | |
| `payload` | JSONB NOT NULL DEFAULT '{}' | Snapshot for dispatchers |
| `idempotency_key` | VARCHAR(255) UNIQUE | |
| `occurred_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

**Indexes:**

- `(tenant_id, occurred_at DESC)`
- `(tenant_id, customer_id, occurred_at DESC)` — Customer 360
- `(tenant_id, event_type, occurred_at DESC)`
- `(aggregate_type, aggregate_id)`

#### `customer_notifications`

As defined in §4.2.

**Indexes:**

- `(customer_id, is_read, created_at DESC)`
- `(portal_account_id, created_at DESC)`

#### `notification_deliveries`

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `tenant_id` | UUID |
| `domain_event_id` | UUID FK |
| `channel` | ENUM in_app, email, push, whatsapp, webhook |
| `recipient_type` | ENUM staff_user, customer, email_address |
| `recipient_id` | UUID or email string |
| `status` | ENUM pending, sent, failed, skipped |
| `provider_id` | TEXT NULL |
| `error_message` | TEXT NULL |
| `attempted_at`, `completed_at` | TIMESTAMPTZ |

**Unique:** `(domain_event_id, channel, recipient_id)`

#### `notification_routing_rules` (optional 8C, recommended 8D)

Tenant-configurable fan-out for staff inbox.

### 8.2 Extensions to Existing Tables

| Table | Extension |
|-------|-----------|
| `notifications` | Add `domain_event_id`, `priority`, `action_url`; wire application code |
| `email_delivery_logs` | Add `domain_event_id` FK (nullable for backfill) |
| `audit_logs` | **No change** — keep separate purpose |

### 8.3 RLS Policies (Summary)

| Table | Staff | Portal | Service role |
|-------|-------|--------|--------------|
| `domain_events` | SELECT tenant | SELECT own customer events | INSERT emit |
| `customer_notifications` | SELECT tenant | SELECT/UPDATE own | INSERT dispatch |
| `notifications` | SELECT/UPDATE own rows | — | INSERT dispatch |
| `notification_deliveries` | SELECT tenant (admin) | — | INSERT/UPDATE |

Emit path uses **`createAdminClient()`** after validation (same as 8B portal mutations).

### 8.4 Migration Strategy

| Step | Migration | Content |
|------|-----------|---------|
| 041 | `041_domain_events.sql` | `domain_events` + RLS + emit RPC |
| 042 | `042_customer_notifications.sql` | Customer notifications + deliveries |
| 043 | `043_notifications_wireup.sql` | Extend staff notifications + indexes |
| 044 | `044_timeline_view_domain_events.sql` | Extend `v_customer_timeline_events` |
| Backfill | Script (optional) | None required — forward-only emit |

**Rollback:** Drop new tables; revert view; email continues ad-hoc (8B behavior).

---

## 9. Security Review

| Threat | Mitigation |
|--------|------------|
| Cross-tenant event leak | `tenant_id` on all tables; RLS; emit only after tenant resolved in API |
| Cross-customer portal notifications | Filter by `portal_customer_id()`; 404 on wrong IDs |
| Portal user creating fake events | No client INSERT on `domain_events`; server emit only |
| Staff impersonation in event actor | Set `actor_user_id` from `requireActiveApiAccess()` |
| Enumeration via notification IDs | UUIDs; ownership checks |
| PII in payload JSON | Minimize payload; no passwords/tokens in events |
| Email injection | Existing email service validation unchanged |
| Replay / duplicate notifications | Idempotency key + unique delivery constraint |
| JWT portal without tenant_id | Preserved — RLS uses DB helpers not JWT tenant claim |

**Audit vs events:** `audit_logs` remains for compliance; `domain_events` for product communications. Portal accept continues both (8B pattern).

---

## 10. Scalability Assessment

Assumptions: single Supabase Postgres primary, Next.js API handlers, synchronous dispatch in 8C.

| Scale | Tenants | Events/day | Assessment |
|-------|---------|------------|------------|
| **Small** | 10 | ~500 | Trivial — current architecture sufficient |
| **Medium** | 100 | ~5,000 | `domain_events` table < 2M rows/year; indexes adequate |
| **Large** | 1,000 | ~50,000 | Consider monthly partitioning on `domain_events` by `occurred_at` |
| **High volume** | 1,000+ | **100,000** | ~1.2 events/sec avg; peaks ~20–50/sec |

### Bottlenecks at 100k events/day

| Bottleneck | Risk | Mitigation |
|------------|------|------------|
| Synchronous email in API | Request latency | Queue deliveries; mark pending; worker sends |
| `v_customer_timeline_events` view complexity | Slow Customer 360 | Materialized view refreshed periodically OR timeline reads `domain_events` directly with cursor pagination |
| Notification fan-out (N users per event) | Insert storms | Batch INSERT; defer to worker for large tenants |
| Unread count queries | Hot row scans | Partial index `(user_id) WHERE is_read = false`; cache count 30s TTL |
| `email_delivery_logs` growth | Storage | Retention policy (90d) archival |

**100k events/day is achievable on Supabase Pro** with B-lite pattern and async email dispatch. Full Kafka/EventBridge not required until multi-region or >500k/day sustained.

---

## 11. Recommended Sprint 8C Implementation Plan

**Scope:** Foundation only — no WhatsApp, AI, payments, push.

### Phase 8C.1 — Event Core (Week 1)

- [ ] Migration 041: `domain_events` + emit helper `emit_domain_event()` (SECURITY DEFINER or service role)
- [ ] TypeScript `EventEmitterService` wrapping admin client
- [ ] Idempotency key generation
- [ ] Unit tests for emit + duplicate rejection

### Phase 8C.2 — Dispatchers (Week 1–2)

- [ ] `NotificationDispatcher` — creates staff + customer notification rows
- [ ] `EmailDispatcher` — refactors quotation accept/reject to event-driven path
- [ ] `notification_deliveries` logging
- [ ] Wire emit points: portal accept/reject, booking status update, portal provision, password reset hook

### Phase 8C.3 — CRM Inbox (Week 2)

- [ ] API: list/mark-read notifications
- [ ] Refine inbox UI or header bell
- [ ] Routing rules MVP (quotation owner + tenant_admin)

### Phase 8C.4 — Portal Notification Center (Week 2–3)

- [ ] Migration 042: `customer_notifications`
- [ ] API routes under `/api/portal/notifications`
- [ ] `/portal/notifications` page + nav item
- [ ] Unread indicator on portal nav

### Phase 8C.5 — Customer 360 Integration (Week 3)

- [ ] Migration 044: extend timeline view with `domain_events` UNION
- [ ] Map event types to `TIMELINE_EVENT_TYPE` / buckets
- [ ] Verify no duplicate cards for quotation accept (view vs event)

### Phase 8C.6 — Testing & Gate (Week 3)

- [ ] HTTP gate: event emitted on accept; customer + staff notification created
- [ ] Cross-tenant isolation tests
- [ ] Playwright: portal notifications page
- [ ] Load smoke: 1000 sequential emits

### Explicitly Deferred (Post-8C)

- WhatsApp subscriber
- AI proactive agents on event stream
- Payment webhooks (`payment.received` events)
- Push notifications (FCM/APNs)
- Async worker / pg_cron (recommended 8D if email volume grows)
- Tenant-configurable routing UI

---

## 12. Decision Summary

| Deliverable | Recommendation |
|-------------|----------------|
| **Event model** | **Option B-lite** — canonical `domain_events` + subscribers |
| **Notification model** | Persisted staff + customer notifications; `notification_deliveries` per channel |
| **CRM inbox** | Extend existing `notifications` table with event linkage + RBAC fan-out |
| **Portal notification center** | New `customer_notifications` + `/portal/notifications` |
| **Customer 360** | UNION `domain_events` into timeline view; single event vocabulary |
| **WhatsApp (future)** | Event subscriber + delivery table channel |
| **AI (future)** | Consume timeline + domain events API |
| **Database** | Migrations 041–044 (proposed); no change to 8A/8B auth model |
| **Security** | Server emit only; RLS; portal isolation preserved |
| **Scalability** | Postgres sufficient to 100k events/day with async email in 8D |

---

## Approval Gate

This document is **architecture review only**. No code, migrations, or project files were modified for implementation.

**Next step:** Product/engineering approval of Option B-lite and migration 041–044 scope → begin Sprint 8C implementation.

---

*References: Customer-Portal-Foundation-Report.md (8A), Customer-Portal-Transactions-Report.md (8B), migrations 005/024/033/036/039/040, `v_customer_timeline_events`, `src/lib/crm/timeline-events.ts`, `src/lib/email/email-service.ts`.*
