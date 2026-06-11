# Sprint 8D — Async Communications & Operational Automation Report

**Status:** Implemented  
**Date:** 2026-06-03  
**Builds on:** [Sprint-8C-Communications-Implementation-Report.md](./Sprint-8C-Communications-Implementation-Report.md)

---

## 1. Queue Architecture Summary

| Component | Description |
|-----------|-------------|
| `event_dispatch_jobs` | PostgreSQL-native queue (migration `045`) |
| Job types | `dispatch.notification`, `dispatch.email` |
| Statuses | `pending`, `processing`, `completed`, `failed`, `dead_letter` |
| Idempotency | Unique `idempotency_key` per job (`{job_type}:{domain_event_id}`) |
| Claiming | `claim_event_dispatch_jobs()` — `FOR UPDATE SKIP LOCKED` |
| Enqueue | `enqueue_event_dispatch_job()` — service role only |
| Retry | Exponential backoff via `fail_event_dispatch_job()`; default `max_retries=5` |

**Flow:** `emitAndDispatch()` → emit domain event → enqueue jobs → worker processes asynchronously.

No Kafka, RabbitMQ, or external brokers.

---

## 2. Worker Architecture Summary

**Chosen approach:** Next.js secured cron API route (`POST /api/cron/process-dispatch-jobs`).

| Why | Detail |
|-----|--------|
| Reuses existing dispatch code | `NotificationDispatcher.process`, `EmailDispatcher.process` |
| No new runtime | Email provider already in Next.js |
| Production scheduling | External cron / Vercel Cron hits endpoint with `CRON_SECRET` |
| Alternative considered | pg_cron would still need HTTP to reach email SDK; Edge Functions duplicate logic |

**Worker:** `EventDispatchWorker.processBatch()` claims jobs, loads domain event, dispatches, completes or fails with retry/dead-letter.

**Env:** `CRON_SECRET` — required for worker endpoint authorization.

---

## 3. Monitoring Architecture Summary

| Surface | Access |
|---------|--------|
| `GET /api/crm/operations/metrics` | `tenant_admin`, `super_admin` |
| UI `/crm/operations` | Operations dashboard (CRM nav) |

**Metrics (24h window + queue snapshot):**

- Pending / failed / dead-letter jobs
- Jobs completed (24h)
- Emails sent / failed (24h)
- In-app notifications sent / failed (24h)
- Domain event throughput

Service: `fetchOperationsMetrics()` via admin client (tenant-scoped for tenant admins).

---

## 4. Reliability Report

| Area | 8C (sync) | 8D (async) |
|------|-----------|------------|
| API latency | Blocked on email send | Returns after enqueue |
| Notification projection | Inline | Worker with retry |
| Email delivery | Inline | Worker with retry + dead-letter |
| Idempotency | Event + notification dedup | + job idempotency keys |
| Failure tracking | Delivery logs | Jobs `last_error`, `retry_count`, dead-letter |

**Email:** `EmailDispatcher.process()` records `pending` → `sent`/`failed`/`skipped` in `notification_deliveries`.

**Notifications:** Failed inserts throw → job retry; dead-letter after max retries.

---

## 5. Security Validation Report

| Control | Status |
|---------|--------|
| Client cannot INSERT jobs | REVOKE on `event_dispatch_jobs`; RPC service role only |
| Worker endpoint | `CRON_SECRET` Bearer / `x-cron-secret` |
| Operations metrics | `requireActiveApiAccess()` + tenant admin RBAC |
| Tenant isolation | Jobs + metrics scoped by `tenant_id` |
| Portal / RLS | Unchanged from 8A–8C |
| Scheduled automations | Templates inactive; no client execution |

---

## 6. Testing Report

| Suite | Command |
|-------|---------|
| Unit tests | `npm run test:events` |
| Worker + queue gate | `npm run gate:sprint8d:worker` |
| Portal gate (drains queue) | `npm run gate:portal` |
| SQL validation | `database/tests/sprint8d_validation.sql` |

**Coverage:** enqueue idempotency, worker HTTP auth, batch processing, retry keys, load enqueue (5 jobs).

---

## 7. Production Readiness Assessment

| Area | Assessment |
|------|------------|
| Migrations | Apply `045`, `046` before deploy |
| Cron | Configure scheduler to POST `/api/cron/process-dispatch-jobs` every 1–5 min |
| `CRON_SECRET` | Set in production env |
| Backward compatibility | 8C tables preserved; dispatch path now async |
| Scheduled automations | Framework only — templates seeded inactive |
| Future channels | Queue pattern ready for WhatsApp / AI / payments |

**Recommendation:** After deploy, verify portal accept/reject creates jobs and cron completes them within SLA.

---

## Phase 6 — Scheduled Automation Framework

- `scheduled_automation_templates` — registry with inactive placeholders:
  - `quotation.expiring_soon`
  - `booking.departure_reminder`
  - `booking.return_reminder`
  - `customer.follow_up_due`
- `scheduled_automation_runs` — execution log schema (no workflows enabled)
- `scheduled-automation-service.ts` — read templates; `enqueueScheduledAutomationRun()` throws (8D guard)

---

## Key Files

```
database/migrations/045_event_dispatch_jobs.sql
database/migrations/046_scheduled_automations_framework.sql
src/lib/events/job-queue-service.ts
src/lib/events/event-dispatch-worker.ts
src/lib/events/dispatch-event.ts
src/app/api/cron/process-dispatch-jobs/route.ts
src/app/api/crm/operations/metrics/route.ts
src/app/crm/operations/page.tsx
scripts/run-sprint8d-worker-gate.mjs
```
