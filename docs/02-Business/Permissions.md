# TravelOS Permissions Matrix

**Version:** 1.0 — MVP  
**Last Updated:** 2026-06-01

Legend: **C** = Create, **R** = Read, **U** = Update, **D** = Delete, **A** = Approve, **E** = Export, **M** = Manage, **—** = No access

---

## Authentication Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| auth.login | ✓ | ✓ | ✓ | ✓ |
| auth.logout | ✓ | ✓ | ✓ | ✓ |
| auth.reset_password | ✓ | ✓ | ✓ | ✓ |

---

## User Management Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| users.create | C | C | — | — |
| users.read | R | R | — | — |
| users.update | U | U | — | — |
| users.delete | D | D | — | — |
| users.manage | M | M | — | — |

---

## Tenant Management Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| tenants.create | C | — | — | — |
| tenants.read | R | R (own) | — | — |
| tenants.update | U | U (own) | — | — |
| tenants.delete | D | — | — | — |
| tenants.manage | M | — | — | — |

---

## Customers Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| customers.create | C | C | C | — |
| customers.read | R | R | R | R |
| customers.update | U | U | U | — |
| customers.delete | D | D | — | — |
| customers.export | E | E | — | E |

---

## Packages Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| packages.create | C | C | C | — |
| packages.read | R | R | R | R |
| packages.update | U | U | U | — |
| packages.delete | D | D | — | — |
| packages.publish | A | A | A | — |
| packages.export | E | E | — | — |

---

## Bookings Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| bookings.create | C | C | C | — |
| bookings.read | R | R | R | R |
| bookings.update | U | U | U | — |
| bookings.delete | D | D | — | — |
| bookings.confirm | A | A | A | — |
| bookings.cancel | A | A | A | — |
| bookings.complete | A | A | A | — |
| bookings.export | E | E | E | E |

---

## Payments Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| payments.create | C | C | — | C |
| payments.read | R | R | R | R |
| payments.update | U | U | — | U |
| payments.delete | D | D | — | — |
| payments.export | E | E | — | E |

---

## Dashboard Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| dashboard.read | R | R | R | R |
| dashboard.financial | R | R | — | R |
| dashboard.bookings | R | R | R (own) | R |

---

## Audit Logs Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| audit_logs.read | R | R | — | — |

---

## Settings Module

| Permission | Super Admin | Tenant Admin | Sales Agent | Finance Officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| settings.read | R | R | — | — |
| settings.update | U | U | — | — |
| settings.manage | M | M | — | — |

---

## Permission Enforcement Points

| Layer | Mechanism |
|-------|-----------|
| Database | Row Level Security policies filter by tenant_id |
| API | Middleware checks JWT role against required permission |
| UI | Refine access control provider hides/disables unauthorized actions |
| Audit | All permission-denied attempts logged |

---

## Permission Seed Data

Permissions are stored in the `permissions` table and linked to roles via `role_permissions`. See `database/migrations/004_seed_roles_permissions.sql` for seed data.

### Permission Naming Convention

```
{module}.{action}
```

Examples: `customers.create`, `bookings.confirm`, `payments.export`

### Role Permission Sets (MVP)

**Super Admin:** All permissions across all modules.

**Tenant Admin:** All permissions within their tenant (full CRUD + approve + export + manage on all MVP modules).

**Sales Agent:** Create/read/update on customers, packages, bookings. Read on payments. Confirm/cancel/complete bookings.

**Finance Officer:** Full CRUD on payments. Read on bookings, customers. Export on payments and bookings.
