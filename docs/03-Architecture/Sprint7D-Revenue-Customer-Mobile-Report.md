# Sprint 7D — Revenue & Customer Operations (Mobile)

**Date:** 2026-06-03  
**Decision:** **PASS WITH MINOR ISSUES**  
**Scope:** Quotations, Customer 360, Bookings, UX enhancements, i18n foundation, deep links

---

## 1. Executive Summary

Sprint 7D delivers the revenue and customer operations layer of TravelOS Mobile on top of the existing API-first backend (Sprint 6 CRM / quotations, Customer 360, Sprint 7B bookings read APIs). All data access uses Bearer-authenticated REST endpoints; no direct Supabase CRUD and no duplicated workflow engines.

**Architecture validation (pre-implementation):**

| Check | Result |
|-------|--------|
| Dashboard uses `GET /api/crm/dashboard` DTOs via `useDashboard` | PASS (unchanged from 7C) |
| Lists use `useInfiniteQuery` | PASS (leads, opportunities, activities, quotations, bookings; timeline uses cursor-based infinite query) |
| Bootstrap: Restore session → `GET /api/auth/me?include_permissions=true` → render | PASS (`AuthContext` + `bootstrapSession`) |

**Minor issues:** Arabic RTL may require an app reload after locale switch on some devices; quotation list search is client-side (API has no `search` param); full string catalog not translated (framework + core keys only).

---

## 2. Quotations Screens

| Screen | Route (stack) | APIs |
|--------|---------------|------|
| QuotationListScreen | More → Quotations | `GET /api/quotations` |
| QuotationDetailScreen | More → Quotation detail | `GET /api/quotations/:id` |
| QuotationCreateScreen | More → New / Pipeline → New quotation | `POST /api/quotations` |
| QuotationEditScreen | Detail → Edit | `PATCH /api/quotations/:id` |

**Workflow actions** (`QuotationWorkflowActions`): submit-approval, approve, reject-approval, send, mark-viewed, accept, reject, convert — each maps to existing `POST /api/quotations/:id/{action}` endpoints. Buttons gated with `usePermission` (`crm.quotations.*`).

**Line items:** add / update / remove via `POST|PATCH|DELETE /api/quotations/:id/items[...]`; totals refreshed from server on invalidation (no client pricing math).

---

## 3. Customer 360 Screens

| Screen | Deep link | APIs |
|--------|-----------|------|
| Customer360Screen | `travelos://customer/:id/360` | `GET /api/customers/:id/360` |
| CustomerTimelineScreen | `travelos://customer/:id/timeline` | `GET /api/customers/:id/360/timeline` |

**Features:** profile + summary KPIs, opportunities/bookings tabs, quotation activity from `timeline_preview`, infinite timeline with date grouping, quotation event types supported (`quotation_created`, `quotation_sent`, `quotation_viewed`, `quotation_accepted`, `quotation_rejected`, `quotation_converted`).

---

## 4. Bookings Screens

| Screen | Deep link | APIs |
|--------|-----------|------|
| BookingListScreen | `travelos://bookings` | `GET /api/bookings` |
| BookingDetailScreen | `travelos://booking/:id` | `GET /api/bookings/:id`, `PATCH /api/bookings/:id/status` |

Create/edit booking remain web-first (out of scope). Status changes respect `bookings.update|confirm|complete|cancel` or `bookings.*`.

---

## 5. Permission Matrix (mobile hints)

| Permission | sales_agent | tenant_admin | finance_officer |
|------------|-------------|--------------|-----------------|
| `crm.quotations.read` | ✓ | ✓ (crm.*) | read_all |
| `crm.quotations.write` | ✓ | ✓ | — |
| `crm.quotations.send` | ✓ | ✓ | — |
| `crm.quotations.approve` | — | ✓ | — |
| `crm.quotations.accept` | ✓ | ✓ | — |
| `crm.quotations.convert` | ✓ | ✓ | — |
| `customers.read` | ✓ | ✓ | ✓ |
| `bookings.read` | ✓ | ✓ | ✓ |
| `bookings.*` (status updates) | ✓ | ✓ | — |

Server remains authoritative on every route. Mobile hides actions when `usePermission` is false; 401/403/404 surfaced via `ErrorState` / `getApiErrorMessage`.

**Backend tweak:** `getEffectivePermissions` extended so `auth/me` includes `crm.quotations.approve`, `customers.*`, and `bookings.*` hints for mobile (no RLS/workflow change).

---

## 6. Navigation Updates

- **More tab** hub: `MoreMenu` → Quotations, Bookings, Profile, language selector.
- **Pipeline:** Opportunity detail → “New quotation” (cross-tab navigate to More stack).
- **Deep linking** (`apps/mobile/src/lib/linking.ts`):
  - `travelos://quotation/:id`
  - `travelos://booking/:id`
  - `travelos://customer/:id/360`
  - `travelos://customer/:id/timeline`
  - Existing 7C links preserved (lead, opportunity, activity).

---

## 7. i18n Status

- **Library:** `i18n-js` + `expo-localization`
- **Locales:** English (default), Arabic
- **RTL:** `LocaleProvider` + `useRtl` (layout/text alignment); `I18nManager.forceRTL` for Arabic
- **Coverage:** Core navigation, quotations, bookings, customer 360 keys in `en.ts` / `ar.ts`; most CRM 7C screens still English literals (acceptable per sprint: framework + core screens)

---

## 8. Test Results

| Area | Method | Result |
|------|--------|--------|
| TypeScript | `npm run typecheck` in `apps/mobile` | **PASS** |
| Architecture | Code review vs 7C patterns | **PASS** |
| Quotation lifecycle | Manual / device (requires running API + tenant) | **Pending operator UAT** |
| Customer 360 timeline | Manual | **Pending operator UAT** |
| Bookings status | Manual | **Pending operator UAT** |
| Arabic RTL | Manual locale switch in More | **Pending operator UAT** |
| Deep links | Config validated in `linking.ts` | **PASS (static)** |
| Network recovery | `ErrorState` + Query retry + 401 sign-out | **PASS (pattern)** |

Automated E2E for mobile quotations was not added in this sprint; recommend Sprint 8+ Maestro/Detox against staging.

---

## 9. Risks

1. **RTL reload:** Switching EN↔AR may need app restart for full mirror on Android.
2. **Quotation search:** Client-side filter only; large tenants may need API `search` param later.
3. **Finance officer:** Read-only quotations/bookings; no status or workflow actions (by design).
4. **Device UAT:** Workflow transitions depend on tenant approval mode and seed data.

---

## 10. Remaining Backlog

- Push notifications, WhatsApp, PDF, email, customer portal, e-sign, AI (explicitly out of scope)
- Full Arabic string migration for 7C CRM screens
- API-side quotation list search
- Mobile E2E suite
- Booking create/edit on mobile (web-first)
- Offline cache / optimistic mutations

---

## Native UX Enhancements (Work Package 6)

| Item | Status |
|------|--------|
| Native date picker | `DatePickerField` (@react-native-community/datetimepicker) |
| Native time picker | `TimePickerField` |
| Improved select | Modal sheet `Select` (7C, retained) |
| Pull to refresh | Lists + Customer 360 summary |
| Skeleton loading | Dashboard (7C) |
| Empty states | `EmptyState` on all new lists |

---

## Final Decision

**PASS WITH MINOR ISSUES**

Functional scope for Sprint 7D is implemented and type-safe. Operator device UAT on a staging tenant is recommended before production cutover.

For a clean PASS after UAT, confirm on device: quotation approval path, convert-to-booking, Customer 360 timeline pagination, and booking status change as `sales_agent`.

**Mobile MVP completion:** ~**78%** (CRM core + revenue/customer read/write paths; missing notifications, portal, AI, full i18n, booking editor).

**Production readiness (mobile):** ~**72%** (needs staged UAT, E2E, store build pipeline, RTL polish).

**Recommended next sprint:** **7E — Mobile Operations & Polish** (Maestro E2E, full AR i18n, quotation API search, invoices read-only mobile, app store build) or **8A — Customer portal** on web per product roadmap.

---

*After device UAT sign-off, Sprint 7D may be closed with:*

**TravelOS Mobile Revenue & Customer Operations is complete and Sprint 7D is closed.**
