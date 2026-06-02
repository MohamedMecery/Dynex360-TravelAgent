# Payments Module

**Version:** 1.0 — MVP  
**Module ID:** PAY

---

## Purpose

Record and track payments against bookings. Automatically updates booking payment status. Manual payment recording for MVP (no payment gateway).

## Business Processes

- Payment recording against confirmed bookings
- Overpayment prevention
- Payment status auto-update on booking

See [BusinessFlows.md](../02-Business/BusinessFlows.md) — Section 5.

## User Stories

| ID | Story |
|----|-------|
| US-PAY-001 | Record payment |
| US-PAY-002 | Select payment method |
| US-PAY-003 | Enter reference number |
| US-PAY-004 | Auto-update payment status |
| US-PAY-005 | View payment history |
| US-PAY-006 | List all payments |
| US-PAY-007 | Prevent overpayment |

## Business Rules

- BR-004: Payment status: unpaid (0), partial (>0, <total), paid (≥ total)
- BR-005: Cancelled bookings cannot receive payments
- BR-006: Total payments cannot exceed booking total

## Database Tables

| Table | Description |
|-------|-------------|
| payments | Payment records linked to bookings |
| payment_transactions | Transaction log for each payment |

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /api/payments | payments.read | List payments (filterable) |
| GET | /api/payments/:id | payments.read | Get payment detail |
| POST | /api/payments | payments.create | Record payment |
| PUT | /api/payments/:id | payments.update | Update payment |
| DELETE | /api/payments/:id | payments.delete | Soft delete payment |
| GET | /api/bookings/:id/payments | payments.read | Payments for a booking |

## Permissions

| Action | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|--------|:-----------:|:------------:|:-----------:|:---------------:|
| Create | Yes | Yes | No | Yes |
| Read | Yes | Yes | Yes | Yes |
| Update | Yes | Yes | No | Yes |
| Delete | Yes | Yes | No | No |
| Export | Yes | Yes | No | Yes |

## UI Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Payment List | /payments | Filterable: date, method, booking |
| Record Payment | /bookings/:id/payments/new | Form: amount, method, date, reference |
| Payment Detail | /payments/:id | Payment info with booking link |

## Validation Rules

| Field | Rule |
|-------|------|
| booking_id | Required, must exist, not cancelled |
| amount | Required, positive decimal |
| method | Required, enum: cash, bank_transfer, card, other |
| payment_date | Required, valid date |
| reference_number | Optional, max 100 chars |

## Error Handling

| Error | Code | Message |
|-------|------|---------|
| Overpayment | 422 | Payment would exceed booking total. Outstanding: {amount} |
| Cancelled booking | 422 | Cannot record payment on a cancelled booking |
| Not found | 404 | Payment not found |
