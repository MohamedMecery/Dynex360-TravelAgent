# Sprint 8C — Customer Communications & Automation Implementation Report

**Status:** Implemented (Option B-lite)  
**Date:** 2026-06-03  
**Architecture reference:** [Sprint-8C-Communications-Architecture-Review.md](./Sprint-8C-Communications-Architecture-Review.md)

---

## 1. Migration Summary

| Migration | Purpose |
|-----------|---------|
| `041_domain_events.sql` | Append-only `domain_events` table, RLS (staff + portal SELECT), `emit_domain_event()` RPC with idempotency |
| `042_customer_notifications.sql` | `customer_notifications`, `notification_deliveries`, extends `notifications` + `email_delivery_logs`, user-scoped staff inbox RLS |
| `044_timeline_view_domain_events.sql` | Wraps existing timeline as `v_customer_timeline_events_derived`; unions `domain_events` with dedup rules |

**Apply order:** 041 → 042 → 044

**Validation SQL:** `database/tests/portal_sprint8c_validation.sql`

---

## 2. Event Architecture Summary

- **Canonical store:** PostgreSQL `domain_events` (immutable, tenant/customer/actor aware)
- **Emitter:** `EventEmitterService` → `emit_domain_event()` (service role only)
- **Orchestrator:** `emitAndDispatch()` in `src/lib/events/dispatch-event.ts`
- **Idempotency:** Unique `idempotency_key`; RPC returns existing event ID on conflict
- **Canonical event types:** Defined in `src/lib/events/types.ts` (`DOMAIN_EVENT_TYPE`)

**8B refactor:** Portal quotation accept/reject now emits `quotation.accepted` / `quotation.rejected` before dispatch (no direct email calls from portal actions).

---

## 3. Notification Architecture Summary

| Layer | Table / Component | Channel |
|-------|-------------------|---------|
| Customer portal | `customer_notifications` | in_app |
| CRM staff inbox | `notifications` (extended) | in_app |
| Delivery audit | `notification_deliveries` | in_app, email |
| Email audit | `email_delivery_logs.domain_event_id` | email |

**Dispatchers (synchronous, no workers):**

- `NotificationDispatcher` — projects domain events → customer + staff notifications; routes to quotation owner + tenant_admin/super_admin
- `EmailDispatcher` — maps quotation accept/reject → existing email templates; records delivery status

**Out of scope (8C):** push, WhatsApp, SMS, async queues, webhooks

---

## 4. CRM Inbox Summary

**APIs (requireActiveApiAccess):**

- `GET /api/notifications`
- `PATCH /api/notifications/[id]/read`
- `POST /api/notifications/read-all`

**UI:** `/notifications` page + sidebar inbox link with unread badge (`StaffInboxLink`)

**Routing MVP:** Quotation `owner_id` + tenant admins receive staff notifications for quotation/booking/customer portal events.

---

## 5. Portal Notification Center Summary

**APIs (requirePortalApiAccess):**

- `GET /api/portal/notifications`
- `GET /api/portal/notifications/unread-count`
- `PATCH /api/portal/notifications/[id]/read`
- `POST /api/portal/notifications/read-all`

**UI:** `/portal/notifications` + nav item with unread badge

---

## 6. Customer 360 Integration

- `v_customer_timeline_events` unions derived sources with `domain_events`
- Dedup: excludes `quotation.sent`/`viewed` from domain branch; skips accept/reject when already in derived view
- `src/lib/crm/timeline-events.ts` extended with portal/booking domain event types
- Timeline meta enriched with `aggregate_type`, `aggregate_id`, `domain_event_type`

---

## 7. Security Validation Report

| Control | Status |
|---------|--------|
| Portal JWT excludes `tenant_id` | Preserved |
| `requirePortalApiAccess()` on portal notification APIs | ✅ |
| `requireActiveApiAccess()` on staff notification APIs | ✅ |
| Customer ownership on portal reads/updates | RLS + API filters |
| Staff inbox user-scoped RLS | ✅ (migration 042) |
| No client INSERT into `domain_events` | RPC service role only |
| Staff blocked from portal APIs | Gate tested |
| Cross-customer notification PATCH → 404 | Gate tested |

---

## 8. Testing Report

| Suite | Location | Coverage |
|-------|----------|----------|
| Unit tests | `npm run test:events` | Idempotency keys, notification copy, routing flags |
| Portal HTTP gate (8A/8B/8C) | `npm run gate:portal` | Portal + staff notification APIs, cross-customer/user security |
| Events gate | `npm run gate:sprint8c:events` | RPC emit, idempotency, timeline, projection tables |
| SQL validation | `database/tests/portal_sprint8c_validation.sql` | End-to-end DB emit + timeline |

**Run:**

```bash
npm run test:sprint8c
npm run gate:portal
```

---

## 9. Production Readiness Assessment

| Area | Assessment |
|------|------------|
| Architecture alignment | ✅ Option B-lite, no external bus |
| Auth models | ✅ Unchanged (8A/8B preserved) |
| Migrations | ⚠️ Apply 041–044 to target Supabase before deploy |
| Email | ✅ Reuses existing provider/templates |
| Dispatch model | ✅ Synchronous inline dispatch (acceptable for 8C volume) |
| Observability | ✅ `notification_deliveries` + `email_delivery_logs.domain_event_id` |
| Future consumers | ✅ `domain_events` ready for 8D+ workers/webhooks |

**Recommendation:** Apply migrations in staging, run both gate scripts, smoke-test portal accept/reject to verify event → notification → email chain.

---

## Key Files

```
database/migrations/041_domain_events.sql
database/migrations/042_customer_notifications.sql
database/migrations/044_timeline_view_domain_events.sql
src/lib/events/
src/lib/notifications/
src/app/api/notifications/
src/app/api/portal/notifications/
src/app/portal/notifications/page.tsx
src/app/notifications/page.tsx
```
