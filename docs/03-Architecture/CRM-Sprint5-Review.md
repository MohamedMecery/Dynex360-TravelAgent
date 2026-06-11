# CRM Sprint 5 — Customer 360 Review

**Status:** Implementation complete. Migration `033` applied on staging. Gate report: [CRM-Sprint5-Gate-Report.md](./CRM-Sprint5-Gate-Report.md).  
**Scope:** Customer 360 only. Quotations (035–036), dashboard RPC (034), and AI features are **out of scope**.

---

## 1. Code summary

| Area | Files |
|------|--------|
| Migration | `database/migrations/033_crm_customer360_views.sql`, `supabase/migrations/033_crm_customer360_views.sql` |
| Timeline contract | `src/lib/crm/timeline-events.ts` (360 event types + bucket map) |
| Service | `src/lib/crm/customer-360-service.ts` |
| Types | `src/lib/crm/customer-360-types.ts` |
| Permissions | `src/lib/auth/customers-permissions.ts` |
| Validation | `src/lib/validation/customer-360.ts` |
| API | `GET /api/customers/[id]/360`, `GET /api/customers/[id]/360/timeline` |
| API client | `src/lib/crm/customer-360-api-client.ts` |
| UI | `src/app/customers/show/[id]/page.tsx`, `customer-360-*.tsx` |

**Behavior**

- Single aggregation endpoint with `Promise.all` for independent reads.
- Timeline preview: 15 events on Overview; full Timeline tab uses cursor pagination (default 50, max 200).
- Financial KPIs and Revenue tab omitted unless `canReadCustomer360Financial` (dashboard.financial or invoices.read + payments.read).
- Timeline partial failure: preview timeout returns empty preview + `TIMELINE_PARTIAL` warning (does not fail 360).
- Lead history tab **not** in Sprint 5 UI; timeline `lead_created` events only when `leads.customer_id` is set (view definition). No phone/email identity matching.
- Travel history view exists for future use; not exposed as a tab in Sprint 5 (bookings-based MVP in DB).

---

## 2. DB changes

### Migration `033_crm_customer360_views`

**Views**

1. **`v_customer_timeline_events`** — UNION of leads (customer_id), opportunities, stage history, activities (direction-aware event_type), bookings, invoices, payments, support_tickets. Excludes quotations.
2. **`v_customer_travel_history`** — Bookings aggregated by destination label + year (packages/destinations join).

**Grants:** `SELECT` to `authenticated` (RLS on underlying tables applies).

**Apply order:** After `030`–`032` on each environment.

---

## 3. API endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/customers/:id/360` | Session + `customers.read` |
| GET | `/api/customers/:id/360/timeline` | Session + `customers.read` |

### `GET /api/customers/:id/360`

Response: `{ data: Customer360Payload }` per wireframe (`timeline_preview`, `summary`, `tabs`, `meta.permissions`).

Financial fields in `summary` and `tabs.revenue` only when `dashboard.financial` (sales_agent excluded).

### `GET /api/customers/:id/360/timeline`

Query params:

| Param | Default | Max |
|-------|---------|-----|
| `limit` | 50 | 200 |
| `cursor` | — | base64url `{ occurred_at, id }` |
| `bucket` | `all` | `sales` \| `operations` \| `support` |

Response: `{ data: TimelineEvent[], meta: { limit, has_more, next_cursor, bucket } }`.

---

## 4. QA checklist

- [ ] Apply migration `033` on staging.
- [ ] Open `/customers/show/:id` — Overview loads with KPI strip and 15-event preview.
- [ ] Timeline tab: bucket filters, load more, stable `event_type` labels.
- [ ] Opportunities tab (sales_agent / tenant_admin with CRM read).
- [ ] Activities tab — direction on call/WhatsApp/email; event_type column for QA.
- [ ] Bookings / Invoices / Payments / Tickets tables link to show pages.
- [ ] **Finance gating:** sales_agent — no Revenue tab, no LCV/outstanding KPIs; finance_officer — Revenue tab visible.
- [ ] API: `GET /api/customers/:id/360` returns 404 for wrong tenant/id.
- [ ] API: timeline `limit=200` caps; `limit=201` or invalid cursor handled.
- [ ] `CRM_REQUIRE_LIVE=1 npm run test:crm-rls` still PASS after 033.
- [ ] Manual: 3+ event types on one customer timeline (e.g. activity + booking + stage change).

---

## 5. Performance notes

- Parallel fetches in `fetchCustomer360`; financial block runs only when permitted.
- Timeline list reads from `v_customer_timeline_events` (single query per page, no N+1).
- Tab lists capped at 50 rows each.
- Timeline preview uses 5s timeout with degraded empty preview.
- Target: P95 &lt; 3s on staging — validate with seeded customer having bookings + activities + opportunities.

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Large timeline per customer | Cursor pagination; 200 max page size |
| View not migrated | 360 timeline API fails until 033 applied |
| Payment `occurred_at` uses `payment_date` cast | Acceptable for MVP ordering |
| Outstanding balance = booked − paid (tenant-level pattern) | Documented; invoice-level allocation POST-MVP |

---

## 7. Open items (post–Sprint 5 gate)

Per product authorization — **do not start until Customer 360 QA + performance + API review complete:**

1. Sprint 6 — Quotations (`035`–`036`).
2. Migration `034` — CRM dashboard RPC.
3. Dedicated Lead history / Travel history tabs (POST-MVP if still desired).
4. Lead identity matching by email/phone (explicitly deferred).
5. Staging P95 measurement and payload size audit (&lt; 200 KB target).

---

## ERD impact (read-only)

No new tables. Read-only views over existing CRM + operations + support entities. Rollup fields `customers.activity_count` / `last_activity_at` (031) used in header without extra query.
