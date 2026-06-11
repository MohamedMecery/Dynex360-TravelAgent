# CRM Migration Numbering Plan

**Status:** Approved recommendation (Sprint 4 architecture sign-off).  
**Problem:** Original Phase 7 pre-implementation package reserved `030`–`033` for Customer 360 views, dashboard RPC, and **quotations**. Implementation reused `030` for opportunity context and added `031`/`032` for Sprint 3–4 CRM features.

---

## Current state (applied on staging)

| File | Purpose | Original plan ID |
|------|---------|------------------|
| `025`–`029` | CRM 7A core | As planned |
| `030_crm_opportunity_context.sql` | Lead fields on opportunities, nullable `bookings.package_id` | Was `030_crm_customer360_views` |
| `031_crm_stage_history_activity_rollups.sql` | Stage history, activity rollups | Was `031_crm_dashboard_rpc` |
| `032_crm_activity_direction.sql` | `activity_direction` enum + CHECK | Was `032_quotations.sql` |

**Do not renumber applied migrations** on staging/production. Record names in `supabase_migrations.schema_migrations` must stay stable.

---

## Renumbered plan for **future** migrations only

| New ID | Planned name | Was (original) | Sprint |
|--------|--------------|----------------|--------|
| **033** | `033_crm_customer360_views.sql` | 030 | 5 — Customer 360 |
| **034** | `034_crm_dashboard_rpc.sql` | 031 | 5 — CRM dashboard |
| **035** | `035_quotations.sql` | 032 | 7B — Quotations |
| **036** | `036_quotation_rls_permissions.sql` | 033 | 7B — Quotations RLS |

### Gates

1. **Customer 360 wireframe approved** → implement `033` + `034` + application (Sprint 5).
2. **Customer 360 shipped on staging** → quotations work may start (`035`–`036` + 7B app).

### Documentation updates required when 033 ships

- `CRM-Phase7-Pre-Implementation-Package.md` §2 migration table (addendum, not rewrite history)
- `CRM-Phase7-Implementation-Spec.md` §3 migration list
- This file — mark 033+ as applied

---

## Local / new environment bootstrap order

```
025 → 029 → 030 → 032 → 031
```

Apply `032` before `031` only on **empty** databases if `031` backfill runs on activities without `direction` yet — on existing staging, order is already `031` then `032` (completed).

For **fresh** clones after both exist, use sequential file order: `030`, `031`, `032`.
