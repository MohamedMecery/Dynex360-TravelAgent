# TravelOS Sprint 9A — Customer Checkout & Payments Implementation Report

**Sprint:** 9A  
**Status:** Implemented (pending migration apply + gate run on staging)  
**Date:** 2026-06-04  
**Builds on:** Portal 8A/8B, Communications 8C/8D

---

## 1. Migration Summary

| Migration | Purpose |
|-----------|---------|
| `047_payment_gateway_core.sql` | `payment_orders`, `payment_attempts`, `payment_provider_events`, enums |
| `048_payment_gateway_rls.sql` | Portal/staff SELECT; revoke client writes |
| `049_payment_ledger_link.sql` | `payments.source`, `payment_order_id`, `payment_attempt_id`, `provider` |
| `050_tenant_payment_settings.sql` | Per-tenant payment config (disabled by default) |

**Not implemented (per scope):** `051_timeline_payment_events.sql`

Apply order: `047` → `048` → `049` → `050`, then `npm run db:sync` for Supabase CLI parity.

---

## 2. Payment Architecture Summary

- **Gateway layer:** checkout intent (`payment_orders`) + provider sessions (`payment_attempts`) + webhook audit (`payment_provider_events`).
- **Ledger layer:** existing `payments` table remains source of truth; gateway success inserts `source=gateway` rows.
- **Automation:** `booking_automation_mode=auto_on_deposit`, `confirm_on_deposit=false` — convert on capture, booking stays `draft`.
- **Events:** `payment.created`, `payment.completed`, `payment.failed`, `booking.created` via `emitAndDispatch()` (8C/8D).

---

## 3. Paymob Integration Summary

| Component | Path |
|-----------|------|
| Adapter | `src/lib/payments/paymob-adapter.ts` |
| Registry | `src/lib/payments/provider-registry.ts` |
| Webhook | `POST /api/webhooks/paymob` |

**Env (production):** `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_IFRAME_ID`, `PAYMOB_HMAC_SECRET`

**Sandbox / gate:** `PAYMOB_MOCK_MODE=true`, `PAYMOB_MOCK_WEBHOOKS=true`, `NEXT_PUBLIC_PAYMOB_MOCK_MODE=true` (portal test payment button)

**Stripe:** `StripeAdapter` stub only — throws on `createCheckoutSession()`.

---

## 4. Checkout Summary

| API | Description |
|-----|-------------|
| `POST /api/portal/quotations/[id]/checkout` | Accepted quotation only; server deposit amount |
| `GET /api/portal/payment-orders/[id]` | Status + attempts + ledger slice |

**Portal UI:** Pay Now on quotation detail; `/portal/payment-orders/[id]` status + receipt placeholder.

---

## 5. Webhook Security Report

| Control | Implementation |
|---------|----------------|
| Signature | Paymob HMAC-SHA512 (`verifyWebhook`) |
| Replay | UNIQUE `(provider, provider_event_id)` + order `completed` short-circuit |
| Audit | Immutable `payment_provider_events` |
| Amount tampering | Server compares `amount_cents` to `payment_orders.amount` |
| Mock gate | `PAYMOB_MOCK_WEBHOOKS` bypasses HMAC for CI only |

---

## 6. Booking Automation Report

On successful webhook:

1. `convertQuotationToBooking()` (system actor, `created_by` null)
2. Ledger `payments` insert (`method=card`, `source=gateway`)
3. `update_payment_status()` trigger updates booking `payment_status`
4. `payment.completed` + `booking.created` events → notification + email jobs (8D queue)

---

## 7. Testing Report

| Suite | Command |
|-------|---------|
| Unit | `npm run test:payments` |
| HTTP gate | `npm run gate:sprint9a:payments` (requires dev server + portal account + accepted quotation) |

Gate covers: checkout create, webhook complete, duplicate webhook, ledger row, cross-customer 404.

---

## 8. Production Readiness Assessment

| Area | Status | Notes |
|------|--------|-------|
| Migrations | **Required** | Apply 047–050 before deploy |
| Tenant enablement | **Manual** | `tenant_payment_settings.payments_enabled=true` |
| Paymob credentials | **Required** | Disable mock flags in production |
| Cron / worker | **Existing** | Run `POST /api/cron/process-dispatch-jobs` for email/notifications |
| CRM visibility | **Ready** | Gateway panel on quotation, booking, Customer 360 payments tab |
| Out of scope | **Honored** | Refunds UI, Stripe prod, installments, mobile SDK, timeline 051 |

**Recommendation:** Run `gate:sprint9a:payments` on staging after migrations and enabling payments for demo tenant.

---

## Key Files

```
database/migrations/047_payment_gateway_core.sql
database/migrations/048_payment_gateway_rls.sql
database/migrations/049_payment_ledger_link.sql
database/migrations/050_tenant_payment_settings.sql
src/lib/payments/*
src/app/api/portal/quotations/[id]/checkout/route.ts
src/app/api/portal/payment-orders/[id]/route.ts
src/app/api/webhooks/paymob/route.ts
src/app/portal/payment-orders/[id]/page.tsx
scripts/run-sprint9a-payment-gate.mjs
```
