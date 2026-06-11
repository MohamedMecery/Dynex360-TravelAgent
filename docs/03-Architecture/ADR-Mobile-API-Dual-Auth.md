# ADR: Mobile API Dual Authentication (Cookie + Bearer)

**Status:** Accepted  
**Date:** 2026-06-03  
**Sprint:** 7B

## Context

TravelOS web uses Supabase SSR cookies for `/api/*` routes. Mobile (Expo) cannot rely on Next.js cookie jars. Sprint 7A gated mobile on Bearer support without duplicating business logic or introducing a separate backend.

## Decision

1. Introduce `createApiClient()` that selects:
   - **Bearer** when `Authorization: Bearer <token>` is present
   - **Cookie** otherwise (existing `createClient()` SSR path)
2. Centralize all API authorization in `requireActiveApiAccess()` (unchanged call sites).
3. Bypass page-auth middleware redirects for `/api/*`; return JSON errors from handlers.
4. **API-first reads for bookings** — no mobile Supabase direct reads for bookings (Sprint 7B scope).

## Consequences

**Positive**

- Web `fetch("/api/...")` unchanged (credentials: include by default in browser).
- Mobile uses one Supabase session + Bearer on TravelOS API.
- Single permission and tenant validation path.

**Negative**

- Bearer clients must refresh tokens via Supabase client; expired tokens receive `401`.
- E2E scripts must set Bearer or valid SSR cookie format.

## Alternatives rejected

| Alternative | Reason rejected |
|-------------|-----------------|
| Supabase-only reads for bookings on mobile | Violates API-first; duplicates RLS vs service rules |
| Separate mobile BFF | Violates “no separate mobile backend” |
| API keys per device | Not aligned with Supabase Auth / JWT model |

## References

- `src/lib/supabase/api-client.ts`
- `src/lib/auth/require-active-api-access.ts`
- `docs/03-Architecture/TravelOS-Mobile-Backend-Foundation.md`
