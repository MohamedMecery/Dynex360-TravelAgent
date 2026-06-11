# TravelOS Test Inventory

**Audience:** QA, pilot operations, engineering  
**Purpose:** Complete testing catalog — not executed by this document  
**Last updated:** 2026-06-04  
**Related:** [pilot-package docs](./01-system-overview.md), gate scripts in `package.json`, Playwright `e2e/`, Maestro `apps/mobile/maestro/`

---

## How to read this catalog

| Column | Meaning |
|--------|---------|
| **Module** | Product area under test |
| **Feature** | Functional capability |
| **Test Scenario** | What to exercise (manual, API, UI, or automated) |
| **Expected Result** | Pass criteria |
| **Priority** | **P0** critical/security/commercial path · **P1** core feature · **P2** edge/secondary · **P3** polish/regression |

### Priority guidance

- **P0:** Tenant isolation, auth, payment webhook integrity, portal/staff separation, cron auth
- **P1:** Primary CRM/portal/revenue workflows per pilot
- **P2:** Validation edges, AI/worker latency, finance read-only
- **P3:** RTL, analytics UI, non-blocking UX

### Existing automation references (do not run from this doc)

| Area | Automation |
|------|------------|
| Portal | `npm run gate:portal`, `e2e/portal-gate.spec.ts` |
| Payments | `npm run gate:sprint9a:payments`, `npm run test:payments` |
| WhatsApp | `npm run gate:sprint9b:whatsapp`, `npm run test:whatsapp` |
| Events/worker | `npm run gate:sprint8c:events`, `npm run gate:sprint8d:worker` |
| Sales AI | `npm run gate:sprint9c:sales-ai` |
| Operations AI | `npm run gate:sprint9d:operations-ai`, `npm run test:operations-ai` |
| Commercial E2E | `npm run gate:commercial` |
| Mobile | Maestro `apps/mobile/maestro/flows/`, `scripts/run-sprint7e-mobile-uat.mjs` |
| CRM/dashboard | `e2e/customer360-gate.spec.ts`, `gate:sprint6:dashboard` |

---

## Module reference — rules summary

### CRM

| Category | Rules |
|----------|-------|
| **Features** | Leads, opportunities, activities, quotations, Customer 360, CRM dashboard, assignees, forecast, WhatsApp activity log |
| **User actions** | CRUD, assign, convert, send/approve/accept/reject/convert quotations, stage changes, duplicate check |
| **Validation** | Zod: `lead.ts`, `opportunity.ts`, `activity.ts`, `quotation.ts`, `crm-dashboard.ts`, `customer-360.ts`; DB checks: `pax_count > 0`, probability 0–100, unique email per tenant |
| **Security** | `crm.*` permissions; RLS owner vs `read_all`/`write_all`; tenant_id from JWT |
| **Business** | Quotation lifecycle (simple vs standard approval); one active accepted quote per opportunity; portal-visible statuses only post-send; opportunity stage → verbal_approval on accept |
| **Errors** | `401 UNAUTHORIZED`, `403 FORBIDDEN`, `400 VALIDATION_ERROR`, `404 NOT_FOUND`, `422` transition codes (`QUOTATION_EXPIRED`, `QUOTATION_TRANSITION_INVALID`, `ACTIVE_QUOTATION_EXISTS`, `CUSTOMER_REQUIRED`, `ITEMS_REQUIRED`) |

### Portal

| Category | Rules |
|----------|-------|
| **Features** | Login, forgot/reset password, dashboard, quotations, accept/reject, PDF, timeline, bookings, documents, preferences, notifications, checkout entry |
| **User actions** | Sign in/out, view/accept/reject, pay, download PDF/docs, update preferences, mark notifications read |
| **Validation** | `quotationRejectSchema`; portal session required on all `/api/portal/*` |
| **Security** | `requirePortalApiAccess()`; staff blocked; RLS `portal_customer_id()`; cross-customer → **404** |
| **Business** | Actionable statuses: `sent`, `viewed`; auto mark viewed on action; writes via admin client after ownership check |
| **Errors** | `401`, `404 NOT_FOUND`, `409` (`QUOTATION_ALREADY_ACCEPTED`, `QUOTATION_ALREADY_REJECTED`, `ACTIVE_QUOTATION_EXISTS`), `422` (`QUOTATION_EXPIRED`, `QUOTATION_NOT_ACTIONABLE`) |

### Payments

| Category | Rules |
|----------|-------|
| **Features** | Portal checkout, payment order status, Paymob webhook, ledger link, tenant payment settings, CRM gateway panels |
| **User actions** | Pay Now, complete Paymob flow, view order status; finance manual payments (separate) |
| **Validation** | Accepted quotation only; positive amount; idempotency key; HMAC on webhook |
| **Security** | Webhook: HMAC only (no JWT); portal checkout scoped to customer; amount server-side |
| **Business** | `payments_enabled` per tenant; `auto_on_deposit` → draft booking; duplicate webhook idempotent |
| **Errors** | `QUOTATION_NOT_ACCEPTED`, `ALREADY_CONVERTED`, `ALREADY_PAID`, `PAYMENTS_DISABLED`, `INVALID_AMOUNT`, `INVALID_SIGNATURE`, `AMOUNT_MISMATCH`, `ORDER_NOT_FOUND` |

### WhatsApp

| Category | Rules |
|----------|-------|
| **Features** | Template registry, CRM manual send, automated dispatch, delivery webhooks, message history, preferences |
| **User actions** | Admin manage templates; sales send template; customer opt-in/out in portal |
| **Validation** | Approved template only; E.164 phone; template variables |
| **Security** | Webhook HMAC; tenant-scoped messages; `crm.whatsapp.*` permissions |
| **Business** | Opt-in required; quiet hours skip; template `event_type` match; no inbound chat |
| **Errors** | Send skipped (logged) vs failed; webhook `401`; job `dead_letter` after retries |

### AI

| Category | Rules |
|----------|-------|
| **Features** | Knowledge/Booking/Support agents; Sales/Ops assistants; snapshots; recommendations; insights dashboards |
| **User actions** | Chat (read-only context); dismiss/complete recommendations; view widgets/insights |
| **Validation** | `salesAgentRequestSchema`, `operationsAgentRequestSchema`, agent request schemas; rate limits / token budget |
| **Security** | `ai.*` permissions; tenant context server-built; no tool writes to CRM |
| **Business** | Scores via worker async; LLM explains only; finance excluded from agents |
| **Errors** | `403` missing permission; budget exceeded; `500` provider failure (graceful message) |

### Mobile

| Category | Rules |
|----------|-------|
| **Features** | Login, dashboard, leads, pipeline, activities, quotations, bookings, Customer 360, profile, RTL |
| **User actions** | Same CRM subset as web API via Bearer token |
| **Validation** | Same API Zod as web |
| **Security** | Bearer JWT; inactive account `403`; permissions from `/api/auth/me` |
| **Business** | No portal/payments/WhatsApp send on mobile |
| **Errors** | `401` no token; network errors surfaced in UI |

### Operations

| Category | Rules |
|----------|-------|
| **Features** | Domain events, dispatch queue, cron worker, operations dashboard metrics, email delivery logs |
| **User actions** | View `/crm/operations`; manual cron trigger (ops); dead-letter replay (engineering) |
| **Validation** | `batchSize` 1–100 on cron body |
| **Security** | `CRON_SECRET` required; unauthorized cron → `401` |
| **Business** | Idempotent job enqueue; retry then dead_letter; SLA minutes not seconds |
| **Errors** | `401 UNAUTHORIZED` cron; `500 INTERNAL` worker; per-job `last_error` |

---

## CRM — test catalog

| Feature | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| **Leads — create** | Sales creates lead with required `full_name`, `source`, valid `pax_count` | 201; `lead_number` assigned; `owner_id` set | P1 |
| **Leads — create** | Submit empty `full_name` | 400 `VALIDATION_ERROR` | P1 |
| **Leads — create** | Invalid email format | 400 `VALIDATION_ERROR` | P2 |
| **Leads — create** | Duplicate email same tenant | 409 or duplicate warning per API | P1 |
| **Leads — read** | Sales lists own leads | Only own rows (RLS) | P0 |
| **Leads — read** | Finance lists leads | All tenant leads (`read_all`) | P1 |
| **Leads — read** | Sales reads peer’s lead by ID | 404 or empty (RLS) | P0 |
| **Leads — update** | Sales updates own lead status to `qualified` | 200; status persisted | P1 |
| **Leads — update** | Sales updates peer’s lead | 403 `FORBIDDEN` or RLS block | P0 |
| **Leads — assign** | Admin reassigns `owner_id` | 200; new owner sees lead | P1 |
| **Leads — assign** | Invalid `owner_id` UUID | 400 `VALIDATION_ERROR` | P2 |
| **Leads — convert customer** | Convert lead to new customer | `customer_id` linked; timeline eligible | P1 |
| **Leads — convert opportunity** | Convert lead to opportunity | Opportunity created with `lead_id` | P1 |
| **Leads — duplicate check** | `POST /api/leads/check-duplicate` with existing email | Returns duplicate match | P2 |
| **Leads — delete** | Soft-delete lead | `deleted_at` set; hidden from list | P2 |
| **Leads — permissions** | Unauthenticated `GET /api/leads` | 401 | P0 |
| **Leads — permissions** | Finance `POST /api/leads` | 403 `FORBIDDEN` | P0 |
| **Leads — WhatsApp log** | `POST log-whatsapp` without `crm.activities.write` | 403 | P1 |
| **Leads — health** | `GET /api/leads/:id/health` with sales read | AI health payload or empty | P2 |
| **Opportunities — create** | Create linked to lead and customer | 201; stage `discovery` | P1 |
| **Opportunities — create** | `probability` = 150 | 400 validation | P2 |
| **Opportunities — update** | Move stage `discovery` → `negotiation` | Stage history row created | P1 |
| **Opportunities — read** | Finance read-only pipeline | 200 list; no write buttons | P1 |
| **Opportunities — forecast** | `GET /api/opportunities/forecast` | Aggregates by stage for tenant | P2 |
| **Opportunities — create booking** | Stage `verbal_approval`; sales creates booking | Booking created | P1 |
| **Opportunities — create booking** | Stage `discovery`; sales attempts booking | Blocked unless admin override | P2 |
| **Opportunities — tenant isolation** | Tenant A user queries Tenant B opportunity ID | 404 | P0 |
| **Activities — create** | Create call activity on lead | 201; lead `last_contacted_at` updated | P1 |
| **Activities — create** | WhatsApp activity without `direction` | 400 validation | P2 |
| **Activities — create** | No lead/opp/customer FK | 400 validation | P1 |
| **Activities — list** | Filter by assignee and status | Correct filtered set | P2 |
| **Activities — permissions** | Finance creates activity | 403 | P1 |
| **Quotations — create** | Draft quotation with line items | Totals calculated server-side | P1 |
| **Quotations — create** | Zero line items | Send blocked later (`ITEMS_REQUIRED`) | P1 |
| **Quotations — approval (standard)** | Submit `pending_approval` → admin approves | Status `approved` | P1 |
| **Quotations — approval (standard)** | Sales attempts approve | 403 | P1 |
| **Quotations — send (simple)** | Send from `draft` with customer + items + total > 0 | Status `sent`; `sent_at` set | P1 |
| **Quotations — send (standard)** | Send from `draft` without approve | `QUOTATION_TRANSITION_INVALID` | P1 |
| **Quotations — send** | Send without `customer_id` | `CUSTOMER_REQUIRED` | P1 |
| **Quotations — send** | Emit `quotation.sent` | Domain event + dispatch jobs enqueued | P1 |
| **Quotations — accept (staff)** | Accept `viewed` quotation | `accepted`; opportunity → `verbal_approval` | P1 |
| **Quotations — accept** | Second accept same opportunity | `ACTIVE_QUOTATION_EXISTS` 409 | P1 |
| **Quotations — accept** | Accept expired (`valid_until` past) | `QUOTATION_EXPIRED` 422 | P1 |
| **Quotations — reject** | Reject with optional reason | `rejected`; reason stored | P1 |
| **Quotations — convert** | Convert `accepted` to booking | Booking + `converted_to_booking` | P1 |
| **Quotations — RLS** | Sales reads peer quotation | Denied by RLS | P0 |
| **Quotations — items** | Add/update/delete line item on draft | Item totals refresh | P1 |
| **Customer 360** | `GET /api/customers/:id/360` | Profile + related aggregates | P1 |
| **Customer 360 — timeline** | Timeline with `bucket=sales` | Sales events only | P2 |
| **Customer 360 — timeline** | Cross-tenant customer ID | 404 | P0 |
| **CRM dashboard** | `GET /api/crm/dashboard?period=month` | KPIs + charts for tenant | P1 |
| **CRM dashboard** | Sales without `crm.dashboard.read` | 403 | P1 |
| **CRM dashboard** | Financial charts as sales_agent | Financial section hidden | P2 |
| **Assignees** | `GET /api/users/assignees` | Active tenant users for pickers | P2 |

---

## Portal — test catalog

| Feature | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| **Login UI** | Load `/portal/login` | Heading visible (EN/AR) | P2 |
| **Login** | Valid portal credentials | Redirect `/portal` dashboard | P0 |
| **Login** | Staff credentials on portal login | Rejected / no portal access | P0 |
| **Login** | Invalid password | Error message; no session | P1 |
| **Session** | Unauthenticated `GET /api/portal/dashboard` | 401 | P0 |
| **Session** | Unauthenticated `/portal` | Redirect to login | P1 |
| **Password reset** | Request reset email | Supabase sends email (SMTP configured) | P2 |
| **Password reset** | Complete reset via link | New password works | P2 |
| **Dashboard** | Authenticated dashboard | Summary cards for customer | P1 |
| **Quotations — list** | List quotations | Only post-send statuses; own customer only | P0 |
| **Quotations — list** | Draft quotation exists for customer | Not visible in portal list | P0 |
| **Quotations — detail** | Open sent quotation | Line items and totals match CRM | P1 |
| **Quotations — detail** | Probe another customer’s quotation ID | 404 | P0 |
| **Quotations — PDF** | Download PDF | PDF stream; tenant branding | P2 |
| **Quotations — timeline** | `GET timeline` after send | Ordered created/sent/viewed events | P2 |
| **Accept** | Accept from `sent` | Status `accepted`; auto `viewed` if was `sent` | P0 |
| **Accept** | Accept already `accepted` | 409 `QUOTATION_ALREADY_ACCEPTED` | P1 |
| **Accept** | Accept expired quotation | 422 `QUOTATION_EXPIRED` | P1 |
| **Accept** | Unauthenticated accept | 401 | P0 |
| **Reject** | Reject with reason | `rejected`; audit + email queued | P1 |
| **Reject** | Reject already rejected | 409 | P2 |
| **Bookings — list** | View bookings | Own customer bookings only | P1 |
| **Bookings — documents** | List/download booking document | 200/redirect; RLS portal policy | P2 |
| **Preferences** | Opt in to WhatsApp | `whatsapp_opt_in_at` set | P1 |
| **Preferences** | Set quiet hours | Stored; dispatcher respects | P2 |
| **Preferences** | Invalid language | 400 validation | P3 |
| **Notifications** | List and mark read | Unread count decreases | P2 |
| **Staff API** | Portal user calls `GET /api/leads` | 403/redirect — staff only | P0 |
| **Audit** | Portal accept | `log_portal_customer_audit` row with `actor_type=customer` | P2 |

---

## Payments — test catalog

| Feature | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| **Tenant settings** | Checkout when `payments_enabled=false` | 422 `PAYMENTS_DISABLED` | P0 |
| **Tenant settings** | Enable payments for tenant | Checkout succeeds (with Paymob/mock) | P1 |
| **Checkout — create** | `POST checkout` on `accepted` quotation | `payment_order` + attempt + `checkout_url` | P0 |
| **Checkout — create** | Checkout on `sent` (not accepted) | 422 `QUOTATION_NOT_ACCEPTED` | P0 |
| **Checkout — create** | Checkout after already converted | 409 `ALREADY_CONVERTED` | P1 |
| **Checkout — create** | Wrong customer quotation ID | 404 | P0 |
| **Checkout — idempotency** | Repeat checkout same idempotency key | Same pending order returned | P1 |
| **Checkout — idempotency** | Checkout after order `completed` | 409 `ALREADY_PAID` | P1 |
| **Checkout — amount** | Client sends tampered amount in body | Server ignores; uses policy calculation | P0 |
| **Paymob — mock** | Complete flow with `PAYMOB_MOCK_MODE` | Order completed; booking created | P1 |
| **Webhook — success** | Valid HMAC webhook for captured payment | Order `completed`; ledger `payments` row; booking draft | P0 |
| **Webhook — security** | Webhook without valid HMAC (prod) | 401/ rejected | P0 |
| **Webhook — replay** | Duplicate same `provider_event_id` | Idempotent; no double ledger | P0 |
| **Webhook — amount** | Webhook amount ≠ order amount | `AMOUNT_MISMATCH`; no completion | P0 |
| **Webhook — mock flag** | `PAYMOB_MOCK_WEBHOOKS` in production check | Validator FAIL (env gate) | P0 |
| **Order status** | `GET /api/portal/payment-orders/:id` | Status, attempts, ledger slice | P1 |
| **Booking automation** | Successful deposit webhook | Quotation `converted_to_booking`; booking `draft` | P0 |
| **Events** | Payment completed | `payment.completed` + `booking.created` jobs enqueued | P1 |
| **CRM visibility** | Staff views gateway payments on quotation | Matches order/ledger | P2 |
| **Manual payments** | Finance records payment on booking | `source=manual`; payment_status updated | P1 |
| **Stripe** | Invoke Stripe adapter | Error — not enabled | P3 |

---

## WhatsApp — test catalog

| Feature | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| **Templates — create** | Tenant admin creates template row | 201; `meta_status` default pending | P1 |
| **Templates — manage** | Sales attempts create template | 403 | P1 |
| **Templates — send gate** | Dispatcher uses non-approved template | Send skipped or fails | P1 |
| **Templates — send** | Approved template + mapped `event_type` | Message sent (or mock log) | P1 |
| **Automated — quotation.sent** | Send quotation from CRM | `dispatch.whatsapp` job enqueued | P1 |
| **Automated — worker** | Process queue with WhatsApp job | `whatsapp_messages` + `notification_deliveries` rows | P1 |
| **Preferences — opt-out** | Customer opted out | Dispatcher skips; no Meta call | P1 |
| **Preferences — quiet hours** | Send during quiet hours | Skipped per tenant timezone | P2 |
| **Preferences — opt-in** | Opt-in then automated event | Send proceeds (if template ok) | P1 |
| **CRM manual send** | Sales `POST /api/crm/whatsapp/send` | Message logged with template ref | P1 |
| **CRM manual send** | Without `crm.whatsapp.messages.send` | 403 | P0 |
| **Message history** | `GET messages?customer_id=` | Tenant-scoped history only | P1 |
| **Message history** | Cross-tenant `customer_id` | Empty or 403 | P0 |
| **Webhook — verify** | Meta GET challenge correct token | 200 challenge response | P1 |
| **Webhook — verify** | Wrong verify token | 403 | P0 |
| **Webhook — status** | POST delivery `delivered` | Message status updated | P2 |
| **Webhook — signature** | Invalid `X-Hub-Signature-256` | 401 | P0 |
| **Mock mode** | `WHATSAPP_MOCK_MODE=true` | No real Meta API; mock provider_message_id | P2 |
| **Dead letter** | Missing template for event | Job fails → retry → dead_letter | P2 |
| **Operations metrics** | WhatsApp 24h metrics on `/crm/operations` | Counts match DB | P2 |

---

## AI — test catalog

| Feature | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| **Knowledge agent** | Staff with `ai.knowledge.use` asks question | Answer + citations | P2 |
| **Knowledge agent** | Missing permission | 403 | P1 |
| **Booking agent** | Sales creates draft via chat tools | Draft booking only; not confirmed | P1 |
| **Booking agent** | Finance uses booking agent | 403 | P1 |
| **Support agent** | Create/update ticket via chat | Ticket row created | P2 |
| **Sales — chat** | `POST /api/ai/sales-agent` with opportunity context | Grounded reply; no DB writes | P1 |
| **Sales — snapshots** | After `quotation.sent` + worker | `ai_sales_snapshots` populated | P1 |
| **Sales — recommendations** | Hot lead untouched rule fires | Open recommendation row | P2 |
| **Sales — recommendations** | Dismiss recommendation | Status dismissed | P2 |
| **Sales — insights** | Tenant admin `GET sales/insights` | Deterministic funnel metrics | P2 |
| **Sales — insights** | Sales agent accesses insights API | 403 | P2 |
| **Operations — chat** | Ops agent on booking detail | Explains readiness score only | P1 |
| **Operations — snapshots** | `booking.created` + worker | `ai_ops_snapshots` for booking | P1 |
| **Operations — widgets** | CRM dashboard ops widgets | At-risk count ≥ 0 | P2 |
| **Operations — insights** | Admin operations insights page | RPC metrics render | P2 |
| **Operations — mobile** | Booking list shows health badge | Badge matches snapshot | P2 |
| **Tenant isolation** | Tenant A reads Tenant B snapshot | RLS deny | P0 |
| **Token budget** | Exceed monthly budget | Rate limit / error message | P2 |
| **Analytics** | `GET /api/ai/analytics` as tenant_admin | KPI payload | P3 |
| **Analytics** | Sales without `ai.analytics.read` | 403 | P2 |
| **Feedback** | Submit thumbs feedback | Stored linked to conversation | P3 |
| **No autonomous confirm** | Agent tool attempt confirm booking | Tool not granted; remains draft | P0 |

---

## Mobile — test catalog

| Feature | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| **Login** | Valid credentials (Maestro 01) | Main tabs visible | P0 |
| **Login** | Invalid password | Error; stay on login | P1 |
| **Bootstrap** | Expired/invalid token | Redirect login | P1 |
| **Auth API** | `GET /api/auth/me` with Bearer | Profile + role returned | P0 |
| **Auth API** | Inactive account | 403 `ACCOUNT_INACTIVE` | P1 |
| **Dashboard** | Home tab loads KPIs | Data or empty state | P1 |
| **Leads** | List/create/edit (Maestro 02) | CRUD via API succeeds | P1 |
| **Leads** | RTL Arabic (Maestro 05) | Layout RTL | P3 |
| **Pipeline** | Opportunity list/detail | Matches web permissions | P1 |
| **Activities** | Activity list/create | Assigned activities visible | P2 |
| **Quotations** | List from More (Maestro 03) | Quotations load | P1 |
| **Quotations** | Send quotation (if permitted) | Status `sent` on server | P2 |
| **Bookings** | List (Maestro 04) | Bookings + ops badge if scored | P1 |
| **Customer 360** | Open customer timeline | Timeline events load | P2 |
| **Profile** | View profile screen | Email, role from `/api/auth/me` | P3 |
| **Permissions UI** | Finance user on mobile | Write actions hidden | P2 |
| **Offline/API** | API URL wrong in `.env` | Error state shown | P2 |
| **Portal** | Attempt portal routes in app | Not available (out of scope) | P3 |
| **WhatsApp send** | Attempt CRM WhatsApp from mobile | Not implemented | P3 |

---

## Operations — test catalog

| Feature | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| **Domain events** | Quotation send emits event | Row in `domain_events` | P1 |
| **Job enqueue** | Same event twice (idempotent key) | Single side-effect job | P1 |
| **Cron auth** | POST worker without secret | 401 `UNAUTHORIZED` | P0 |
| **Cron auth** | POST with valid `CRON_SECRET` | 200 + batch result | P0 |
| **Cron batch** | `batchSize` 150 | Capped at 100 | P3 |
| **Worker — notification** | `dispatch.notification` job | Portal/staff notification created | P1 |
| **Worker — email** | `dispatch.email` with Resend configured | `email_delivery_logs` success | P1 |
| **Worker — email** | Missing `RESEND_API_KEY` | Failed logged; retry | P2 |
| **Worker — whatsapp** | See WhatsApp module | Delivery row | P1 |
| **Worker — ai_score** | Payment completed | Sales snapshot updated | P2 |
| **Worker — ai_ops_score** | Booking created | Ops snapshot updated | P2 |
| **Retry** | Transient failure | `failed` → retry on `next_run_at` | P2 |
| **Dead letter** | Max retries exceeded | `dead_letter`; `last_error` populated | P1 |
| **Stuck processing** | Old `locked_at` | Engineering recovery procedure | P2 |
| **Operations dashboard** | `/crm/operations` loads | pending/failed/dead_letter counts | P1 |
| **Metrics API** | `GET /api/crm/operations/metrics` | JSON matches DB counts | P2 |
| **Tenant admin only** | Sales opens operations dashboard | Allowed or restricted per UI policy | P2 |
| **Health script** | `verify-worker-health.mjs` | Report within SLA thresholds | P1 |
| **Commercial gate** | `gate:commercial` full path | End-to-end PASS document | P0 |

---

## Cross-module — integration scenarios

| Feature | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| **Commercial journey** | Lead → opp → quote → send → portal accept → checkout → webhook | Booking + payment + notifications | P0 |
| **Tenant isolation** | All modules: cross-tenant ID probe | 404 or empty — never 403 leak | P0 |
| **Staff vs portal** | Portal JWT on `GET /api/leads` | 401/403 | P0 |
| **Staff vs portal** | Staff JWT on `GET /api/portal/me` | 401/403 | P0 |
| **Async SLA** | Send quotation → wait 5 min | Email/notification delivered (cron running) | P1 |
| **RBAC matrix** | Each role smoke on forbidden endpoint | 403 consistent | P0 |
| **JWT hook** | Login without hook enabled | Missing tenant context — fail fast in QA | P0 |
| **Production env** | `PRODUCTION_CHECK=1 validate-production-env` | Zero FAIL before pilot | P0 |
| **Playwright CRM** | `customer360-gate.spec.ts` | Customer 360 gate PASS | P2 |
| **Playwright booking** | `booking-flow.spec.ts` | MVP booking flow PASS | P2 |
| **Playwright email** | `email-flows.spec.ts` | Email integration (env dependent) | P3 |

---

## Error handling — global expectations

| HTTP | Code | When to verify |
|------|------|----------------|
| 400 | `VALIDATION_ERROR` | Zod parse failures, invalid query params |
| 401 | `UNAUTHORIZED` | Missing/invalid JWT, cron secret, webhook auth |
| 403 | `FORBIDDEN` | Valid user, missing permission, inactive account |
| 404 | `NOT_FOUND` | Missing resource or portal anti-enumeration |
| 409 | `CONFLICT` | Duplicate accept, active quote, already paid |
| 422 | `UNPROCESSABLE` / business codes | State machine violations, expired, disabled payments |
| 500 | `INTERNAL_ERROR` / `INTERNAL` | Unhandled server; worker failure |

All API errors should return JSON envelope: `{ error: { code, message, details? } }`.

---

## Test data prerequisites

| Module | Prerequisite |
|--------|----------------|
| CRM | Demo tenant; sales + admin users; seed leads/opportunities |
| Portal | `provision-portal-test-account`; sent quotation for customer |
| Payments | Accepted quotation; `payments_enabled`; mock or Paymob sandbox |
| WhatsApp | Approved template; opted-in customer phone |
| AI | Migrations 056–064; worker cron running |
| Mobile | `EXPO_PUBLIC_API_URL` pointing to running Next.js |
| Operations | `CRON_SECRET` set; queue empty or known state |

---

## Coverage gaps (planned manual focus)

| Gap | Recommended tests |
|-----|-------------------|
| Multi-language PDF | Portal PDF AR/EN |
| Concurrent portal accept | Two sessions same quotation |
| Paymob live sandbox | Real HMAC webhook from Paymob |
| Meta live template | End-to-end WhatsApp delivery |
| Load / performance | Queue backlog under bulk send |
| Accessibility | Portal + CRM WCAG spot check |

---

## Related documents

- [03-crm-module.md](./03-crm-module.md)
- [04-portal-module.md](./04-portal-module.md)
- [05-payments-module.md](./05-payments-module.md)
- [13-business-workflows.md](./13-business-workflows.md)
- [docs/05-Development/Testing.md](../05-Development/Testing.md)
