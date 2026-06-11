# TravelOS API Endpoints

**Base URL:** `{NEXT_PUBLIC_SITE_URL}/api`  
**Auth:** Staff — cookie or `Authorization: Bearer` · Portal — customer session · Webhooks/cron — secrets  
**Conventions:** JSON body, pagination `page`/`limit`, error envelope per `docs/03-Architecture/API.md`

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health/supabase` | Public | Supabase connectivity check |

---

## Authentication & onboarding

| Method | Path | Permission / auth |
|--------|------|-------------------|
| GET | `/api/auth/me` | Authenticated staff |
| POST | `/api/auth/onboarding` | Onboarding flow |

---

## Users

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/users` | `users.read` |
| POST | `/api/users/invite` | `users.create` |
| PUT | `/api/users/:id` | `users.update` |
| DELETE | `/api/users/:id` | `users.delete` |
| GET | `/api/users/assignees` | CRM read or `users.read` |

---

## Customers

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/customers` | `customers.read` |
| POST | `/api/customers` | `customers.create` |
| GET | `/api/customers/:id` | `customers.read` |
| PUT | `/api/customers/:id` | `customers.update` |
| DELETE | `/api/customers/:id` | `customers.delete` |
| GET | `/api/customers/:id/360` | `customers.read` |
| GET | `/api/customers/:id/360/timeline` | `customers.read` |
| GET/PATCH | `/api/customers/:id/communication-preferences` | `customers.read` / `customers.update` |
| GET | `/api/customers/:id/gateway-payments` | `payments.read` |

---

## Packages

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/packages` | `packages.read` |
| POST | `/api/packages` | `packages.create` |
| GET | `/api/packages/:id` | `packages.read` |
| PUT | `/api/packages/:id` | `packages.update` |
| POST | `/api/packages/:id/publish` | `packages.publish` |
| POST | `/api/packages/:id/archive` | `packages.publish` |
| POST | `/api/packages/:id/itinerary` | `packages.update` |
| PUT | `/api/packages/:id/pricing` | `packages.update` |

---

## Bookings

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/bookings` | `bookings.read` |
| POST | `/api/bookings` | `bookings.create` |
| GET | `/api/bookings/:id` | `bookings.read` |
| PATCH | `/api/bookings/:id/status` | `bookings.confirm` / cancel / complete |
| GET | `/api/bookings/:id/gateway-payments` | `payments.read` |

---

## Payments (manual ledger)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/payments` | `payments.read` |
| POST | `/api/payments` | `payments.create` |

---

## Dashboard (legacy MVP)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/dashboard/stats` | `dashboard.read` |

---

## CRM — Leads

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/leads` | `crm.leads.read` / `read_all` |
| POST | `/api/leads` | `crm.leads.write` |
| GET | `/api/leads/:id` | read |
| PATCH | `/api/leads/:id` | write |
| DELETE | `/api/leads/:id` | write / write_all |
| POST | `/api/leads/:id/assign` | write |
| POST | `/api/leads/:id/convert-customer` | write |
| POST | `/api/leads/:id/convert-opportunity` | write |
| POST | `/api/leads/check-duplicate` | read |
| GET | `/api/leads/:id/health` | read (AI health) |
| POST | `/api/leads/:id/log-whatsapp` | write |

---

## CRM — Opportunities

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/opportunities` | `crm.opportunities.read` / `read_all` |
| POST | `/api/opportunities` | write |
| GET | `/api/opportunities/:id` | read |
| PATCH | `/api/opportunities/:id` | write |
| GET | `/api/opportunities/:id/stage-history` | read |
| GET | `/api/opportunities/forecast` | read |
| POST | `/api/opportunities/:id/create-booking` | write + stage rules |

---

## CRM — Activities

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/activities` | `crm.activities.read` / `read_all` |
| POST | `/api/activities` | write |
| GET | `/api/activities/:id` | read |
| PATCH | `/api/activities/:id` | write |
| DELETE | `/api/activities/:id` | write |

---

## CRM — Quotations

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/quotations` | `crm.quotations.read` / `read_all` |
| POST | `/api/quotations` | write |
| GET | `/api/quotations/:id` | read |
| PATCH | `/api/quotations/:id` | write |
| POST | `/api/quotations/:id/send` | `crm.quotations.send` |
| POST | `/api/quotations/:id/accept` | `crm.quotations.accept` |
| POST | `/api/quotations/:id/reject` | write |
| POST | `/api/quotations/:id/convert` | `crm.quotations.convert` |
| POST | `/api/quotations/:id/submit-approval` | write |
| POST | `/api/quotations/:id/approve` | `crm.quotations.approve` |
| POST | `/api/quotations/:id/reject-approval` | approve |
| POST | `/api/quotations/:id/mark-viewed` | read |
| GET/POST | `/api/quotations/:id/items` | read / write |
| PATCH/DELETE | `/api/quotations/:id/items/:itemId` | write |
| GET | `/api/quotations/:id/gateway-payments` | `payments.read` |

---

## CRM — Dashboard & operations metrics

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/crm/dashboard` | `crm.dashboard.read` |
| GET | `/api/crm/operations/metrics` | tenant_admin / operations access |

---

## CRM — Sales AI

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/crm/sales/snapshots` | `ai.sales.read` |
| GET | `/api/crm/sales/recommendations` | `ai.sales.read` |
| PATCH | `/api/crm/sales/recommendations/:id` | `ai.sales.read` |
| GET | `/api/crm/sales/insights` | `ai.sales.insights.read` |
| GET | `/api/crm/sales/widgets` | `ai.sales.read` |

---

## CRM — Operations AI

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/crm/operations/snapshots` | `ai.operations.read` |
| GET | `/api/crm/operations/recommendations` | `ai.operations.read` |
| PATCH | `/api/crm/operations/recommendations/:id` | `ai.operations.read` |
| GET | `/api/crm/operations/widgets` | `ai.operations.read` |
| GET | `/api/crm/operations/insights` | `ai.operations.insights.read` |
| GET | `/api/crm/operations/customer-strip` | `ai.operations.read` |

---

## CRM — WhatsApp

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/api/crm/whatsapp/templates` | templates.manage / read |
| PATCH/DELETE | `/api/crm/whatsapp/templates/:id` | templates.manage |
| POST | `/api/crm/whatsapp/send` | `crm.whatsapp.messages.send` |
| GET | `/api/crm/whatsapp/messages` | `crm.whatsapp.messages.read` |

---

## Customer portal

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/portal/me` | Portal |
| GET | `/api/portal/dashboard` | Portal |
| GET | `/api/portal/quotations` | Portal |
| GET | `/api/portal/quotations/:id` | Portal |
| POST | `/api/portal/quotations/:id/accept` | Portal |
| POST | `/api/portal/quotations/:id/reject` | Portal |
| GET | `/api/portal/quotations/:id/timeline` | Portal |
| GET | `/api/portal/quotations/:id/pdf` | Portal |
| POST | `/api/portal/quotations/:id/checkout` | Portal |
| GET | `/api/portal/payment-orders/:id` | Portal |
| GET | `/api/portal/bookings` | Portal |
| GET | `/api/portal/bookings/:id` | Portal |
| GET | `/api/portal/bookings/:id/documents` | Portal |
| GET | `/api/portal/bookings/:id/documents/:documentId` | Portal |
| GET/PATCH | `/api/portal/preferences` | Portal |
| GET | `/api/portal/notifications` | Portal |
| POST | `/api/portal/notifications/:id/read` | Portal |
| POST | `/api/portal/notifications/read-all` | Portal |
| GET | `/api/portal/notifications/unread-count` | Portal |

---

## Notifications (staff)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/notifications` | Authenticated |
| POST | `/api/notifications/:id/read` | Authenticated |
| POST | `/api/notifications/read-all` | Authenticated |

---

## AI agents

| Method | Path | Permission |
|--------|------|------------|
| POST | `/api/ai/knowledge-agent` | `ai.knowledge.use` |
| POST | `/api/ai/booking-agent` | `ai.booking.use` |
| POST | `/api/ai/support-agent` | `ai.support.use` |
| POST | `/api/ai/sales-agent` | `ai.sales.use` |
| POST | `/api/ai/operations-agent` | `ai.operations.use` |
| GET | `/api/ai/analytics` | `ai.analytics.read` |
| GET | `/api/ai/analytics/export` | `ai.analytics.read` |
| POST | `/api/ai/feedback` | `ai.read` |

---

## Knowledge base

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/api/knowledge/documents` | `knowledge.manage` / read |
| GET/DELETE | `/api/knowledge/documents/:id` | `knowledge.manage` |

---

## Support tickets

| Method | Path | Permission |
|--------|------|------------|
| GET/PATCH | `/api/support-tickets/:id` | Support AI / staff |

---

## Invoices

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/invoices/:id/pdf` | Invoice read |

---

## Webhooks (no JWT)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/webhooks/paymob` | HMAC |
| GET/POST | `/api/webhooks/whatsapp` | Verify token / HMAC |

---

## Cron / worker

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/cron/process-dispatch-jobs` | `CRON_SECRET` |

---

## Notes

- Refine data provider may call Supabase directly for some resources; business mutations for portal, payments, and quotations use API routes above.
- Supabase REST/RPC is not duplicated here; RLS applies to direct client reads.
- Full request/response schemas: `docs/03-Architecture/API.md`, `CRM-Phase7-Implementation-Spec.md` §6.
