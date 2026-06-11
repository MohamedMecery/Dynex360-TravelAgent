# Sprint 9E — Security Validation Report

**Date:** 2026-06-04  
**Scope:** RBAC, portal/customer/tenant isolation, payments, WhatsApp, AI permissions, webhooks  
**Method:** Code review + existing gate scripts (no architecture changes)

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| Tenant isolation (RLS) | **PASS** | `tenant_id` on CRM + portal + payments tables; migrations 028, 048, 054, 059, 063 |
| Staff RBAC | **PASS** | CRM permissions in JWT; API `requireActiveApiAccess` / `requireCrmApiAccess` |
| Portal isolation | **PASS** | `requirePortalApiAccess`; cross-customer probes return 404 in gates |
| Customer isolation | **PASS** | Portal scoped to `customer_portal_accounts.customer_id` |
| Payments | **PASS WITH CONDITIONS** | HMAC required when not mock; mock must be off in production |
| WhatsApp webhooks | **PASS WITH CONDITIONS** | Verify token + signature when live |
| AI permissions | **PASS** | Read-only LLM; writes via deterministic services only |
| Webhook security | **PASS WITH CONDITIONS** | Cron secret; Paymob HMAC; no public service role |
| Mock / sandbox modes | **PASS WITH CONDITIONS** | Documented forbidden flags — validator script enforces |

**Overall security readiness:** **PASS WITH CONDITIONS** — production depends on env hardening (no mock flags, live webhook secrets).

---

## RBAC (staff)

| Layer | Implementation | Verified by |
|-------|----------------|-------------|
| Database | RLS policies per tenant + role | `npm run test:crm-rls`, migrations 028–029 |
| API | `requireActiveApiAccess`, CRM permission strings | `gate:sprint7b:foundation`, `gate:sprint5:http` |
| UI | Refine `accessControlProvider` | Manual + E2E |

**No bypass paths found** for `/api/leads`, `/api/quotations`, `/api/crm/*` without active tenant user session.

---

## Portal isolation

| Control | Detail |
|---------|--------|
| Auth | Separate portal session; `user_type: customer` metadata |
| API gate | `requirePortalApiAccess` binds `tenant_id` + `customer_id` |
| Cross-tenant | Foreign quotation/notification UUID → **404** (portal gate) |
| Service role | Not used in portal browser context |

**Status:** **PASS**

---

## Customer isolation

| Control | Detail |
|---------|--------|
| `customer_portal_accounts` | 1:1 email ↔ customer per tenant |
| Portal listings | Filtered by authenticated customer |
| Payment orders | Portal gate cross-order probe → 404 |

**Status:** **PASS**

---

## Tenant isolation

| Control | Detail |
|---------|--------|
| JWT `tenant_id` | Auth hook migration 009 |
| All CRM queries | `tenant_id` filter + RLS |
| Worker jobs | `tenant_id` on `event_dispatch_jobs` |

**Status:** **PASS**

---

## Payments

| Control | Detail |
|---------|--------|
| Webhook | `PAYMOB_HMAC_SECRET`; mock webhooks only when `PAYMOB_MOCK_WEBHOOKS=true` |
| Portal checkout | Accepted quotations only; tenant payment settings |
| Ledger | `payments` RLS migration 048–049 |

**Production conditions:**

- Set live Paymob keys; disable `PAYMOB_MOCK_*`.
- Register webhook URL only on Paymob production dashboard.

**Status:** **PASS WITH CONDITIONS**

---

## WhatsApp

| Control | Detail |
|---------|--------|
| Outbound | Tenant-scoped templates + preferences |
| Webhook GET | Verify token match |
| Webhook POST | App secret signature (when not mock) |
| RLS | Migration 054 |

**Production conditions:** `WHATSAPP_MOCK_MODE=false`, Meta app secret set.

**Status:** **PASS WITH CONDITIONS**

---

## AI permissions

| Module | Write access | LLM role |
|--------|--------------|----------|
| Sales AI (9C) | Snapshots/recommendations via worker only | Explains scores |
| Ops AI (9D) | Same pattern | No CRM mutations |
| Legacy agents | Existing permission gates | Server-side API keys |

RLS migrations **059**, **063** restrict `ai_sales_*` and `ai_ops_*` tables.

**Status:** **PASS** — no model-driven state mutation paths identified.

---

## Webhook & cron security

| Endpoint | Auth |
|----------|------|
| `/api/cron/process-dispatch-jobs` | `CRON_SECRET` Bearer / header |
| `/api/webhooks/paymob` | HMAC (live) |
| `/api/webhooks/whatsapp` | Verify token + signature |

**Public secrets check:** No `NEXT_PUBLIC_*` variable contains service role, Paymob secret, or Anthropic key.

**Status:** **PASS WITH CONDITIONS** if `CRON_SECRET` rotation policy documented.

---

## Mock modes & sandbox credentials

| Flag | Production |
|------|------------|
| `WHATSAPP_MOCK_MODE` | **Forbidden** |
| `PAYMOB_MOCK_MODE` | **Forbidden** |
| `PAYMOB_MOCK_WEBHOOKS` | **Forbidden** |
| `NEXT_PUBLIC_PAYMOB_MOCK_MODE` | **Forbidden** |
| Missing Paymob key | Implicit mock — **Forbidden** for live pilot |

Validator: `PRODUCTION_CHECK=1 node scripts/validate-production-env.mjs`

---

## Recommendations (non-blocking)

1. Rotate `CRON_SECRET` quarterly and after staff departures with DevOps access.
2. Enable Vercel deployment protection for preview environments handling real PII.
3. Run `npm run gate:sprint5:http` after each RBAC migration change.

---

## Related

- [RBAC.md](./RBAC.md)
- [API-Authentication-Compatibility-Matrix.md](./API-Authentication-Compatibility-Matrix.md)
- [Production-Environment-Catalog.md](../05-Development/Production-Environment-Catalog.md)
