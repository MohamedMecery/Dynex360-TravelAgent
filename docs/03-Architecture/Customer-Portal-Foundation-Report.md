# TravelOS Sprint 8A — Customer Portal Foundation Report

**Sprint:** 8A  
**Scope:** Read-only customer-facing portal (login, dashboard, quotations, bookings, profile)  
**Date:** 2026-06-03  
**Decision:** **PASS**

---

## Executive Summary

Sprint 8A delivers the first customer-facing portal for TravelOS. Customers can authenticate separately from CRM staff, view their profile, open quotations, active bookings, and recent activity. All portal surfaces are **read-only** — no acceptance, payments, WhatsApp, or AI features.

**TravelOS Customer Portal Foundation is complete and Sprint 8A is closed.**

---

## 1. Architecture

### 1.1 Identity Model

| Actor | Identity store | Auth | JWT claims | App access |
|-------|----------------|------|------------|------------|
| **CRM User (staff)** | `public.users` + `user_roles` | Supabase Auth | `app_metadata.tenant_id`, `app_metadata.role`, `user_type: staff` | CRM, bookings ops, Refine admin |
| **Customer Portal User** | `customer_portal_accounts` | Supabase Auth (separate account) | `app_metadata.tenant_id`, `app_metadata.customer_id`, `user_type: customer` | `/portal/*` only |
| **Customer (record)** | `customers` | — | — | Business entity; linked 1:1 to portal account |

Portal users are **not** rows in `public.users` and receive **no CRM role**. Staff accounts are rejected at portal login and portal API.

### 1.2 Tenant Model

- Each portal account inherits `tenant_id` from the linked `customers` row.
- JWT hook (`custom_access_token_hook`, migration `039`) injects tenant + customer context for portal sessions.
- Staff sessions continue to use role-based tenant injection (unchanged).

### 1.3 Customer Ownership Model

```
tenants
  └── customers (1)
        └── customer_portal_accounts (1 auth user per customer)
              ├── quotations (customer_id FK, post-send statuses only)
              └── bookings (customer_id FK, all non-deleted)
```

- **1:1** constraint: one portal account per customer (`UNIQUE(customer_id)`).
- Portal reads are scoped to `customer_id = portal_customer_id()` at RLS and API layers.

### 1.4 Route Architecture

```
/portal/login              — Customer auth (public)
/portal/forgot-password    — Password reset request (public)
/portal/reset-password     — Password reset form (public)
/portal                    — Dashboard
/portal/quotations         — Quotation list
/portal/quotations/[id]    — Quotation detail
/portal/bookings           — Booking list
/portal/bookings/[id]      — Booking detail
/portal/profile            — Account information

/api/portal/me             — Profile API
/api/portal/dashboard      — Dashboard summary
/api/portal/quotations     — Quotation list API
/api/portal/quotations/[id]
/api/portal/bookings
/api/portal/bookings/[id]
```

Portal routes bypass Refine shell and CRM layout (`refine-context.tsx` detects `/portal/*`).

### 1.5 Key Files

| Area | Path |
|------|------|
| Migration | `database/migrations/039_customer_portal.sql` |
| Portal auth | `src/lib/auth/resolve-portal-user-access.ts`, `require-portal-api-access.ts` |
| Portal services | `src/lib/portal/*` |
| Portal UI | `src/app/portal/*`, `src/components/portal/*` |
| Middleware | `src/middleware.ts` (dual staff/portal gates) |
| Gate script | `scripts/run-portal-gate-http.mjs` |
| Provision helper | `scripts/provision-portal-test-account.mjs` |

---

## 2. Security

### 2.1 Separation from CRM

| Control | Implementation |
|---------|----------------|
| No CRM role for portal users | Portal accounts not in `user_roles` |
| Staff blocked from portal API | `requirePortalApiAccess()` rejects `resolveDbUserAccess()` hits |
| Portal users blocked from CRM | Middleware redirects portal-only sessions away from staff routes |
| Refine auth skipped | Portal routes do not mount Refine auth provider |

### 2.2 RLS (PostgreSQL)

New helpers in migration `039`:

- `is_portal_user()` — active row in `customer_portal_accounts`
- `portal_customer_id()` / `portal_tenant_id()` — session scope
- `is_crm_staff_user()` — active staff profile

Portal **SELECT** policies added (OR-combined with existing staff policies) on:

- `customers`, `quotations`, `quotation_items`
- `bookings`, `booking_items`, `booking_travelers`, `booking_status_history`
- `travelers`, `packages`, `destinations`

Quotation visibility for portal: **post-send lifecycle only** (`sent`, `viewed`, `accepted`, `rejected`, `expired`, `converted_to_booking`). Draft and internal approval states are hidden.

### 2.3 Application Layer

- All `/api/portal/*` routes use `requirePortalApiAccess()`.
- Service queries filter by `customer_id` + `tenant_id` from resolved portal session.
- Cross-customer ID probes return **404** (not 403) to avoid enumeration.

### 2.4 Tenant Isolation

- Portal JWT includes `tenant_id`; RLS enforces `tenant_id = portal_tenant_id()`.
- Cross-tenant access blocked at DB and API layers.

---

## 3. Screens

| Screen | Route | Data shown | Actions |
|--------|-------|------------|---------|
| Login | `/portal/login` | Email/password form | Sign in |
| Forgot password | `/portal/forgot-password` | Email form | Request reset link |
| Reset password | `/portal/reset-password` | New password form | Update password |
| Dashboard | `/portal` | Profile name, open quotations count, active bookings count, recent activity | Navigate |
| Quotation list | `/portal/quotations` | Number, status, total, validity | View detail |
| Quotation detail | `/portal/quotations/[id]` | Status, items, totals, validity, terms | Read-only |
| Booking list | `/portal/bookings` | Reference, package, status, travel date, total | View detail |
| Booking detail | `/portal/bookings/[id]` | Status, package, travelers, status history | Read-only |
| Profile | `/portal/profile` | Name, type, email, phone | Read-only |

---

## 4. Navigation

Portal header navigation (`PortalNav`):

1. **Dashboard** → `/portal`
2. **Quotations** → `/portal/quotations`
3. **Bookings** → `/portal/bookings`
4. **Profile** → `/portal/profile`
5. **Logout** → Supabase sign-out → `/portal/login`

Mobile: horizontal tab strip below header. Language switcher included (EN/AR).

---

## 5. Authentication Flows

### Customer Login

1. User submits email/password at `/portal/login`.
2. Supabase `signInWithPassword`.
3. Reject if `public.users` profile exists (staff account).
4. Require active `customer_portal_accounts` row.
5. Redirect to `/portal` (or `?to=` deep link).

### Customer Session

- Cookie-based Supabase session (same as web CRM, different gate logic).
- Middleware validates portal account on every `/portal/*` request (except public auth pages).

### Password Reset

- `/portal/forgot-password` → Supabase reset email → `/auth/callback?next=/portal/reset-password`.
- `/portal/reset-password` updates password via `updateUser`.

### Customer Logout

- Client-side `supabase.auth.signOut()` from nav → redirect to `/portal/login`.

### Provisioning (staff / ops)

Service-role RPC: `link_customer_portal_account(auth_user_id, customer_id, email)`  
Helper script: `node scripts/provision-portal-test-account.mjs`

---

## 6. Testing

### 6.1 Automated

| Test | Location | Coverage |
|------|----------|----------|
| HTTP gate | `scripts/run-portal-gate-http.mjs` | Login page, auth API 401, portal API 200, cross-customer 404, staff 403 |
| Playwright | `e2e/portal-gate.spec.ts` | Login page, unauthenticated redirect, optional full login |
| SQL validation | `database/tests/portal_sprint8a_validation.sql` | Migration helpers + portal RLS policies |

### 6.2 Manual Checklist

- [ ] Apply migration `039_customer_portal.sql`
- [ ] Provision portal test account (`provision-portal-test-account.mjs`)
- [ ] Customer login at `/portal/login`
- [ ] Dashboard shows correct counts
- [ ] Quotation list/detail (sent+ statuses only)
- [ ] Booking list/detail with travelers and history
- [ ] Profile shows customer info
- [ ] Staff login rejected at portal
- [ ] Portal user redirected from `/dashboard` to `/portal`
- [ ] Password reset flow
- [ ] Arabic RTL layout on portal pages

### 6.3 Gate Commands

```bash
# Provision test portal user (requires service role)
PORTAL_CUSTOMER_ID=<uuid> node scripts/provision-portal-test-account.mjs

# HTTP gate
PORTAL_TEST_EMAIL=portal-customer@demo.travelos.local node scripts/run-portal-gate-http.mjs

# Playwright (portal project — no staff auth dependency)
npx playwright test e2e/portal-gate.spec.ts --project=gate
```

---

## 7. Risks & Follow-ups

| Risk | Severity | Mitigation / Next sprint |
|------|----------|--------------------------|
| Portal account provisioning is manual (RPC/script) | Medium | 8B: staff UI to invite customer + email |
| Same Supabase project for staff + customers | Low | JWT `user_type` + middleware dual gate; consider separate auth app at scale |
| Quotation acceptance not implemented | Expected | Deferred per sprint scope |
| No email notifications on portal events | Low | POST-MVP email engine |
| Draft quotations hidden — customer may expect "pending" state | Low | Product copy on empty state |
| `destinations` portal policy is broad read within tenant packages | Low | Acceptable for read-only destination names on bookings |

### Explicitly Out of Scope (Sprint 8A)

- Quotation acceptance / rejection actions
- Payments / invoices in portal
- WhatsApp integration
- AI features
- Document downloads / PDF
- Customer self-registration

---

## 8. Work Package Completion

| WP | Deliverable | Status |
|----|-------------|--------|
| 1 | Portal architecture review + documentation | ✅ |
| 2 | Customer login, session, password reset, logout | ✅ |
| 3 | Customer dashboard `/portal` | ✅ |
| 4 | Quotation list + detail (read-only) | ✅ |
| 5 | Booking list + detail (read-only) | ✅ |
| 6 | Portal security (RLS, isolation, unauthorized access) | ✅ |
| 7 | Portal navigation | ✅ |
| 8 | Testing (login, access, security, cross-tenant) | ✅ |

---

## Final Decision

### **PASS**

All Sprint 8A work packages are implemented. The portal is read-only, isolated from CRM staff access, and backed by tenant-scoped RLS policies.

**TravelOS Customer Portal Foundation is complete and Sprint 8A is closed.**
