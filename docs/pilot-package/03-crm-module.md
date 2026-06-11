# TravelOS CRM Module

**Scope:** Leads, opportunities, activities, Customer 360, quotations, CRM dashboard  
**Migrations:** `025`–`038` (core), `036` (quotations RLS/permissions)  
**Last updated:** 2026-06-04

---

## Module overview

The CRM module manages the sales pipeline from first contact through quotation and handoff to revenue (bookings). It reuses the platform `customers` entity (no separate CRM customer table). All entities are tenant-scoped with owner-based RLS for sales agents and read-all access for finance.

---

## Leads

### Purpose

Capture inbound and outbound sales inquiries before they become qualified opportunities or customers. Track source, destination interest, budget, and contact history.

### User workflow

1. Sales agent creates lead (or imports from channel).
2. Assigns owner (default: self); may reassign (tenant_admin or write_all).
3. Logs activities (calls, WhatsApp, meetings).
4. Qualifies lead → updates status through pipeline (`new` → `contacted` → `qualified` → …).
5. Converts to **customer** (`POST /api/leads/:id/convert-customer`) and/or **opportunity** (`convert-opportunity`).
6. Marks `won` / `lost` with optional `lost_reason`.

### Business rules

| Rule | Description |
|------|-------------|
| Ownership | `owner_id` drives RLS for sales_agent (`crm.leads.read` vs `read_all`) |
| Customer link | `customer_id` set on convert; enables Customer 360 timeline |
| Duplicate email | `UNIQUE (tenant_id, email)` where email present and not deleted |
| Soft delete | `deleted_at` hides from lists; number uniqueness preserved |
| Lead number | Auto-generated per tenant (`lead_number`) |

### Validation rules

| Field | Validation |
|-------|------------|
| `full_name` | Required, max 200 chars |
| `pax_count` | Integer > 0 |
| `email` | Format validation; duplicate check API `POST /api/leads/check-duplicate` |
| `source` | Enum: whatsapp, website, facebook, instagram, tiktok, referral, walk_in, phone_call, other |
| `status` | Enum: new, contacted, qualified, proposal_sent, negotiation, won, lost |

### Permissions

| Action | super_admin / tenant_admin | sales_agent | finance_officer |
|--------|:--------------------------:|:-----------:|:---------------:|
| List/read own | ✓ | ✓ | — |
| List/read all | ✓ | — | ✓ |
| Create/update own | ✓ | ✓ | — |
| Manage all | ✓ | — | — |
| Convert / assign | ✓ | ✓ (own) | — |

Permission strings: `crm.leads.read`, `crm.leads.read_all`, `crm.leads.write`, `crm.leads.write_all`.

---

## Opportunities

### Purpose

Track deal progression, revenue forecast, and linkage to quotations and bookings. One lead may spawn multiple opportunities over time.

### User workflow

1. Create from lead or standalone (customer optional until linked).
2. Set stage (`discovery` → `proposal` → `negotiation` → `verbal_approval` → `closed_won` / `closed_lost`).
3. Update probability, expected close date, estimated revenue.
4. Attach quotations; single active `accepted` quotation per opportunity policy.
5. Create booking from opportunity when stage allows (`POST /api/opportunities/:id/create-booking`).

### Business rules

| Rule | Description |
|------|-------------|
| No package FK | Opportunities do not reference `packages` directly (quotation lines may) |
| Stage history | `opportunity_stage_history` records transitions |
| Booking creation | Sales may create booking at `verbal_approval` or `closed_won`; admin may override other stages |
| Forecast | `GET /api/opportunities/forecast` aggregates pipeline |

### Validation rules

| Field | Validation |
|-------|------------|
| `probability` | 0–100 |
| `pax_count` | > 0 |
| `stage` | Enum per migration `025` |
| `opportunity_number` | Unique per tenant |

### Permissions

| Action | super_admin / tenant_admin | sales_agent | finance_officer |
|--------|:--------------------------:|:-----------:|:---------------:|
| Read/write own | ✓ | ✓ | — |
| Read all | ✓ | — | ✓ |
| Create booking | ✓ | ✓ (stage rules) | — |

Strings: `crm.opportunities.read`, `crm.opportunities.read_all`, `crm.opportunities.write`, `crm.opportunities.write_all`.

---

## Activities

### Purpose

Unified task and interaction log tied to lead, opportunity, and/or customer. Supports calls, WhatsApp, email, meetings, tasks.

### User workflow

1. Create activity from lead/opportunity/customer context.
2. Set type, status, due date, assignee (`assigned_to`).
3. Complete or cancel; direction tracked for WhatsApp (`incoming` / `outgoing`).
4. Rollups update parent `last_contacted_at` / `last_whatsapp_at` on leads.

### Business rules

| Rule | Description |
|------|-------------|
| Polymorphic link | At least one of lead_id, opportunity_id, customer_id required |
| WhatsApp logging | `POST /api/leads/:id/log-whatsapp` creates activity + timestamps |
| Timeline | Activities appear in Customer 360 timeline view |

### Validation rules

| Field | Validation |
|-------|------------|
| `activity_type` | call, whatsapp, email, meeting, task |
| `activity_status` | open, in_progress, completed, cancelled |
| `direction` | Required semantics for whatsapp type |

### Permissions

`crm.activities.read`, `crm.activities.read_all`, `crm.activities.write`, `crm.activities.write_all` — same pattern as leads.

---

## Customer 360

### Purpose

Single-pane view of a customer’s sales and revenue history: profile, timeline, quotations, bookings, payments, communication preferences, AI strips (sales + operations).

### User workflow

1. Open customer from CRM or search (`GET /api/customers/:id/360`).
2. Review timeline buckets (sales vs operations events).
3. Drill into quotations, bookings, gateway payments, WhatsApp history.
4. Edit communication preferences (admin/sales with customer update permission).

### Business rules

| Rule | Description |
|------|-------------|
| Timeline source | View `v_customer_timeline_events` unions leads, opportunities, quotations, activities, bookings, payments |
| Tenant scope | Same RLS as underlying tables |
| Portal separation | Portal users see subset via portal APIs only |

### Validation rules

- Standard customer CRUD validations apply on profile edits.
- Communication preferences: opt-in/out timestamps, quiet hours, preferred language (`en` / `ar`).

### Permissions

- Customer read: `customers.read` (all roles with CRM access).
- Customer update: `customers.update` (not finance_officer).
- Timeline: `GET /api/customers/:id/360/timeline`.
- Gateway payments tab: staff with quotation/booking read + payment read.

---

## Quotations

### Purpose

Formal priced proposals linked to opportunity and customer. Supports approval workflow, customer send, acceptance, and conversion to booking (manual or via portal payment automation).

### User workflow

1. Create quotation (draft) with line items (package, hotel, flight, visa, etc.).
2. Submit for approval if tenant uses **standard** mode (`pending_approval`).
3. Approver accepts (`crm.quotations.approve`) → `approved`.
4. Send to customer (`POST /api/quotations/:id/send`) → `sent`; emits `quotation.sent` domain event.
5. Customer views in portal → `viewed`; accepts/rejects in portal or staff accepts.
6. Convert to booking (`convert`) or portal checkout triggers automation.

### Status lifecycle

```
draft → pending_approval → approved → sent → viewed → accepted | rejected | expired
                                              ↓
                                    converted_to_booking
```

**Portal visibility:** only `sent`, `viewed`, `accepted`, `rejected`, `expired`, `converted_to_booking` (not draft/internal).

### Business rules

| Rule | Description |
|------|-------------|
| Approval modes | `simple` (skip pending) vs `standard` (manager approval) |
| Single accepted quote | Assert no conflicting active accepted quotation per opportunity |
| Expiry | Expired quotations return `422 QUOTATION_EXPIRED` on accept |
| Owner RLS | Same owner/read_all pattern as leads |
| Send side effects | Email + async WhatsApp job when configured |

### Validation rules

| Area | Rules |
|------|-------|
| Line items | Positive quantities and amounts; item type enum |
| Totals | Server-calculated from items |
| Reject | Optional reason via `quotationRejectSchema` |
| Send | Only from approved (or simple-mode eligible) states |

### Permissions

| Permission | tenant_admin | sales_agent | finance_officer |
|------------|:------------:|:-----------:|:---------------:|
| quotations.read / write | ✓ | ✓ (own) | read_all only |
| quotations.approve | ✓ | — | — |
| quotations.send | ✓ | ✓ | — |
| quotations.accept | ✓ | ✓ | — |
| quotations.convert | ✓ | ✓ | — |

---

## CRM Dashboard

### Purpose

Pipeline KPIs, charts, and action lists for sales management (distinct from legacy `GET /api/dashboard/stats` booking dashboard).

### User workflow

1. Open `/crm/dashboard`.
2. Select period: month, quarter, or custom date range.
3. Review KPIs (leads, opportunities, quotations, conversion).
4. Financial charts visible only with `dashboard.financial` (tenant_admin, finance_officer).

### Business rules

- Data from RPC / service aggregations (`GET /api/crm/dashboard`).
- Respects tenant and CRM read permissions.
- Operations widgets (at-risk bookings) may link to Operations AI data.

### Permissions

- Required: `crm.dashboard.read`.
- Financial slice: `dashboard.financial`.

---

## API reference (CRM subset)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/leads` | List/create |
| GET/PATCH/DELETE | `/api/leads/:id` | Detail/update |
| POST | `/api/leads/:id/assign` | Reassign owner |
| POST | `/api/leads/:id/convert-customer` | Create/link customer |
| POST | `/api/leads/:id/convert-opportunity` | Spawn opportunity |
| POST | `/api/leads/check-duplicate` | Email duplicate check |
| GET/POST | `/api/opportunities` | Pipeline |
| GET/PATCH | `/api/opportunities/:id` | Detail |
| GET | `/api/opportunities/:id/stage-history` | Stage audit |
| POST | `/api/opportunities/:id/create-booking` | Booking from deal |
| GET | `/api/opportunities/forecast` | Forecast |
| GET/POST | `/api/activities` | Activities |
| GET/PATCH/DELETE | `/api/activities/:id` | Activity detail |
| GET/POST | `/api/quotations` | Quotations |
| GET/PATCH | `/api/quotations/:id` | Detail |
| POST | `/api/quotations/:id/send` | Send to customer |
| POST | `/api/quotations/:id/accept` | Staff accept |
| POST | `/api/quotations/:id/reject` | Staff reject |
| POST | `/api/quotations/:id/convert` | Manual convert |
| GET/POST | `/api/quotations/:id/items` | Line items |
| POST | `/api/quotations/:id/submit-approval` | Approval workflow |
| POST | `/api/quotations/:id/approve` | Approve |
| GET | `/api/customers/:id/360` | Customer 360 |
| GET | `/api/customers/:id/360/timeline` | Timeline events |
| GET | `/api/crm/dashboard` | CRM dashboard |

---

## Related documents

- [13-business-workflows.md](./13-business-workflows.md)
- [04-portal-module.md](./04-portal-module.md)
- [docs/03-Architecture/CRM-Phase7-Implementation-Spec.md](../03-Architecture/CRM-Phase7-Implementation-Spec.md)
