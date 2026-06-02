# Bookings Module

**Version:** 1.1 — MVP + Booking Agent (Phase 5)  
**Module ID:** BKG  
**Last Updated:** 2026-06-02

---

## Purpose

Manage the full booking lifecycle from draft creation through confirmation, completion, or cancellation. Links customers to packages with travelers and line items.

## Business Processes

- Booking creation with customer + package selection
- Traveler and line item management
- Status workflow and payment status tracking

See [BusinessFlows.md](../02-Business/BusinessFlows.md) — Section 4.

## User Stories

| ID | Story |
|----|-------|
| US-BKG-001 | Create booking |
| US-BKG-002 | Add travelers |
| US-BKG-003 | Add line items |
| US-BKG-004 | Auto-calculate total |
| US-BKG-005 | Confirm booking |
| US-BKG-006 | Complete booking |
| US-BKG-007 | Cancel booking |
| US-BKG-008 | View status history |
| US-BKG-009 | Search bookings |
| US-BKG-010 | View payment status |

## Business Rules

- BR-003: Total = sum(line item quantity × unit price)
- BR-004: Payment status derived from payments vs total
- BR-008: Status transitions: draft → confirmed → completed; any → cancelled
- BR-009: Cancelled bookings reject new payments
- Reference number auto-generated: BKG-{tenant_slug}-{sequential}

## Database Tables

| Table | Description |
|-------|-------------|
| bookings | Core booking record |
| booking_items | Line items with pricing |
| booking_travelers | Passenger details |
| booking_status_history | Status change audit trail |

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /api/bookings | bookings.read | List bookings (filterable) |
| GET | /api/bookings/:id | bookings.read | Get booking detail |
| POST | /api/bookings | bookings.create | Create booking (draft) |
| PUT | /api/bookings/:id | bookings.update | Update booking |
| DELETE | /api/bookings/:id | bookings.delete | Soft delete booking |
| POST | /api/bookings/:id/confirm | bookings.confirm | Confirm booking |
| POST | /api/bookings/:id/complete | bookings.complete | Mark completed |
| POST | /api/bookings/:id/cancel | bookings.cancel | Cancel booking |
| GET | /api/bookings/:id/travelers | bookings.read | List travelers |
| POST | /api/bookings/:id/travelers | bookings.create | Add traveler |
| PUT | /api/bookings/:id/travelers/:travelerId | bookings.update | Update traveler |
| DELETE | /api/bookings/:id/travelers/:travelerId | bookings.delete | Remove traveler |
| GET | /api/bookings/:id/items | bookings.read | List line items |
| POST | /api/bookings/:id/items | bookings.create | Add line item |
| PUT | /api/bookings/:id/items/:itemId | bookings.update | Update line item |
| DELETE | /api/bookings/:id/items/:itemId | bookings.delete | Remove line item |
| GET | /api/bookings/:id/history | bookings.read | Status change history |

## Permissions

| Action | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|--------|:-----------:|:------------:|:-----------:|:---------------:|
| Create | Yes | Yes | Yes | No |
| Read | Yes | Yes | Yes | Yes |
| Update | Yes | Yes | Yes | No |
| Delete | Yes | Yes | No | No |
| Confirm/Cancel/Complete | Yes | Yes | Yes | No |
| Export | Yes | Yes | Yes | Yes |

## UI Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Booking List | /bookings | Filterable: status, customer, date range |
| Booking Create | /bookings/create | Select customer + package, add travelers/items |
| Booking Detail | /bookings/:id | Full detail: travelers, items, payments, history |
| Booking Edit | /bookings/:id/edit | Edit draft booking |

## Validation Rules

| Field | Rule |
|-------|------|
| customer_id | Required, must exist in tenant |
| package_id | Required, must be published |
| travel_date | Optional, must be future date for new bookings |
| line item quantity | Required, positive integer |
| line item unit_price | Required, non-negative decimal |
| traveler first_name | Required, max 100 chars |

## Error Handling

| Error | Code | Message |
|-------|------|---------|
| Package not published | 422 | Only published packages can be booked |
| Invalid status transition | 422 | Cannot transition from {from} to {to} |
| Cannot cancel | 422 | Booking cannot be cancelled in current status |

---

## AI Integration — Booking Agent (Phase 5)

**Approved** per [DECISIONS.md](../01-Product/DECISIONS.md) D-007.

### Capabilities

| Capability | Automation level | Notes |
|------------|------------------|-------|
| Package recommendations | Agent suggests | Read-only on `packages` |
| Create booking | Agent creates `draft` | Staff confirms via `POST .../confirm` |
| Update booking | Agent updates `draft` only | Reject if not draft |
| Cancel booking | Agent **proposes** | Staff executes cancel endpoint |
| Status lookup | Agent read-only | By `reference_number` |
| Traveler collection | Agent writes draft travelers | Validates required fields |

### API

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/ai/booking-agent | Chat completion + tool orchestration |

Implementation: `src/app/api/ai/booking-agent/route.ts`. Architecture: [AIArchitecture.md](../../ai/AIArchitecture.md).

### User stories

US-AI-BKG-001 through US-AI-BKG-005 — see [UserStories.md](../02-Business/UserStories.md).

### Guardrails

- BR-008 and BR-011 apply: no agent-confirmed bookings
- Agent cannot call payment endpoints
- All writes include `tenant_id` from JWT
