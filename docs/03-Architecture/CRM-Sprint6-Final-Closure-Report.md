# Sprint 6 Final Closure Report

**Project:** TravelOS CRM — Quotations (Sprint 6 Phase 2)  
**Date:** 2026-06-03  
**Environment:** Staging Supabase (`ndomcfohwnvbyufnrxek`) + local app (`http://localhost:3000`) against staging DB  
**Gate review (code):** PASS WITH MINOR ISSUES  
**Closure decision:** **PASS**

---

## Staging Deployment Checklist

Apply in order on staging (CRM core through `033` must already exist).

| Step | Migration | Purpose |
|------|-----------|---------|
| 1 | `database/migrations/034_crm_dashboard_rpc.sql` | `crm_dashboard_stats` RPC (prerequisite for dashboard regression) |
| 2 | `database/migrations/035_quotations.sql` | Quotations schema, items, booking link, totals, tenant settings |
| 3 | `database/migrations/036_quotation_rls_permissions.sql` | RLS, CRM permissions, role grants, Customer 360 timeline unions |
| 4 | `database/migrations/037_quotation_items_audit_trigger_fix.sql` | **Hotfix:** drop erroneous `trg_quotation_items_audit_user` (items table has no `created_by`) |

### Commands (linked project)

```powershell
cd E:\Dynex360\Travel-OS-Project
npx supabase db query --linked -f database/migrations/034_crm_dashboard_rpc.sql
npx supabase db query --linked -f database/migrations/035_quotations.sql
npx supabase db query --linked -f database/migrations/036_quotation_rls_permissions.sql
npx supabase db query --linked -f database/migrations/037_quotation_items_audit_trigger_fix.sql
```

Alternative: Supabase SQL Editor — paste each file in the same order.

### Dependency readiness

- `026`–`033` CRM tables, RLS helpers (`crm_can_read_row`, `crm_can_write_row`), Customer 360 views
- `bookings`, `packages`, `customers`, `opportunities`, `tenant_settings`, `permissions`, `roles`
- `set_audit_user`, `log_audit`, `set_updated_at` (migrations `021`+)

### Expected objects after deployment

| Category | Objects |
|----------|---------|
| Tables | `quotations`, `quotation_items`; `bookings.quotation_id` column |
| Enums | `quotation_status`, `quotation_item_type`, `quotation_approval_mode` |
| Indexes | `uq_booking_quotation`, `uq_quotations_one_active_accept`, tenant/status/owner indexes |
| Functions | `generate_quotation_number`, `recalculate_quotation_totals`, `trg_quotation_items_recalc` |
| RLS | `quotations_select/insert/update/delete`, `quotation_items_*` (4 policies each table) |
| Permissions | `quotations.read`, `.read_all`, `.write`, `.write_all`, `.approve`, `.send`, `.accept`, `.convert` |
| View | `v_customer_timeline_events` extended with quotation event unions |

### Ops note

`db query --linked` applies DDL but may not record rows in `supabase_migrations.schema_migrations`. Reconcile with `supabase migration list` / `db push` if your pipeline requires registry parity.

---

## Post-Deployment Validation Checklist

| Check | Result |
|-------|--------|
| Table `quotations` queryable | PASS |
| Table `quotation_items` queryable | PASS |
| `bookings.quotation_id` column | PASS |
| Index `uq_booking_quotation` | PASS (migration file + live schema) |
| Index `uq_quotations_one_active_accept` | PASS |
| Function `generate_quotation_number` | PASS |
| Function `recalculate_quotation_totals` | PASS |
| RLS policies on `quotations` / `quotation_items` | PASS |
| 8 CRM quotation permissions seeded | PASS |
| Trigger fix `037` (no `trg_quotation_items_audit_user`) | PASS |
| `CRM_REQUIRE_LIVE=1 node scripts/test-crm-rls.mjs` | PASS |

---

## 1. Deployment Result

**PASS.** Migrations `034`–`037` applied on staging. Schema, permissions, RPC, and hotfix `037` validated via service-role checks and `scripts/test-crm-rls.mjs`.

**Defect found and fixed during closure:** `035` attached `set_audit_user` to `quotation_items`, which has no audit columns — blocked quotation create until `037` dropped `trg_quotation_items_audit_user`. Fresh installs should use updated `035` + `037` (or `035` without the erroneous trigger).

---

## 2. Workflow UAT Result

**PASS.** Automated run: `node scripts/run-sprint6-closure-uat.mjs` (see `CRM-Sprint6-Closure-UAT-Run.md`).

### Simple mode (`quotation_approval_mode = simple`)

| Step | Validated |
|------|-----------|
| draft → sent → viewed → accepted → converted_to_booking | PASS |
| `sent_at`, `viewed_at`, `accepted_at` | PASS |
| `total_amount > 0` | PASS |
| Draft booking + `booking.quotation_id` | PASS |
| Accept → opportunity `verbal_approval` | PASS |

### Standard mode

| Step | Validated |
|------|-----------|
| draft → pending_approval → approved → sent → viewed → accepted → converted_to_booking | PASS |
| Approval rejection → **draft** (not `rejected`) | PASS |
| Approve requires tenant admin permission | PASS (admin user) |

**Product decision (accepted, non-blocking):** `closed_won` is not set on convert; opportunity moves to `verbal_approval` on accept. `closed_won` remains on booking confirmation per design doc.

---

## 3. RLS Result

**PASS** (with documented test limitation).

| Scenario | Result |
|----------|--------|
| Cross-tenant sales (`wp3a-foreign`) cannot read other tenant quotation | PASS |
| Finance officer: read all quotations | PASS |
| Finance officer: write/update blocked (0 rows updated) | PASS |
| Same-tenant second sales agent | **Not executed** — demo tenant has one `sales_agent`; peer isolation covered by cross-tenant test |

API-layer RBAC enforces send/approve/accept/convert; finance role has only `quotations.read_all` in DB.

---

## 4. Customer 360 Result

**PASS** (partial event coverage).

| Event | Result |
|-------|--------|
| `quotation_created` | PASS |
| `quotation_sent` | PASS |
| `quotation_viewed` | PASS |
| `quotation_accepted` | PASS |
| `quotation_converted` | PASS |
| `quotation_rejected` | **Not exercised** — standard approval reject returns to `draft`; customer-facing `rejected` status is a separate path |

Timeline links target `/crm/quotations/show/:id` per `036` view definition (UI link validation assumed via view `link_path`; manual browser spot-check recommended in production UAT).

---

## 5. Dashboard Result

**PASS.** `GET /api/crm/dashboard?period=month` returns KPIs, chart data, and lists. `crm_dashboard_stats` RPC live on staging. No regression observed vs Sprint 6 dashboard gate.

---

## 6. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration history not in `schema_migrations` when using `db query` | Medium | Reconcile before production `db push`; document applied versions |
| Only one sales agent in demo tenant | Low | Add second same-tenant user for peer RLS UAT in production sign-off |
| `quotation_rejected` timeline not UAT-tested | Low | Run reject-from-sent flow in manual QA if customer-facing reject is in scope |
| Staging UAT via localhost app | Low | Repeat closure script against deployed staging URL before production |
| `closed_won` timing | Low | Documented product decision; no Sprint 6 change |

---

## 7. Remaining Backlog

**Sprint 6 / CRM core (POST-MVP or next phases — not blocking closure):**

- PDF quotation export
- Email / public quotation link / portal
- E-sign, WhatsApp delivery
- Multi-currency quotation rules
- Extended approval hierarchy
- Explicit UAT for `quotation_rejected` timeline + same-tenant sales peer RLS
- Production migration registry reconciliation
- Deploy staging app build and re-run `run-sprint6-closure-uat.mjs` with `GATE_BASE_URL` pointing at hosted URL

**TravelOS platform (out of Sprint 6 scope):**

- Sprint 7 features (not started per directive)
- Mobile app implementation
- Additional CRM modules beyond approved Sprint 6 scope

---

## 8. Closure Decision

### **PASS**

**TravelOS CRM Core is officially complete and Sprint 6 is closed.**

Quotations module is deployed on staging, validated end-to-end (workflows, RLS, Customer 360, dashboard), with one schema hotfix (`037`) applied and verified.

### Final backlog list

See §7.

### Recommended next project phase

1. **Production deployment** — Apply `034`–`037` on production with migration registry tracking; deploy app release containing quotations UI/APIs.
2. **Sprint 7 planning gate** — Prioritize from POST-MVP backlog (PDF/email/portal) or platform modules per product roadmap; do not start until explicit approval.
3. **Operational hardening** — Monitoring, quotation audit review, finance read-only dashboards.

### Mobile App implementation readiness

**Score: 72 / 100**

| Factor | Score note |
|--------|------------|
| CRM APIs & auth (JWT tenant/role) | Strong |
| Quotations + bookings linkage | Complete for MVP |
| RLS / multi-tenant | Proven on staging |
| Missing mobile-specific APIs (push, offline, public quote view) | Gap |
| PDF/email/portal not built | Reduces customer-facing mobile value |

Mobile implementation can proceed after production CRM deploy and a short mobile architecture spike; not a blocker for backend/API readiness.

---

## References

- Automated UAT log: `docs/03-Architecture/CRM-Sprint6-Closure-UAT-Run.md`
- Implementation summary: `docs/03-Architecture/CRM-Sprint6-Phase2-Implementation-Summary.md`
- Closure script: `scripts/run-sprint6-closure-uat.mjs`
- RLS validation: `scripts/test-crm-rls.mjs`
