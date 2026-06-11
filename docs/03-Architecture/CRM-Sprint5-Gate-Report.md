# CRM Sprint 5 — Final Gate Report

**Date:** 2026-06-03  
**Environment:** Staging Supabase (`dynex360-travel`) + local app (`http://localhost:3099`, production build)  
**Sprint 5 status:** **CLOSED**  
**Sprint 6 authorization:** **GRANTED** — `034_dashboard_rpc`, `035_quotations`, `036_quotation_rls_permissions`

---

## Gate checklist

| # | Activity | Status | Evidence |
|---|----------|--------|----------|
| 1 | Apply migration `033_crm_customer360_views` | **PASS** | Applied on staging via Supabase MCP. Live RLS script confirms views. |
| 2 | Customer 360 manual UI QA (9 tabs × 3 roles) | **PASS** | Playwright `e2e/customer360-gate.spec.ts` — project `gate`, 3 roles. Results: `scripts/sprint5-gate-results.json`. |
| 3 | API security validation | **PASS** | Cross-tenant `404`, unknown customer `404`, RLS blocks foreign JWT row read. HTTP + Playwright. |
| 4 | Performance validation (`GET /api/customers/:id/360`) | **PASS** | Small/medium/heavy under 3s and under 200 KB. See §4. |
| 5 | Worst-case timeline test | **PASS** | Seeded customer `00000000-00ea-4000-8000-000000000001` (240 view events). `GET .../360/timeline?limit=200` — 863ms, 72 KB, 200 rows. |
| 6 | Live RLS validation | **PASS** | `CRM_REQUIRE_LIVE=1 npm run test:crm-rls` |
| 7 | Financial gating (`dashboard.financial`) | **PASS** | `sales_agent` → no financial; `finance_officer` / `tenant_admin` → financial. HTTP + Playwright UI. |

---

## 1. Migration 033

- Migration: `033_crm_customer360_views`
- Files: `database/migrations/033_crm_customer360_views.sql`, `supabase/migrations/033_crm_customer360_views.sql`
- Views: `v_customer_timeline_events`, `v_customer_travel_history` (no quotation events)

---

## 2. Customer 360 UI QA

**Method:** Playwright gate suite against `/customers/show/00000000-00ea-4000-8000-000000000001` (heavy seed).

| Role | Tabs verified | Financial gating |
|------|---------------|------------------|
| `sales_agent` | Overview, Timeline, Opportunities, Activities, Bookings, Invoices, Payments, Support tickets | Revenue tab hidden; LCV/outstanding hidden |
| `finance_officer` | All 9 tabs including Revenue | LCV visible |
| `tenant_admin` | All 9 tabs including Revenue | LCV visible |

**Also verified:** Timeline bucket filter (Sales), `event_type` badges, Load more on heavy customer.

**Command:** `E2E_SKIP_WEBSERVER=1 npx playwright test e2e/customer360-gate.spec.ts --project=gate`

---

## 3. API security validation

| Check | Result |
|-------|--------|
| Foreign tenant (`wp3a-foreign@demo.travelos.local`) → home-tenant customer `00000000-0005-4000-8000-000000000001` | **404** |
| Unknown customer `00000000-0000-4000-8000-000000000099` (tenant admin) | **404** |
| RLS: foreign JWT `select` on `customers` for home-tenant ID | **No row** |

**Command:** `node scripts/run-sprint5-gate-http.mjs` (see `scripts/sprint5-gate-http-results.json`)

---

## 4. Performance audit — `GET /api/customers/:id/360`

Measured with warmed server (tenant admin), staging DB:

| Profile | Customer ID | Response time | Payload | Timeline preview |
|---------|-------------|---------------|---------|------------------|
| Small | `00000000-0005-4000-8000-000000000004` | 1057ms | 2 KB | 2 events |
| Medium | `00000000-0005-4000-8000-000000000007` | 1053ms | 3 KB | 4 events |
| Heavy | `00000000-00ea-4000-8000-000000000001` | 1661ms | 70 KB | 15 preview rows |

**Targets:** P95 &lt; 3s, payload &lt; 200 KB — **PASS** for all profiles.

**Optimization applied during gate:** `computeFinancialSummary` reuses booking rows from the initial 360 fetch (removes duplicate full-bookings query).

---

## 5. Worst-case timeline — `GET /api/customers/:id/360/timeline?limit=200`

**Seed:** `node scripts/sprint5-gate-seed-heavy-customer.mjs`

| Metric | Value |
|--------|-------|
| Seeded entities | 100 activities, 50 bookings, 50 payments, 20 invoices, 20 tickets |
| View event count (`v_customer_timeline_events`) | 240 |
| Query duration | 826ms |
| Payload size | 72 KB |
| Returned rows | 200 |

---

## 6. Live RLS & automated gate scripts

```text
CRM_REQUIRE_LIVE=1 npm run test:crm-rls          → PASS
node scripts/validate-customer360-gate.mjs     → PASS
node scripts/sprint5-gate-seed-heavy-customer.mjs → PASS
node scripts/run-sprint5-gate-http.mjs         → PASS
E2E_SKIP_WEBSERVER=1 npx playwright test e2e/customer360-gate.spec.ts --project=gate → 7/7 PASS
```

**Full gate pipeline:** `npm run test:sprint5-gate` (seed + HTTP + Playwright UI)

---

## Test accounts (staging)

| Role | Email |
|------|-------|
| sales_agent | `wp3a-sales@demo.travelos.local` |
| finance_officer | `wp3a-finance@demo.travelos.local` |
| tenant_admin | `eng.m.mecery@gmail.com` |
| foreign (cross-tenant) | `wp3a-foreign@demo.travelos.local` |

Password: `TravelOS@2026` (or `GATE_TEST_PASSWORD`)

---

## Confirmed exclusions (unchanged)

- Quotations (035–036) — not started until Sprint 6 execution  
- Dashboard RPC (034) — authorized, not started  
- AI features — not started  
- Identity matching — not implemented  
- Lead History / Travel History **UI tabs** — not implemented  

---

## Sprint 6 authorization

With all gate items **PASS**, the following are **authorized to begin**:

1. `034_dashboard_rpc`  
2. `035_quotations`  
3. `036_quotation_rls_permissions`

**Recorded by:** Automated gate run 2026-06-03 (HTTP + Playwright + RLS).
