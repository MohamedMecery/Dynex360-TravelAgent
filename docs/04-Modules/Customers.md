# Customers Module

**Version:** 1.1 — MVP + Support Agent CRM (Phase 5)  
**Module ID:** CUST  
**Last Updated:** 2026-06-02

---

## Purpose

Manage customer records for travel agencies including individual and corporate clients, with contacts and addresses.

## Business Processes

- Customer creation and duplicate detection
- Contact and address management
- Customer search and booking history

See [BusinessFlows.md](../02-Business/BusinessFlows.md) — Section 2.

## User Stories

| ID | Story |
|----|-------|
| US-CUST-001 | Create customer |
| US-CUST-002 | Add contacts |
| US-CUST-003 | Add addresses |
| US-CUST-004 | Search customers |
| US-CUST-005 | Edit customer |
| US-CUST-006 | Delete customer (soft) |
| US-CUST-007 | View booking history |
| US-CUST-008 | Duplicate detection |

## Business Rules

- BR-001: Customer email unique within tenant
- BR-007: Soft delete preserves booking history
- Corporate customers require company_name

## Database Tables

| Table | Description |
|-------|-------------|
| customers | Core customer record |
| customer_contacts | Additional contacts |
| customer_addresses | Billing/mailing addresses |

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /api/customers | customers.read | List customers (paginated, searchable) |
| GET | /api/customers/:id | customers.read | Get customer detail |
| POST | /api/customers | customers.create | Create customer |
| PUT | /api/customers/:id | customers.update | Update customer |
| DELETE | /api/customers/:id | customers.delete | Soft delete customer |
| GET | /api/customers/:id/contacts | customers.read | List contacts |
| POST | /api/customers/:id/contacts | customers.create | Add contact |
| PUT | /api/customers/:id/contacts/:contactId | customers.update | Update contact |
| DELETE | /api/customers/:id/contacts/:contactId | customers.delete | Delete contact |
| GET | /api/customers/:id/addresses | customers.read | List addresses |
| POST | /api/customers/:id/addresses | customers.create | Add address |
| PUT | /api/customers/:id/addresses/:addressId | customers.update | Update address |
| DELETE | /api/customers/:id/addresses/:addressId | customers.delete | Delete address |
| GET | /api/customers/:id/bookings | customers.read | Customer booking history |

## Permissions

| Action | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|--------|:-----------:|:------------:|:-----------:|:---------------:|
| Create | Yes | Yes | Yes | No |
| Read | Yes | Yes | Yes | Yes |
| Update | Yes | Yes | Yes | No |
| Delete | Yes | Yes | No | No |
| Export | Yes | Yes | No | Yes |

## UI Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Customer List | /customers | Searchable table with type filter |
| Customer Create | /customers/create | Form: name, email, phone, type, company |
| Customer Detail | /customers/:id | Profile, contacts, addresses, booking history |
| Customer Edit | /customers/:id/edit | Edit form |

## Validation Rules

| Field | Rule |
|-------|------|
| first_name | Required, max 100 chars |
| last_name | Required, max 100 chars |
| email | Optional, valid format, unique within tenant |
| phone | Optional, max 50 chars |
| type | Required, enum: individual, corporate |
| company_name | Required if type = corporate |

## Error Handling

| Error | Code | Message |
|-------|------|---------|
| Duplicate email | 409 | A customer with this email already exists |
| Not found | 404 | Customer not found |
| Forbidden | 403 | You do not have permission to perform this action |

---

## CRM & Support Agent Integration (Phase 5)

**Approved** per [DECISIONS.md](../01-Product/DECISIONS.md) D-008.

The Customers module is the **CRM anchor** for the Support Agent:

| Integration | Description |
|-------------|-------------|
| Ticket linkage | `support_tickets.customer_id` → `customers.id` |
| Booking context | Optional `support_tickets.booking_id` for trip-related issues |
| Customer FAQ | Support Agent uses knowledge corpus + customer read tools |
| Escalation | Tickets assigned to `users` via `assigned_user_id` |

Support-specific tables are specified in [DatabaseDesign.md](../03-Architecture/DatabaseDesign.md) §8 (recommended, not migrated).

### User stories

US-AI-SUP-001 through US-AI-SUP-004 — see [UserStories.md](../02-Business/UserStories.md).

Full agent specification: [AI-Agents.md](./AI-Agents.md).
