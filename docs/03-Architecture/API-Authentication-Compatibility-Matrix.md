# API Authentication Compatibility Matrix

**Sprint:** 7B + 8A–9D (updated 9E)  
**Implementation:** `createApiClient()` + `requireActiveApiAccess()` + `requirePortalApiAccess()`  
**Date:** 2026-06-04

## Summary

| Classification | Count | Notes |
|----------------|-------|-------|
| **READY** | 60+ | Staff CRM, portal, payments, webhooks (scoped auth) |
| **PARTIAL** | 2 | Public health; cron (secret header) |
| **NOT READY** | 0 | — |

After Sprint 7B, all authenticated API routes accept **cookie** and **Bearer** via the shared gate. Middleware no longer HTML-redirects `/api/*`.

## Legend

| Column | Meaning |
|--------|---------|
| Cookie | Next.js SSR Supabase session cookies |
| Bearer | `Authorization: Bearer <access_token>` |
| Mobile | Suitable for Expo client without cookie jar |
| Changes | Sprint 7B delta |

## Route matrix

| Route | Methods | Cookie | Bearer | Mobile | Status | Changes |
|-------|---------|--------|--------|--------|--------|---------|
| `/api/health/supabase` | GET | — | — | N/A | **PARTIAL** | Public; no auth |
| `/api/auth/me` | GET | ✓ | ✓ | ✓ | **READY** | **New** |
| `/api/auth/onboarding` | POST | ✓ | ✓ | ✓ | **READY** | Uses `createApiClient` |
| `/api/leads` | GET, POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/leads/:id` | GET, PATCH, DELETE | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/leads/:id/assign` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/leads/:id/health` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/leads/check-duplicate` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/leads/:id/convert-opportunity` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/leads/:id/convert-customer` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/leads/:id/log-whatsapp` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/opportunities` | GET, POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/opportunities/:id` | GET, PATCH, DELETE | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/opportunities/forecast` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/opportunities/:id/stage-history` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/opportunities/:id/create-booking` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/activities` | GET, POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/activities/:id` | GET, PATCH, DELETE | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/quotations` | GET, POST | ✓ | ✓ | ✓ | **READY** | `requireCrmApiAccess` → gate |
| `/api/quotations/:id` | GET, PATCH, DELETE | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/quotations/:id/*` (workflow) | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/quotations/:id/items` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/quotations/:id/items/:itemId` | PATCH, DELETE | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/crm/dashboard` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/customers/:id/360` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/customers/:id/360/timeline` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/bookings` | GET | ✓ | ✓ | ✓ | **READY** | **New** |
| `/api/bookings/:id` | GET | ✓ | ✓ | ✓ | **READY** | **New** |
| `/api/bookings/:id/status` | PATCH | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/dashboard/stats` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/users` | GET | ✓ | ✓ | ✓* | **READY** | `requireUsersApiAccess` → gate |
| `/api/users/assignees` | GET | ✓ | ✓ | ✓ | **READY** | **New** |
| `/api/users/:id` | GET, PUT, DELETE | ✓ | ✓ | ✓* | **READY** | Admin permissions |
| `/api/users/invite` | POST | ✓ | ✓ | ✓* | **READY** | Admin permissions |
| `/api/ai/booking-agent` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/ai/support-agent` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/ai/knowledge-agent` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/ai/analytics` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/ai/analytics/export` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/ai/feedback` | POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/knowledge/documents` | GET, POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/knowledge/documents/:id` | DELETE, POST | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/invoices/:id/pdf` | GET | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/support-tickets/:id` | PATCH | ✓ | ✓ | ✓ | **READY** | Shared gate |
| `/api/crm/dashboard` | GET | ✓ | ✓ | ✓ | **READY** | CRM KPIs |
| `/api/crm/operations/metrics` | GET | ✓ | ✓ | ✓ | **READY** | Ops dashboard |
| `/api/crm/operations/widgets` | GET | ✓ | ✓ | ✓ | **READY** | Ops AI widgets |
| `/api/crm/sales-insights` | GET | ✓ | ✓ | ✓ | **READY** | Sales AI |
| `/api/crm/operations-insights` | GET | ✓ | ✓ | ✓ | **READY** | Ops AI |
| `/api/portal/dashboard` | GET | — | ✓ | ✓ | **READY** | `requirePortalApiAccess` |
| `/api/portal/quotations` | GET | — | ✓ | ✓ | **READY** | Portal Bearer |
| `/api/portal/quotations/:id/accept` | POST | — | ✓ | ✓ | **READY** | Portal Bearer |
| `/api/portal/quotations/:id/checkout` | POST | — | ✓ | ✓ | **READY** | Payments |
| `/api/portal/payment-orders/:id` | GET | — | ✓ | ✓ | **READY** | Portal Bearer |
| `/api/portal/notifications` | GET | — | ✓ | ✓ | **READY** | Portal Bearer |
| `/api/portal/bookings` | GET | — | ✓ | ✓ | **READY** | Portal Bearer |
| `/api/webhooks/paymob` | POST | — | — | N/A | **READY** | HMAC / mock flag (server) |
| `/api/webhooks/whatsapp` | GET, POST | — | — | N/A | **READY** | Verify token + signature |
| `/api/cron/process-dispatch-jobs` | POST | — | — | N/A | **PARTIAL** | `CRON_SECRET` only |

\* Mobile compatible transport; **403** if role lacks `users.*` (assignees endpoint is the sales-safe alternative).

\*\* Portal routes use **portal customer JWT** only — staff cookies are not accepted for `/api/portal/*`.

## Middleware

| Path | Sprint 7B behavior |
|------|-------------------|
| `/api/**` | Pass-through (locale cookie only); no redirect to `/login` |
| App pages | Unchanged — cookie session + active account gate |

## Verification

```bash
npm run test:auth-bearer
GATE_BASE_URL=http://localhost:3000 npm run gate:sprint7b:foundation
npm run gate:portal
npm run gate:commercial
npm run gate:production-matrix
```

Results: `scripts/sprint7b-foundation-gate-results.json`, `scripts/commercial-journey-gate-results.json`, `scripts/production-verification-matrix.json`
