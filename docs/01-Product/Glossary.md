# TravelOS Product Glossary (D-011)

**Status:** Approved  
**Last updated:** 2026-06-03

This glossary clarifies MVP financial and catalog terms for sales, finance, and engineering.

---

## Package

A **sellable travel product** curated by the agency: title, destination, itinerary, pricing tiers (adult/child/infant), and publish workflow (`draft` → `published` → `archived`).

- **Not** a generic “service catalog” of flights/hotels (POST-MVP).
- Bookings reference one primary `package_id` plus optional custom line items.

---

## Booking

An operational reservation for a customer: status workflow (`draft` → `confirmed` → `completed` / `cancelled`), travelers, travel dates, and payment status aggregated on the booking.

---

## booking_items (line items)

**Invoice-style lines inside the booking** — the commercial breakdown of what is being sold:

| Field | Meaning |
|-------|---------|
| `description` | Line label (package tier, add-on, fee) |
| `quantity` | Count |
| `unit_price` | Price per unit |
| `total` | `quantity × unit_price` (stored/calculated) |

`bookings.total_amount` is derived from line items (and triggers). This is the **source of truth** for what the customer owes on the booking.

---

## Invoice (MVP)

A **financial header document** linked to a booking:

- Fields: `subtotal`, `tax_amount`, `total_amount`, `currency`, `status`, `due_date`
- **No `invoice_items` table in MVP** — line detail lives on `booking_items`
- **1 booking → N invoices** (D-005): deposits, partial bills, add-on charges

When creating an invoice in the UI, subtotal may be prefilled from `booking.total_amount`. On the invoice show page, **draft** invoices show live `booking_items`; when status becomes **`issued`**, commercial lines are copied once into `invoices.line_items_snapshot` (JSONB, D-012). PDF export is POST-MVP.

---

## Payment

Cash-in recorded against a booking; `invoice_id` is optional (D-004). Finance officers create payments; agents do not.

---

## Quick reference

```text
Package (catalog product)
    └── Booking (operational record)
            ├── booking_items (commercial lines)
            ├── Invoice(s) (billing headers, N per booking)
            └── Payment(s) (cash-in)
```

---

## Related decisions

- [DECISIONS.md](./DECISIONS.md) — D-004, D-005
- [Bookings.md](../04-Modules/Bookings.md)
- [DatabaseDesign.md](../03-Architecture/DatabaseDesign.md)
