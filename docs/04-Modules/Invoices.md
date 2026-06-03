# Invoices Module

**Version:** 1.0 — MVP  
**Module ID:** INV  
**Last updated:** 2026-06-03

---

## Purpose

Issue **financial header documents** linked to bookings for billing, deposits, and partial charges. MVP stores amounts on the invoice row only — **no `invoice_items` table**. Commercial line detail lives on **`booking_items`** (see [Glossary.md](../01-Product/Glossary.md) D-011).

## Business processes

- Finance creates one or more invoices per booking (D-005: **1 booking → N invoices**)
- Subtotal prefilled from **sum of `booking_items.total_price`** when creating an invoice (fallback: `bookings.total_amount`)
- Tax and total: `total_amount = subtotal + tax_amount` (DB constraint)
- Payments may optionally reference an invoice (`payments.invoice_id` optional, D-004)

See [BusinessFlows.md](../02-Business/BusinessFlows.md) — finance / invoicing flows.

---

## User stories (MVP)

| ID | Story |
|----|-------|
| US-INV-001 | List invoices for the tenant |
| US-INV-002 | Create invoice for a booking with prefilled subtotal |
| US-INV-003 | Edit invoice status, dates, tax, notes |
| US-INV-004 | View invoice linked to booking reference |
| US-INV-005 | Soft-delete invoice (tenant_admin / finance) |
| US-INV-006 | Record payment against booking (with optional invoice link) — Payments module |

---

## Business rules

| Rule | Description |
|------|-------------|
| BR-INV-001 | `booking_id` required; booking must not be `cancelled` for new invoices (UI filter) |
| BR-INV-002 | `invoice_number` generated per tenant (trigger / app) — unique per tenant |
| BR-INV-003 | `total_amount` must equal `subtotal + tax_amount` |
| BR-INV-004 | Subtotal on create defaults to **Σ booking_items.total_price**; if no lines, use `bookings.total_amount` |
| BR-INV-005 | Multiple invoices allowed per booking (deposits, partial bills) |
| BR-INV-006 | No autonomous invoice creation by AI agents in MVP |

**Line snapshot (D-012):**

| Invoice status | UI behavior |
|----------------|-------------|
| `draft` | Show page loads **live** `booking_items` for the linked booking |
| `issued` and later | `line_items_snapshot` JSONB frozen at first transition to `issued` (DB trigger); UI shows frozen lines only |

No `invoice_items` table. Snapshot is immutable once set.

**POST-MVP:** Dedicated `invoice_items` table (if multi-version PDF needed); PDF export; auto-issue on booking confirm.

---

## Database tables

| Table | Description |
|-------|-------------|
| `invoices` | Header: subtotal, tax, total, status, dates, `booking_id`, `line_items_snapshot` (JSONB, set at issue) |
| `bookings` | Parent operational record |
| `booking_items` | Source of truth for commercial lines (not copied to invoice in MVP) |
| `payments` | Optional `invoice_id` |

Migration: `database/migrations/004_bookings_finance.sql`.

---

## API / data access (MVP)

Admin UI uses **Supabase client + RLS** via Refine (no dedicated REST module yet).

| Resource | Operations | RBAC |
|----------|------------|------|
| `invoices` | list, create, read, update, soft delete | `invoices.*` — finance_officer, tenant_admin; sales read-only |

---

## Permissions

| Action | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|--------|:-----------:|:------------:|:-----------:|:---------------:|
| Create | Yes | Yes | No | Yes |
| Read | Yes | Yes | Yes | Yes |
| Update | Yes | Yes | No | Yes |
| Delete | Yes | Yes | No | No |

---

## UI screens

| Screen | Route | Description |
|--------|-------|-------------|
| Invoice list | `/invoices` | All tenant invoices with booking ref |
| Create invoice | `/invoices/create` | Select booking; subtotal from line items; tax + status |
| Create (from booking) | `/invoices/create?booking_id={uuid}` | Preselects booking |
| Invoice detail | `/invoices/show/:id` | Amounts, status, booking link, **read-only `booking_items` snapshot**, audit metadata |
| Edit invoice | `/invoices/edit/:id` | Dates, tax, status, notes |

---

## Validation rules

| Field | Rule |
|-------|------|
| booking_id | Required, UUID, booking exists in tenant |
| subtotal | ≥ 0 |
| tax_amount | ≥ 0 |
| total_amount | = subtotal + tax_amount |
| issue_date / due_date | due_date ≥ issue_date when both set |
| status | `invoice_status` enum |

---

## Implementation notes

- Subtotal helper: `src/lib/invoices/booking-subtotal.ts`
- Invoice create UI: `src/app/invoices/create/page.tsx`
- Line snapshot: migration `022_invoice_line_snapshot.sql`; parser `src/lib/invoices/line-items-snapshot.ts`
- Invoice line snapshot UI: `src/components/invoices/invoice-booking-line-items.tsx`
- Product glossary: [Glossary.md](../01-Product/Glossary.md)

---

## Related modules

- [Bookings.md](./Bookings.md) — `booking_items`, status workflow  
- [Payments.md](./Payments.md) — optional `invoice_id` on payment  
- [Customers.md](./Customers.md) — invoice customer via booking → customer  
