# TravelOS RBAC Matrix

**Legend:** ✓ = granted · — = not granted · **P** = portal customer (separate auth, not a staff role)

**Sources:** `database/migrations/008_seed_reference.sql`, `029`, `036`, `054`, `059`, `063`, `015`, `src/lib/auth/crm-rbac.ts`

---

## Staff roles

| Role | Scope |
|------|-------|
| super_admin | Platform — all tenants |
| tenant_admin | Full tenant administration |
| sales_agent | Own CRM records + revenue CRUD (no delete) |
| finance_officer | Payments CRUD + read-all CRM |

---

## Core MVP permissions

| Permission | super_admin | tenant_admin | sales_agent | finance_officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| **Tenants** | | | | |
| tenants.create | ✓ | — | — | — |
| tenants.read | ✓ | ✓ (own) | — | — |
| tenants.update | ✓ | ✓ (own) | — | — |
| tenants.delete | ✓ | — | — | — |
| tenants.manage | ✓ | — | — | — |
| **Users** | | | | |
| users.create | ✓ | ✓ | — | — |
| users.read | ✓ | ✓ | — | — |
| users.update | ✓ | ✓ | — | — |
| users.delete | ✓ | ✓ | — | — |
| users.manage | ✓ | ✓ | — | — |
| **Customers** | | | | |
| customers.create | ✓ | ✓ | ✓ | — |
| customers.read | ✓ | ✓ | ✓ | ✓ |
| customers.update | ✓ | ✓ | ✓ | — |
| customers.delete | ✓ | ✓ | — | — |
| customers.export | ✓ | ✓ | — | ✓ |
| **Packages** | | | | |
| packages.create | ✓ | ✓ | ✓ | — |
| packages.read | ✓ | ✓ | ✓ | ✓ |
| packages.update | ✓ | ✓ | ✓ | — |
| packages.delete | ✓ | ✓ | — | — |
| packages.publish | ✓ | ✓ | ✓ | — |
| packages.export | ✓ | ✓ | — | — |
| **Bookings** | | | | |
| bookings.create | ✓ | ✓ | ✓ | — |
| bookings.read | ✓ | ✓ | ✓ | ✓ |
| bookings.update | ✓ | ✓ | ✓ | — |
| bookings.delete | ✓ | ✓ | — | — |
| bookings.confirm | ✓ | ✓ | ✓ | — |
| bookings.cancel | ✓ | ✓ | ✓ | — |
| bookings.complete | ✓ | ✓ | ✓ | — |
| bookings.export | ✓ | ✓ | ✓ | ✓ |
| **Payments (ledger)** | | | | |
| payments.create | ✓ | ✓ | — | ✓ |
| payments.read | ✓ | ✓ | ✓ | ✓ |
| payments.update | ✓ | ✓ | — | ✓ |
| payments.delete | ✓ | ✓ | — | — |
| payments.export | ✓ | ✓ | — | ✓ |
| **Dashboard** | | | | |
| dashboard.read | ✓ | ✓ | ✓ | ✓ |
| dashboard.financial | ✓ | ✓ | — | ✓ |
| **Audit & settings** | | | | |
| audit_logs.read | ✓ | ✓ | — | — |
| settings.read | ✓ | ✓ | — | — |
| settings.update | ✓ | ✓ | — | — |
| settings.manage | ✓ | ✓ | — | — |

---

## CRM permissions

| Permission | super_admin | tenant_admin | sales_agent | finance_officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| crm.leads.read | ✓ | ✓ | ✓ | — |
| crm.leads.read_all | ✓ | ✓ | — | ✓ |
| crm.leads.write | ✓ | ✓ | ✓ | — |
| crm.leads.write_all | ✓ | ✓ | — | — |
| crm.opportunities.read | ✓ | ✓ | ✓ | — |
| crm.opportunities.read_all | ✓ | ✓ | — | ✓ |
| crm.opportunities.write | ✓ | ✓ | ✓ | — |
| crm.opportunities.write_all | ✓ | ✓ | — | — |
| crm.activities.read | ✓ | ✓ | ✓ | — |
| crm.activities.read_all | ✓ | ✓ | — | ✓ |
| crm.activities.write | ✓ | ✓ | ✓ | — |
| crm.activities.write_all | ✓ | ✓ | — | — |
| crm.dashboard.read | ✓ | ✓ | ✓ | ✓ |
| crm.quotations.read | ✓ | ✓ | ✓ | — |
| crm.quotations.read_all | ✓ | ✓ | — | ✓ |
| crm.quotations.write | ✓ | ✓ | ✓ | — |
| crm.quotations.write_all | ✓ | ✓ | — | — |
| crm.quotations.approve | ✓ | ✓ | — | — |
| crm.quotations.send | ✓ | ✓ | ✓ | — |
| crm.quotations.accept | ✓ | ✓ | ✓ | — |
| crm.quotations.convert | ✓ | ✓ | ✓ | — |

**Note:** super_admin and tenant_admin effectively have all `crm.*` via seed cross-join or `crm.*` wildcard in application code.

---

## WhatsApp permissions

| Permission | super_admin | tenant_admin | sales_agent | finance_officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| crm.whatsapp.templates.manage | ✓ | ✓ | — | — |
| crm.whatsapp.messages.send | ✓ | ✓ | ✓ | — |
| crm.whatsapp.messages.read | ✓ | ✓ | ✓ | — |

---

## AI permissions (Phase 5 agents)

| Permission | super_admin | tenant_admin | sales_agent | finance_officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| ai.knowledge.use | ✓ | ✓ | ✓ | ✓ |
| ai.booking.use | ✓ | ✓ | ✓ | — |
| ai.support.use | ✓ | ✓ | ✓ | ✓ |
| ai.read | ✓ | ✓ | ✓ | ✓ |
| ai.analytics.read | ✓ | ✓ | — | — |
| ai.logs.read | ✓ | ✓ | — | — |
| knowledge.manage | ✓ | ✓ | — | — |

---

## AI Sales permissions (9C)

| Permission | super_admin | tenant_admin | sales_agent | finance_officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| ai.sales.use | ✓ | ✓ | ✓ | — |
| ai.sales.read | ✓ | ✓ | ✓ | — |
| ai.sales.insights.read | ✓ | ✓ | — | — |
| ai.sales.manage | ✓ | ✓ | — | — |

---

## AI Operations permissions (9D)

| Permission | super_admin | tenant_admin | sales_agent | finance_officer |
|------------|:-----------:|:------------:|:-----------:|:---------------:|
| ai.operations.use | ✓ | ✓ | ✓ | — |
| ai.operations.read | ✓ | ✓ | ✓ | — |
| ai.operations.insights.read | ✓ | ✓ | — | — |
| ai.operations.manage | ✓ | ✓ | — | — |

---

## Portal customer (**P**)

| Capability | Staff RBAC | Portal |
|------------|:----------:|:------:|
| CRM leads/opportunities | Role-based | — |
| View own quotations (sent+) | — | **P** |
| Accept/reject quotation | staff `crm.quotations.accept` | **P** |
| Pay checkout | — | **P** |
| View own bookings/documents | staff `bookings.read` | **P** |
| WhatsApp preferences | staff `customers.update` | **P** |
| Staff routes / Refine | Role-based | — |

Portal authorization: `requirePortalApiAccess()` + RLS `is_portal_user()`.

---

## RLS vs API matrix

| Layer | Enforces |
|-------|----------|
| RLS | `tenant_id`, owner-based CRM rows, portal customer scope |
| API | Permission strings; returns 403 FORBIDDEN |
| UI | Hides buttons/routes; not a security boundary |

**Rule:** Never rely on UI alone; API and RLS must align.

---

## Query: effective permissions for user

```sql
SELECT p.module, p.action
FROM permissions p
JOIN role_permissions rp ON rp.permission_id = p.id
JOIN user_roles ur ON ur.role_id = rp.role_id
WHERE ur.user_id = '{user_id}';
```

---

## Related documents

- [02-user-roles.md](./02-user-roles.md)
- [docs/03-Architecture/RBAC.md](../03-Architecture/RBAC.md)
- [docs/02-Business/Permissions.md](../02-Business/Permissions.md)
