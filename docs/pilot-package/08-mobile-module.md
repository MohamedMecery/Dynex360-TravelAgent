# TravelOS Mobile Module

**App location:** `apps/mobile/` (Expo)  
**Sprints:** 7B (foundation), 7C (CRM core), 7D (revenue/customer), 7E (readiness)  
**Last updated:** 2026-06-04

---

## Purpose

Extend TravelOS CRM to field sales staff on iOS/Android with the same API and RBAC as the web admin, using Bearer JWT authentication instead of browser cookies.

---

## Mobile architecture

```mermaid
flowchart TB
    subgraph mobile [Expo App]
        Auth[AuthContext + SecureStore]
        Nav[React Navigation]
        RQ[TanStack Query]
        Screens[Screens / Components]
    end

    subgraph api [Next.js API]
        Me[/api/auth/me]
        CRM[/api/leads ...]
    end

    subgraph supa [Supabase Auth]
        Session[JWT access + refresh]
    end

    Screens --> RQ --> api
    Auth --> supa
    Auth --> Me
```

### Key packages

| Area | Technology |
|------|------------|
| Runtime | Expo SDK |
| Navigation | React Navigation (stack + bottom tabs) |
| Data | TanStack Query + typed API hooks |
| Auth | `@supabase/supabase-js` + SecureStore adapter |
| i18n | EN/AR with RTL hook (`useRtl`) |
| E2E | Maestro flows (`apps/mobile/maestro/`) |

### Configuration

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `EXPO_PUBLIC_API_URL` | Next.js origin (e.g. `http://localhost:3000`) |

---

## Authentication flow

1. `LoginScreen` → `signInWithPassword`.
2. Tokens persisted in `secure-storage.ts` (chunked for large sessions).
3. `BootstrapScreen` calls `GET /api/auth/me` with `Authorization: Bearer {access_token}`.
4. `validateActiveAccountAccess` on server; inactive → 403.
5. Auto token refresh via Supabase client.
6. Logout clears SecureStore and resets navigation to login.

Deep linking scheme: `travelos://` (`travelos://login`, `travelos://home`).

---

## Navigation structure

### Root

`RootNavigator` → `Bootstrap` | `Login` | `Main`

### Main tabs (`MainTabNavigator`)

| Tab | Stack | Primary screens |
|-----|-------|-----------------|
| **Home** | `DashboardStack` | Dashboard |
| **Leads** | `LeadsStack` | Lead list, detail, create/edit |
| **Pipeline** | `PipelineStack` | Opportunity list, detail, create/edit |
| **Activities** | `ActivitiesStack` | Activity list, detail, create/edit |
| **More** | `MoreStack` | Menu, profile, quotations, bookings, Customer 360 |

---

## Screens inventory

| Screen | Path in app | API hooks |
|--------|-------------|-----------|
| BootstrapScreen | Session gate | `useAuth` |
| LoginScreen | Auth | Supabase |
| DashboardScreen | Home tab | `useDashboard`, ops AI KPI |
| LeadListScreen | Leads | `useLeads` |
| LeadDetailScreen | | `useLeads` |
| LeadFormScreen | Create/edit | |
| OpportunityListScreen | Pipeline | `useOpportunities` |
| OpportunityDetailScreen | | |
| OpportunityFormScreen | | |
| ActivityListScreen | Activities | `useActivities` |
| ActivityDetailScreen | | |
| ActivityFormScreen | | |
| QuotationListScreen | More → Quotations | `useQuotations` |
| QuotationDetailScreen | | + workflow actions component |
| QuotationFormScreen | Create/edit | |
| BookingListScreen | More → Bookings | `useBookings`, `useOperationsAi` |
| BookingDetailScreen | | |
| Customer360Screen | More | `useCustomer360` |
| CustomerTimelineScreen | | Timeline |
| MoreMenuScreen | More hub | |
| ProfileScreen | User profile | `useAuth` |

---

## Supported workflows

| Workflow | Mobile support | Notes |
|----------|:--------------:|-------|
| Login / logout | ✓ | |
| View CRM dashboard KPIs | ✓ | |
| Lead CRUD (own) | ✓ | Permission-gated in UI |
| Opportunity CRUD (own) | ✓ | |
| Activity CRUD | ✓ | |
| Quotation list/detail/create/edit | ✓ | Send/accept may use workflow component |
| Quotation send to customer | ✓ | When `crm.quotations.send` |
| Booking list/detail | ✓ | Read-focused; status badges from ops AI |
| Customer 360 + timeline | ✓ | Read |
| Assignee pickers | ✓ | `GET /api/users/assignees` |
| Sales AI chat | Partial | Hooks exist (`useSalesAi`); full UI may be web-first |
| Operations AI badges | ✓ | Booking list health/readiness |
| Portal / payments | ✗ | Web portal only |
| WhatsApp send | ✗ | CRM web only (9B scope) |
| User/tenant admin | ✗ | |
| Knowledge / booking / support agents | ✗ | Web `/ai/*` |

---

## API client

`apps/mobile/src/lib/api-client.ts`:

- Attaches Bearer token from session.
- Same JSON error envelope as web.
- Base URL from `EXPO_PUBLIC_API_URL`.

CRM types: `apps/mobile/src/types/crm.ts`, `lib/api/crm.ts`.

---

## Permissions on mobile

Mobile does not bypass RBAC. UI should hide actions based on `role` from `/api/auth/me` (optional `include_permissions=true`). Server always enforces permissions on API routes.

---

## RTL and localization

- `LocaleProvider` with `en` and `ar` string tables.
- `useRtl()` adjusts layout for Arabic.
- Maestro flow `05-arabic-rtl.yaml` validates RTL smoke.

---

## Release and CI

| Item | Location |
|------|----------|
| EAS config | `apps/mobile/eas.json` |
| CI workflow | `.github/workflows/mobile-ci.yml` |
| Checklist | `docs/05-Development/Mobile-Release-Checklist.md` |

Mobile ships on a **separate release track** from web pilot (per launch readiness report).

---

## Related documents

- [01-system-overview.md](./01-system-overview.md)
- [docs/03-Architecture/ADR-Mobile-API-Dual-Auth.md](../03-Architecture/ADR-Mobile-API-Dual-Auth.md)
- [docs/03-Architecture/TravelOS-Mobile-Backend-Foundation.md](../03-Architecture/TravelOS-Mobile-Backend-Foundation.md)
