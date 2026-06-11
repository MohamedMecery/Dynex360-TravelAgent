# CRM Sprint 4 — QA Execution Report

**Date:** 2026-06-03  
**Environment:** Staging (Supabase remote)  
**Sprint 5:** Not started (per architecture approval)

---

## 1. Migration deployment

| Migration | Staging status | Notes |
|-----------|----------------|-------|
| `031_crm_stage_history_activity_rollups` | **Applied** | Table `opportunity_stage_history`, rollup columns, stage trigger, rollup trigger, RLS |
| `032_crm_activity_direction` | **Applied** | Enum `activity_direction`, column `activities.direction`, CHECK constraint |

Applied via Supabase MCP (`apply_migration`). Staging verification query confirmed:

- `opportunity_stage_history` exists
- `customers.activity_count`, `last_activity_at` exist
- `activities.direction` exists
- `trg_activities_rollups` exists

**Note:** Applied migrations are split across multiple MCP migration names on remote (`031_crm_stage_history_activity_rollups`, `031_crm_stage_history_triggers`, etc.). Local repo files remain single-file `031` / `032` for `db:push` alignment.

---

## 2. Automated validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `CRM_REQUIRE_LIVE=1 npm run test:crm-rls` | **PASS** (see below) |

### RLS script output (`scripts/test-crm-rls.mjs`)

```
PASS: migration files 025-032 present and opportunities has no package_id
PASS: tables leads, opportunities, activities exist
PASS: 13 CRM permissions seeded
PASS: role permission matrix (sales_agent, finance_officer, tenant_admin)
PASS: opportunities has no package_id column
PASS: table opportunity_stage_history exists
PASS: customers.activity_count / last_activity_at columns
PASS: activities.direction column (032)
```

---

## 3. Sprint 4 sign-off criteria (automated vs manual)

| # | Criterion | Automated | Manual UI (staging) |
|---|-----------|-----------|---------------------|
| 1 | Timeline View | API shape in code | ☐ Product QA |
| 2 | Upcoming View | — | ☐ |
| 3 | Overdue View | — | ☐ |
| 4 | My Activities View | — | ☐ |
| 5 | Lead Timeline Integration | — | ☐ |
| 6 | Opportunity Timeline Integration | — | ☐ |
| 7 | Stage History Integration | DB trigger applied | ☐ |
| 8 | RLS Verification | **PASS** (live) | — |
| 9 | Direction validation | DB CHECK applied | ☐ API 400 tests |
| 10 | Rollups | Triggers applied | ☐ Insert activity → count |

---

## 4. Manual QA script (recommended on staging app)

1. **Timeline:** `/crm/activities` → Timeline → confirm `event_type` labels (e.g. `activity.whatsapp.outgoing`).
2. **Upcoming / Overdue / My:** Switch tabs; confirm filters match open tasks and assignment.
3. **Lead show:** Log WhatsApp → timeline shows outgoing event; rollup on lead card updates.
4. **Opportunity show:** Change stage → `opportunity.stage_changed` appears in merged timeline.
5. **Direction:** Create call without direction → 400; meeting with direction → 400.
6. **Booking gate:** Create booking on `discovery` stage → 422; `verbal_approval` → success.

---

## 5. Customer 360 gate (Sprint 5)

| Deliverable | Status |
|-------------|--------|
| [CRM-Customer360-Wireframe.md](./CRM-Customer360-Wireframe.md) | **Ready for review** (8 sections) |
| [CRM-Migration-Numbering-Plan.md](./CRM-Migration-Numbering-Plan.md) | **Published** (033–036 renumbering) |
| Sprint 5 implementation | **Not started** |
| Quotations 7B | **Blocked** until Customer 360 approved |

---

## 6. Sign-off recommendation

| Area | Recommendation |
|------|----------------|
| Sprint 4 DB + RLS | **Ready** for product UI sign-off on manual checklist §4 |
| Sprint 5 | **Hold** until Customer 360 wireframe approved |
| Quotations | **Hold** until Customer 360 approved |
