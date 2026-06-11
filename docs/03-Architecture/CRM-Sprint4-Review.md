# CRM Sprint 4 — Review & Sign-Off

Review Activity UX before starting Sprint 5 (Customer 360).  
**Prerequisite:** Migrations `031` and `032` applied on staging.  
**QA report:** [CRM-Sprint4-QA-Report.md](./CRM-Sprint4-QA-Report.md) (deployed 2026-06-03; RLS live **PASS**).

**Quotations (7B):** Do not start until [CRM-Customer360-Wireframe.md](./CRM-Customer360-Wireframe.md) is approved.

---

## Pre–Sprint 4 (Sprint 3 amendments — included)

| Item | Implementation |
|------|----------------|
| Opportunity stage history | `opportunity_stage_history` + trigger |
| Create-booking stage gate | `verbal_approval`, `closed_won` only |
| Tenant-admin override | `?admin_override=true` on create-booking |
| Activity rollups | `activity_count`, `last_activity_at` on leads, opportunities, customers |

---

## Sprint 4 scope (this release)

| Item | Implementation |
|------|----------------|
| Activity direction | `incoming` / `outgoing` for call, WhatsApp, email (migration `032`) |
| Stable timeline `event_type` | `src/lib/crm/timeline-events.ts` + `GET /api/activities?view=timeline` returns `TimelineEvent[]` |
| Activities CRUD | API + `/crm/activities` UI |
| Views | Timeline, Upcoming, Overdue, My Activities |
| Lead timeline | `CrmTimeline` on lead show |
| Opportunity timeline | `CrmTimeline` + merged stage history (`opportunity.stage_changed`) |

---

## Sign-off criteria

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | **Timeline View** | `/crm/activities` → Timeline tab; API `view=timeline` returns `format: timeline_events` with stable `event_type` |
| 2 | **Upcoming View** | Open/in_progress, `due_date >= now`, sorted by due date |
| 3 | **Overdue View** | Open/in_progress, `due_date < now` |
| 4 | **My Activities View** | Scoped to `assigned_to = current user` |
| 5 | **Lead Timeline Integration** | Lead show → timeline with activity events + direction labels |
| 6 | **Opportunity Timeline Integration** | Opportunity show → activities + stage changes in one timeline |
| 7 | **Stage History Integration** | Stage changes appear as `opportunity.stage_changed` events |
| 8 | **RLS Verification** | `npm run test:crm-rls` (live) passes; finance read-all / sales own-row unchanged |
| 9 | **Direction validation** | Create call without direction → 400; meeting with direction → 400 |
| 10 | **Rollups** | After logging activity, `activity_count` / `last_activity_at` update on related lead/opp/customer |

### Direction QA (call / WhatsApp / email)

- [ ] Create incoming WhatsApp → `event_type: activity.whatsapp.incoming`
- [ ] Create outgoing call → `event_type: activity.call.outgoing`
- [ ] Meeting/task have `direction` null in DB
- [ ] WhatsApp quick-log on lead defaults to **outgoing**

---

## API reference

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/activities?view=timeline` | Returns `TimelineEvent[]` |
| GET | `/api/activities?view=upcoming\|overdue\|my` | Returns `CrmActivity[]` |
| POST/PATCH | `/api/activities` | `direction` required for call/whatsapp/email |
| GET | `/api/opportunities/:id/stage-history` | Used by opportunity timeline merge |

---

## Before Sprint 5

1. Complete sign-off table above on staging.
2. Review and approve [CRM-Customer360-Wireframe.md](./CRM-Customer360-Wireframe.md).
3. Product sign-off on Activity UX (list density, timeline labels, create form).

**Approved for Sprint 5 (Customer 360)** when criteria 1–10 pass and Customer 360 wireframe is signed off.
