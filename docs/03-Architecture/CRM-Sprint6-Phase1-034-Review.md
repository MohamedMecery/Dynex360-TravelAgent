# Sprint 6 Phase 1 — `034_dashboard_rpc` Review

**Status:** IMPLEMENTED — pending staging migration apply + HTTP gate run  
**Sprint 5:** CLOSED (Customer 360 gate passed)  
**Phase 2 (035–036 quotations):** NOT STARTED (blocked until 034 validated)

---

## Scope

| In scope | Out of scope |
|----------|----------------|
| `crm_dashboard_stats` RPC | Quotations (035–036) |
| `GET /api/crm/dashboard` | Customer 360 changes |
| `/crm/dashboard` UI + i18n | AI, corporate accounts, supplier CRM |
| Financial gating (`dashboard.financial`) | Travel requests |

Spec: `CRM-Phase7-Implementation-Spec.md` §9.

---

## Deliverables

### Database

| Item | Path |
|------|------|
| Migration | `database/migrations/034_crm_dashboard_rpc.sql` |
| Supabase mirror | `supabase/migrations/034_crm_dashboard_rpc.sql` |
| Function | `public.crm_dashboard_stats(p_from, p_to, p_include_financial)` |

**Security:** `SECURITY DEFINER`, `has_crm_permission('dashboard.read')`, `current_tenant_id()`, owner scoping via `crm_can_read_row` / `crm_can_read_activity`.

**Financial:** `forecast_revenue`, `closed_revenue`, `revenue_forecast` chart omitted (null / empty) when `p_include_financial = false`.

### API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/crm/dashboard` | `crm.dashboard.read` |

Query: `period=month|quarter|custom`, optional `from`/`to` for custom.

Financial inclusion: `hasDashboardPermission(role, 'dashboard.financial')` → RPC flag.

Files: `src/app/api/crm/dashboard/route.ts`, `src/lib/crm/crm-dashboard-service.ts`, `src/lib/validation/crm-dashboard.ts`, `src/lib/crm/crm-dashboard-types.ts`.

### UI

| Route | Resource |
|-------|----------|
| `/crm/dashboard` | `crm-dashboard` |

Components: `src/app/crm/dashboard/page.tsx`, `src/components/crm/crm-dashboard-charts.tsx` (Recharts).

Access: `useCan({ resource: 'crm-dashboard', action: 'financial' })` for revenue KPIs/charts.

### i18n

- `messages/en.json` — `crmDashboard` namespace
- `messages/ar.json` — `crmDashboard` namespace

---

## Permission matrix (034)

| Role | `crm.dashboard.read` | `dashboard.financial` | Sees revenue KPIs |
|------|----------------------|------------------------|-------------------|
| tenant_admin | ✓ | ✓ | ✓ |
| finance_officer | ✓ | ✓ | ✓ |
| sales_agent | ✓ | ✗ | ✗ |
| super_admin | ✓ | ✓ | ✓ |

Operations dashboard (`GET /api/dashboard/stats`) unchanged.

---

## QA checklist

- [ ] Apply migration 034 on staging (pick one):
  - Supabase SQL Editor: paste `database/migrations/034_crm_dashboard_rpc.sql`
  - Or Supabase MCP `apply_migration` / `execute_sql`
  - Or fix CLI history then `npm run db:push` (remote uses timestamped CRM migration names; local `supabase/migrations/` may need repair — see `supabase migration repair` output from failed push)
- [ ] Verify: `node scripts/apply-034-dashboard-rpc.mjs`
- [ ] `npm run test:crm-rls` (includes 034 file + RPC existence)
- [ ] `CRM_REQUIRE_LIVE=1 npm run test:crm-rls` after push
- [ ] App running: `npm run build && npm run start` (or staging URL)
- [ ] `node scripts/run-sprint6-dashboard-gate-http.mjs`
- [ ] Manual: `/crm/dashboard` — month/quarter toggle, charts, overdue/stale links
- [ ] Manual: sales_agent — no forecast/closed revenue cards
- [ ] Manual: finance_officer — revenue cards + forecast chart visible
- [ ] `npm run typecheck`

---

## Performance targets (034 gate)

| Check | Target |
|-------|--------|
| `GET /api/crm/dashboard?period=quarter` | &lt; 2000 ms (warm) |
| Response size | &lt; 128 KB |

Automation: `scripts/run-sprint6-dashboard-gate-http.mjs` → `scripts/sprint6-dashboard-gate-http-results.json`.

---

## Risks

| Risk | Mitigation |
|------|------------|
| RPC not applied on staging | `test:crm-rls` + gate script 500 on dashboard route |
| Large tenants — slow aggregates | Single RPC round-trip; monitor gate timings |
| `sales_agent` owner scope hides peer KPIs | By design (same as leads/opportunities lists) |
| 7B closed revenue from quotations | Phase 2; 7A uses `closed_won` opportunity revenue |

---

## Open items

1. Run HTTP gate on staging and record timings in this doc.
2. Mark 034 **VALIDATED** in `CRM-Sprint5-Gate-Report.md` after gate PASS.
3. Phase 2 pre-coding package (quotations): ERD, lifecycle, API, permissions, booking conversion, timeline events, test plan — **before** 035 implementation.

---

## Code summary

- **New:** migration 034, CRM dashboard API/service/types/validation, CRM dashboard page + charts, `canReadCrmDashboard()`, access-control `crm-dashboard`, ar/en i18n, gate script, API.md section.
- **Fixed:** UI `useCan` resource `crm-dashboard` (was `dashboard`); chart labels use `leads.source.*` / `opportunities.stage.*`.
- **Unchanged:** Customer 360, operations dashboard, quotation tables.
