# CRM Sprint 3 — Review (pre–Sprint 4)

Review completed before starting Activities (Sprint 4). Use this checklist in QA.

---

## 1. Opportunity API

| Endpoint | Permission | Notes |
|----------|------------|--------|
| `GET /api/opportunities` | `crm.opportunities.read` / `read_all` (RLS) | Filters: `stage`, `owner_id`, `lead_id`, `search`, pagination |
| `POST /api/opportunities` | `crm.opportunities.write` | No `package_id` in body or table |
| `GET/PATCH/DELETE /api/opportunities/:id` | read / write (+ owner scope) | Soft delete |
| `GET /api/opportunities/forecast` | `crm.dashboard.read` | Open stages only |
| `POST /api/opportunities/:id/create-booking` | `crm.opportunities.write` + bookings role | See §3 |

**Lead convert:** `POST /api/leads/:id/convert-opportunity` copies `lead_source`, `preferred_contact_channel`, `whatsapp`, `pax_count` onto the opportunity (migration `030`).

---

## 2. Forecast calculations

- **Scope:** Opportunities where `stage IN (discovery, proposal, negotiation, verbal_approval)` and `deleted_at IS NULL`.
- **Weighted amount per row:** `estimated_revenue × (probability / 100)` (null revenue → 0).
- **Total:** Sum of weighted amounts (`total_weighted`).
- **Series:** Bucketed by `expected_close_date` → `YYYY-MM` (month) or `YYYY-Qn` (quarter); rows without close date → `unscheduled`.
- **Currency:** Taken from last processed row (tenant should use consistent currency in MVP).

**Verify:** Seed 2 open opps with known revenue/probability; `GET /api/opportunities/forecast?period=month` total matches manual sum.

---

## 3. Booking conversion flow

`POST /api/opportunities/:id/create-booking`

| Mode | Body | Behavior |
|------|------|----------|
| **Package** | `{ "package_id": "uuid", "travel_date?", "travelers?", "notes?" }` | `buildDraftPreview` + `executeCreateDraft`; sets `bookings.opportunity_id` |
| **Custom** | `{ "line_items": [{ description, quantity, unit_price }], ... }` | `bookings.package_id = NULL`, inserts `booking_items`; default line from opp if omitted |

** Preconditions:**

- Opportunity must have `customer_id` (convert lead → customer first).
- Custom mode requires `line_items` **or** defaults from `estimated_revenue` / `pax_count`.
- Draft only (`status: draft`); redirect `/bookings/edit/:id`.

**Schema (030):** `bookings.package_id` nullable; `opportunities` still has **no** `package_id`.

---

## 4. Sprint 2 adjustments (included)

| Requirement | Implementation |
|-------------|----------------|
| Exact duplicate → 409 | `EXACT_DUPLICATE_LEAD` — email or full phone digit match |
| Possible duplicate → warning | Last-10 phone match only; save allowed; `meta.possible_duplicates` |
| Health labels | `healthy`, `needs_follow_up`, `critical` |
| Create Opportunity primary | First primary button on lead quick actions; navigates to opp show |
| No `package_id` on opportunities | Unchanged |

---

## 5. Sign-off gate for Sprint 4

- [ ] Forecast total matches manual calculation on staging
- [ ] Package create-booking opens draft with package pricing
- [ ] Custom create-booking has `package_id` null and ≥1 booking_item
- [ ] Convert lead preserves source/channel/whatsapp/pax on opportunity row
- [ ] RLS: sales_agent sees own opps only; finance_officer read_all

Approved to proceed to **Sprint 4 (Activities)** when the above pass on staging.
