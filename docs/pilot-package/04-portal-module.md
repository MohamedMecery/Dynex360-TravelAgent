# TravelOS Customer Portal Module

**Scope:** Customer self-service (Sprint 8A foundation + 8B transactions + 9A payments)  
**Migrations:** `039`–`042`  
**Last updated:** 2026-06-04

---

## Purpose

Provide customers a secure, tenant-branded channel to view quotations and bookings, accept or reject proposals, pay deposits via Paymob, manage notification preferences, and download documents—without CRM staff credentials.

---

## Identity and security model

| Concept | Implementation |
|---------|----------------|
| Account | `customer_portal_accounts` — 1:1 with `customers` |
| Auth | Supabase Auth (separate from `public.users`) |
| JWT claims | `user_type: customer`, `customer_id`, `tenant_id` |
| API gate | `requirePortalApiAccess()` on all `/api/portal/*` |
| Staff isolation | Staff sessions cannot call portal APIs; portal users cannot access CRM |

Cross-customer access returns **404** (not 403) to prevent enumeration.

---

## Login

### User workflow

1. Customer opens `/portal/login`.
2. Enters email/password (portal provisioned account).
3. Supabase issues session; hook injects customer context.
4. Redirect to `/portal` dashboard.

### Business rules

- Portal account must be active and linked to non-deleted customer.
- Staff emails fail portal login even if they exist in Supabase Auth as staff.
- Session refresh follows standard Supabase client behavior.

### Validation rules

- Email/password required; Supabase Auth error messages surfaced in UI.
- Account provisioning is staff/script operation (`scripts/provision-portal-test-account.mjs` for test).

### Permissions

- Public route (unauthenticated).
- No RBAC; possession of portal credentials required.

---

## Password reset

### User workflow

1. `/portal/forgot-password` — request reset link.
2. Email sent via **Supabase Auth SMTP** (configured in Supabase Dashboard, not Vercel).
3. Customer follows link to `/portal/reset-password`.
4. Sets new password; returns to login.

### Business rules

- Reset URLs must be listed in Supabase **Redirect URLs** (`YOUR_APP_URL/reset-password`, etc.).
- `NEXT_PUBLIC_SITE_URL` must match production domain for link generation.

### Restrictions

- Portal cannot reset staff passwords.
- IT must verify SMTP before pilot (see Pilot Execution Runbook §1.5).

---

## Quotations

### User workflow

1. List quotations (`/portal/quotations`) — post-send statuses only.
2. Open detail: line items, totals, validity, timeline.
3. Download PDF (`GET /api/portal/quotations/:id/pdf`).
4. Accept or reject (see Acceptance).
5. After accept, **Pay Now** when tenant payments enabled (see Payments module).

### Visible statuses

`sent`, `viewed`, `accepted`, `rejected`, `expired`, `converted_to_booking`

**Hidden:** `draft`, `pending_approval`, `approved` (pre-send internal states).

### Business rules

| Rule | Description |
|------|-------------|
| Ownership | RLS + API filter `customer_id = portal customer` |
| Auto viewed | Accept/reject from `sent` marks `viewed` first |
| Expiry | Accept blocked with `422 QUOTATION_EXPIRED` when past validity |
| Conflict | `409` if already accepted/rejected |

### Validation rules

- Reject body: optional `reason` (schema-validated).
- PDF locale from cookie/query; branding from `tenant_settings`.

### Permissions

- Authenticated portal session only.
- No staff permission involved.

---

## Acceptance

### User workflow

1. From quotation detail, customer taps **Accept** or **Reject**.
2. `POST /api/portal/quotations/:id/accept` or `.../reject`.
3. Server reuses CRM `acceptQuotation` / `rejectQuotation` via admin client (portal lacks CRM UPDATE RLS).
4. Audit via `log_portal_customer_audit` RPC.
5. Transactional email sent asynchronously (`quotation_accepted` / `quotation_rejected`).

### Business rules

| Rule | Description |
|------|-------------|
| Eligible status | `sent` or `viewed` |
| Duplicate | `409` if terminal state already set |
| Active accepted quote | CRM assert prevents conflicting accepts on same opportunity |
| Events | May enqueue notifications and WhatsApp jobs (8D worker) |

### Validation rules

- Reject: optional reason string max length per schema.
- Accept: no body required; server validates quotation state.

---

## Notifications

### User workflow

1. View list at `/portal/notifications` (or dashboard widget).
2. `GET /api/portal/notifications` with pagination.
3. Mark one read: `POST /api/portal/notifications/:id/read`.
4. Mark all: `POST /api/portal/notifications/read-all`.
5. Unread badge: `GET /api/portal/notifications/unread-count`.

### Business rules

- Notifications created by `dispatch.notification` worker jobs from domain events.
- Portal users see only their `customer_id` scoped rows.
- Read state is per notification recipient record.

### Permissions

- Portal session required.

---

## Preferences

### User workflow

1. Open `/portal/preferences`.
2. Set WhatsApp opt-in/out, preferred language (`en` / `ar`), quiet hours.
3. `GET/PATCH /api/portal/preferences`.

### Business rules

| Rule | Description |
|------|-------------|
| Opt-in required | WhatsApp dispatcher skips if not opted in |
| Quiet hours | Dispatcher skips sends inside configured window |
| CRM mirror | Staff can edit same record via `GET/PATCH /api/customers/:id/communication-preferences` |

### Validation rules

- Quiet hours: start/end time consistency.
- Language enum validation.

---

## Portal API summary

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/portal/me` | Profile |
| GET | `/api/portal/dashboard` | Summary cards |
| GET | `/api/portal/quotations` | List |
| GET | `/api/portal/quotations/:id` | Detail |
| POST | `/api/portal/quotations/:id/accept` | Accept |
| POST | `/api/portal/quotations/:id/reject` | Reject |
| GET | `/api/portal/quotations/:id/timeline` | Status timeline |
| GET | `/api/portal/quotations/:id/pdf` | PDF download |
| POST | `/api/portal/quotations/:id/checkout` | Start Paymob checkout |
| GET | `/api/portal/payment-orders/:id` | Payment status |
| GET | `/api/portal/bookings` | Booking list |
| GET | `/api/portal/bookings/:id` | Booking detail |
| GET | `/api/portal/bookings/:id/documents` | Document list |
| GET | `/api/portal/bookings/:id/documents/:documentId` | Document download redirect |
| GET/PATCH | `/api/portal/preferences` | Communication prefs |
| GET | `/api/portal/notifications` | Notifications |
| POST | `/api/portal/notifications/:id/read` | Mark read |
| POST | `/api/portal/notifications/read-all` | Mark all read |
| GET | `/api/portal/notifications/unread-count` | Badge count |

---

## UI routes

| Route | Purpose |
|-------|---------|
| `/portal/login` | Login |
| `/portal/forgot-password` | Reset request |
| `/portal/reset-password` | Reset form |
| `/portal` | Dashboard |
| `/portal/quotations` | List |
| `/portal/quotations/[id]` | Detail + accept/reject/pay |
| `/portal/bookings` | List |
| `/portal/bookings/[id]` | Detail + documents |
| `/portal/profile` | Account info |
| `/portal/preferences` | Communication settings |
| `/portal/payment-orders/[id]` | Payment status |

---

## Related documents

- [05-payments-module.md](./05-payments-module.md)
- [06-whatsapp-module.md](./06-whatsapp-module.md)
- [docs/03-Architecture/Customer-Portal-Foundation-Report.md](../03-Architecture/Customer-Portal-Foundation-Report.md)
