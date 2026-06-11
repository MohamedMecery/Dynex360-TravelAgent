# Customer 360 — Architecture Review (Sprint 5 Gate)

**Status:** Approved — Sprint 5 implemented (see [CRM-Sprint5-Review.md](./CRM-Sprint5-Review.md)).  
**Risk:** Highest-value CRM surface; aggregates sales, operations, finance, and support in one view.  
**Quotations (7B):** Blocked until this document is approved. See [CRM-Migration-Numbering-Plan.md](./CRM-Migration-Numbering-Plan.md).

| Document | Purpose |
|----------|---------|
| This file | Wireframe, tabs, API contract, performance |
| [CRM-Phase7-Implementation-Spec.md](./CRM-Phase7-Implementation-Spec.md) §10 | Normative spec |
| [CRM-Sprint4-Review.md](./CRM-Sprint4-Review.md) | Activities/timeline prerequisites (done) |

---

## Approval checklist (required sign-off)

| # | Section | Product | Engineering |
|---|---------|---------|-------------|
| 1 | Header KPI layout | ☐ | ☐ |
| 2 | Overview tab | ☐ | ☐ |
| 3 | Timeline tab | ☐ | ☐ |
| 4 | Opportunities tab | ☐ | ☐ |
| 5 | Activities tab | ☐ | ☐ |
| 6 | Revenue tab | ☐ | ☐ |
| 7 | Performance considerations | ☐ | ☐ |
| 8 | API contract review | ☐ | ☐ |

**Approved for Sprint 5 implementation:** ☐ Product  ☐ Engineering  **Date:** ___________

---

## Route & permissions

| Item | Value |
|------|--------|
| Route | `/customers/show/:id` (enhance existing page; no new route) |
| API | `GET /api/customers/:id/360` |
| Auth | Supabase session + `requireActiveApiAccess` |
| Base | `customers.read` (existing module) |
| CRM sections | `crm.leads.read` / `read_all`, `crm.opportunities.read` / `read_all`, `crm.activities.read` / `read_all` as needed per tab |
| Financial KPIs / Revenue tab | `dashboard.financial` **or** `invoices.read` + `payments.read` (finance_officer pattern) |
| Mutations | None on 360 load — links to existing create/edit flows |

---

## 1. Header KPI layout

Persistent header above tabs (desktop: two rows; mobile: stacked).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Initials]  Jane Doe · Individual                    [Edit customer] [⋯]    │
│ email · phone · company (corporate) · preferred channel badge                 │
│ Subline: Activity count 12 · Last activity 2 Jun 2026 14:30 · Customer since │
├──────────────────────────────────────────────────────────────────────────────┤
│ KPI strip (4 cards, equal width)                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ Bookings    │ │ Open opps   │ │ Lifetime    │ │ Outstanding │  *financial  │
│ │      4      │ │      1      │ │ revenue     │ │ balance     │              │
│ │ confirmed 2 │ │ weighted $  │ │ $12,400     │ │ $800        │              │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### KPI definitions

| Card | Source | Visible when |
|------|--------|--------------|
| **Bookings** | `COUNT(bookings)` where `customer_id`, `deleted_at` null; subtitle: confirmed count | Always |
| **Open opportunities** | `COUNT(opportunities)` stage ∉ (`closed_won`,`closed_lost`); subtitle: sum weighted pipeline (optional) | `crm.opportunities.read*` |
| **Lifetime revenue** | `SUM(payments.amount)` completed, tenant currency | Financial permission |
| **Outstanding** | `SUM(invoices.total - paid)` open invoices | Financial permission |

### Header data sources

| Field | Source |
|-------|--------|
| `activity_count`, `last_activity_at` | `customers` columns (migration `031` rollups) — **no extra query** |
| Identity | `customers` + `customer_contacts` primary |
| Quick actions | Edit → `/customers/edit/:id`; Log activity → `/crm/activities/create?customer_id=` |

**UX rule:** KPI cards are read-only; clicking a card switches to the relevant tab (Bookings → Bookings tab, etc.).

---

## 2. Overview tab (default)

**Purpose:** Single-screen answer: “Who is this customer and what happened recently?”

### Layout

```
┌─ Timeline preview (max 15 events) ─────────────────────────────────────────┐
│ [All] [Sales] [Operations] [Support]     [View full timeline →]            │
│ ● activity.whatsapp.outgoing — Follow-up package          2 Jun 14:30       │
│ ● opportunity.stage_changed — Proposal → Verbal approval  1 Jun 09:00     │
│ ● booking_created — BK-2026-000142                          28 May 16:20    │
└────────────────────────────────────────────────────────────────────────────┘
┌─ Contacts (50%) ────────────────┐ ┌─ Addresses (50%) ─────────────────────┐
│ Name · role · phone · email    │ │ Billing / shipping / other             │
└────────────────────────────────┘ └────────────────────────────────────────┘
┌─ Notes (full width) ───────────────────────────────────────────────────────┐
│ customers.notes                                                           │
└────────────────────────────────────────────────────────────────────────────┘
```

### Behaviour

- Timeline preview uses same `TimelineEvent[]` shape as Timeline tab (cap 15, `occurred_at DESC`).
- “View full timeline” switches to **Timeline** tab (or deep-link `?tab=timeline`).
- Contacts/addresses: existing customer detail sub-resources (read-only list).
- No quotations block in MVP (POST-MVP when 7B approved).

---

## 3. Timeline tab (dedicated)

**Purpose:** Full chronological history across CRM + operations + support.

### Layout

```
┌─ Filters ──────────────────────────────────────────────────────────────────┐
│ Bucket: [All] [Sales] [Operations] [Support]                                │
│ Type:   [multi-select event_type groups — optional POST-MVP]                │
│ Range:  [Last 90 days ▼] [Custom from/to — POST-MVP]                        │
└────────────────────────────────────────────────────────────────────────────┘
┌─ Virtualized list (infinite scroll or paginated) ──────────────────────────┐
│ [icon] Incoming WhatsApp — Subject line                    2 Jun 2026 14:30  │
│        event_type: activity.whatsapp.incoming · ref: activities/:id         │
│ [icon] Stage change — Discovery → Proposal                 1 Jun 2026 09:00  │
│        event_type: opportunity.stage_changed                                 │
│ ...                                                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

### Stable `event_type` contract

Aligned with Sprint 4 `src/lib/crm/timeline-events.ts` plus 360-only types:

| event_type | Source table | Filter bucket |
|------------|--------------|---------------|
| `activity.call.incoming` / `.outgoing` | activities | Sales |
| `activity.whatsapp.incoming` / `.outgoing` | activities | Sales |
| `activity.email.incoming` / `.outgoing` | activities | Sales |
| `activity.meeting` | activities | Sales |
| `activity.task` | activities | Sales |
| `lead_created` | leads | Sales |
| `opportunity_created` | opportunities | Sales |
| `opportunity.stage_changed` | opportunity_stage_history | Sales |
| `booking_created` | bookings | Operations |
| `invoice_created` | invoices | Operations |
| `payment_received` | payments | Operations |
| `ticket_created` | support_tickets | Support |
| `quotation_sent` / `quotation_accepted` | quotations | Sales — **7B only, omit until approved** |

**Row shape (mandatory):**

```typescript
interface TimelineEvent {
  id: string;
  event_type: string; // stable dotted identifiers above
  title: string;
  occurred_at: string; // ISO8601
  ref_table: string;
  ref_id: string;
  meta: Record<string, unknown>;
}
```

**Sort:** `occurred_at DESC`.  
**Merge:** Server-side in API (parallel queries → merge → sort → slice for preview on Overview).

---

## 4. Opportunities tab

**Purpose:** Pipeline attached to this customer.

### Table columns

| Column | Source |
|--------|--------|
| Opp # | `opportunity_number` |
| Stage | `stage` badge |
| Destination | `destination_text` |
| Est. revenue | `estimated_revenue` + currency |
| Probability | `probability` % |
| Expected close | `expected_close_date` |
| Owner | `users.full_name` |
| Last activity | `last_activity_at` (rollup) |

### Actions

- Row click → `/crm/opportunities/show/:id`
- Create opportunity (if `crm.opportunities.write`) → `/crm/opportunities/create?customer_id=` — **POST-MVP** if create form lacks prefill

### Query

```sql
opportunities WHERE customer_id = :id AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 50
```

---

## 5. Activities tab

**Purpose:** Task and communication log for this customer only.

### Layout

- Reuse `/crm/activities` list patterns: sub-filters **Upcoming | Overdue | All | Timeline** scoped to `customer_id`.
- Primary CTA: **Log activity** → `/crm/activities/create?customer_id=:id` (direction required for call/WhatsApp/email per `032`).

### Table columns

| Column | Notes |
|--------|-------|
| Subject | Link to show |
| Type | activity_type badge |
| Direction | incoming/outgoing or — |
| Status | open / completed / … |
| Due | due_date |
| Assigned | user name |
| Event type | Read-only `event_type` from mapper (for QA) |

### API

Prefer dedicated slice from 360 payload `tabs.activities` (max 50) **plus** client refresh via `GET /api/activities?customer_id=&view=…` when user changes sub-filter (avoids full 360 reload).

---

## 6. Revenue tab (permission-gated)

**Visible only** when user has financial permission (`dashboard.financial` or finance_officer invoice/payment reads).

### Sections

```
┌─ Summary cards ─────────────────────────────────────────────────────────────┐
│ Lifetime revenue | YTD revenue | Outstanding | Avg booking value           │
└────────────────────────────────────────────────────────────────────────────┘
┌─ Invoices (table) ──────────────────────────────────────────────────────────┐
│ number · booking ref · status · total · paid · due date → link show         │
└────────────────────────────────────────────────────────────────────────────┘
┌─ Payments (table) ──────────────────────────────────────────────────────────┐
│ reference · amount · method · date · invoice link                           │
└────────────────────────────────────────────────────────────────────────────┘
```

### Rules

- Read-only — no inline payment capture on 360.
- Currency: tenant default; multi-currency POST-MVP.
- Users without permission: tab hidden; KPI cards 3–4 hidden; API omits `summary.total_revenue`, `summary.outstanding_balance`.

---

## 7. Performance considerations

### Risk

360 loads **10+ relations** per customer. Unbounded timeline merge is the primary latency and memory risk.

### Mitigations (MVP — required in implementation)

| Strategy | Detail |
|----------|--------|
| **Single API, server parallel** | `Promise.all` for independent queries; 5s total timeout with partial degrade |
| **Timeline cap** | Overview preview: 15 events; Timeline tab: paginate `?timeline_page=1&limit=50` |
| **No N+1** | Batch owner names via `IN (...)` or join in SQL views |
| **DB views** | `033_crm_customer360_views.sql`: `v_customer_timeline_events` pre-union for hot paths (see numbering plan) |
| **Indexes** | Existing: `bookings.customer_id`, `activities.related_customer_id`, `opportunities.customer_id` |
| **Caching** | `Cache-Control: private, max-age=0` — always fresh; optional SWR client stale 30s |
| **Payload budget** | Target &lt; 200 KB JSON; trim `meta` on list rows |
| **Financial queries** | Run only if `canReadFinancial(user)` |

### Degraded mode

If timeline sub-query fails, return `timeline: []` + `meta.warnings: [{ code: "TIMELINE_PARTIAL", message: "..." }]` — do not fail entire 360.

### POST-MVP

- Materialized view refresh for timeline
- Server-side Redis cache per `customer_id` (tenant-scoped, 60s TTL)
- Virtualized timeline (@tanstack/react-virtual)

---

## 8. API contract review

### Endpoint

`GET /api/customers/:id/360`

| Item | Value |
|------|--------|
| Permission | `customers.read` + per-section CRM reads |
| Errors | 404 customer; 403 forbidden; 401 auth |
| Response | `{ data: Customer360Payload }` |

### TypeScript shape (normative for Sprint 5)

```typescript
interface Customer360Payload {
  customer: Customer;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  summary: {
    booking_count: number;
    confirmed_booking_count: number;
    open_opportunity_count: number;
    activity_count: number;
    last_activity_at: string | null;
    total_revenue?: number | null;      // omitted without financial perm
    outstanding_balance?: number | null;
    currency: string;
  };
  tabs: {
    bookings: BookingSummary[];
    invoices: InvoiceSummary[];
    payments: PaymentSummary[];
    tickets: SupportTicketSummary[];
    activities: CrmActivity[];
    leads: LeadSummary[];
    opportunities: Opportunity[];
    travel_history: TravelHistoryRow[];
  };
  timeline: TimelineEvent[];
  timeline_preview: TimelineEvent[]; // first 15, duplicate of slice — OR client slices
  meta?: {
    warnings?: { code: string; message: string }[];
    permissions: {
      financial: boolean;
      crm_write_activity: boolean;
      crm_write_opportunity: boolean;
    };
  };
}
```

### Query params (Timeline tab pagination)

| Param | Default | Description |
|-------|---------|-------------|
| `timeline_limit` | 50 | Max events |
| `timeline_offset` | 0 | Pagination |
| `timeline_bucket` | `all` | `sales` \| `operations` \| `support` \| `all` |

### List response consistency

- Activities in 360 use **raw** `CrmActivity[]` (includes `direction`).
- Timeline uses **`TimelineEvent[]`** only — never mix types in one array.
- Aligns with `GET /api/activities?view=timeline` (`format: timeline_events`).

### Error format

Existing project standard: `{ error: { code, message, details } }`.

### Non-goals for this endpoint

- No mutations (POST/PATCH)
- No quotation data until 7B approved
- No Customer 360 export/PDF (POST-MVP)

---

## Secondary tabs (MVP, lighter spec)

| Tab | MVP content |
|-----|-------------|
| Bookings | Table → booking show |
| Invoices | Table → invoice show |
| Payments | Table → payment show |
| Support tickets | Table → ticket show |
| Lead history | Leads where `customer_id` OR identity match (email/phone) — read-only |
| Travel history | Rows from `v_customer_travel_history` (migration `033`) |

---

## Tab order (navigation)

`Overview` · `Timeline` · `Opportunities` · `Activities` · `Bookings` · `Invoices` · `Payments` · `Tickets` · `Lead history` · `Travel history` · `Revenue`*

\*Revenue last and conditionally rendered.

---

## Implementation sequence (after approval)

1. Migration `033_crm_customer360_views` + `034_crm_dashboard_rpc` (see numbering plan)
2. `GET /api/customers/:id/360` service + Zod schema
3. Enhance `customers/show/[id]` with tab shell + KPI header
4. Wire Timeline tab to shared `CrmTimeline` / server timeline
5. QA: 3+ event types on timeline, financial gating, &lt;3s p95 on staging seed

**Sprint 5 code is not started** until approval checkboxes above are signed.
