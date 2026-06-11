# TravelOS Mobile Backend Foundation

**Sprint:** 7B  
**Status:** Complete (foundation only)

---

## Authentication architecture

```
┌─────────────┐     Bearer JWT      ┌──────────────────┐
│ Expo Mobile │ ──────────────────► │ Next.js /api/*   │
└─────────────┘                     │ requireActiveApi │
       │                            │ Access()         │
       │ Supabase Auth              └────────┬─────────┘
       ▼                                     │
┌─────────────┐                     validateActiveAccount
│  Supabase   │                     (DB users + roles)
│    Auth     │
└─────────────┘

┌─────────────┐     SSR cookies     ┌──────────────────┐
│  Web Refine │ ──────────────────► │ Same API layer   │
└─────────────┘                     └──────────────────┘
```

## Bearer flow (mobile)

1. `signInWithPassword` via `@supabase/supabase-js` + SecureStore.
2. Read `session.access_token`.
3. Call `GET {API_URL}/api/auth/me` with `Authorization: Bearer …`.
4. Server `createApiClient()` builds Supabase client with global Bearer header.
5. `getUser()` validates JWT; `validateActiveAccountAccess()` checks DB + claim consistency.

## Cookie flow (web)

1. Middleware refreshes Supabase session cookies.
2. Browser `fetch("/api/...")` sends cookies automatically.
3. `createApiClient()` falls back to `createClient()` (SSR cookie adapter).

## JWT lifecycle

| Event | Behavior |
|-------|----------|
| Login | Supabase issues access + refresh tokens |
| API call | Access token in Bearer header |
| Refresh | Supabase client `autoRefreshToken` (mobile SecureStore) |
| Logout | `signOut()` clears storage; API returns 401 without token |
| Inactive account | `403` with `ACCOUNT_INACTIVE` / status codes |

## Session storage (mobile)

- Adapter: `apps/mobile/src/lib/secure-storage.ts` (Expo SecureStore, chunked for large sessions).
- Config: `apps/mobile/src/lib/supabase.ts`.

## Profile contract

**`GET /api/auth/me`**

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Auth user id |
| `email` | string | |
| `full_name` | string \| null | From `user_metadata` |
| `tenant_id` | uuid | DB authoritative |
| `role` | enum | DB authoritative |
| `account_status` | `pending` \| `active` \| `inactive` | DB authoritative |
| `permissions` | string[] | Optional; `?include_permissions=true` |

## Bookings contracts

### `GET /api/bookings`

Query (Zod): `page`, `limit`, `status`, `payment_status`, `customer_id`, `date_from`, `date_to`, `search`

Service: `src/lib/bookings/bookings-service.ts` — tenant filter + RLS via user-scoped Supabase client.

### `GET /api/bookings/:id`

Returns booking + `booking_items` + `booking_travelers` + `booking_status_history`.

Permission: `bookings.read` (`src/lib/auth/bookings-permissions.ts`).

## Assignee contract

**`GET /api/users/assignees`**

- Active users in tenant with assignable roles (`tenant_admin`, `sales_agent`, `finance_officer`).
- Permission: `canReadAssignees()` — CRM users without full `users.read`.
- Optional `search` on name/email.

## Mobile setup guide

1. Copy `apps/mobile/.env.example` → `.env`.
2. `cd apps/mobile && npm install`.
3. Run web API: `npm run dev` from repo root.
4. `npm start` in `apps/mobile`.
5. Sign in with staging sales user.

## Expo architecture

```
apps/mobile/src/
  auth/          AuthContext, session bootstrap
  hooks/         useAuth
  lib/           supabase, api-client, env, linking, secure-storage
  navigation/    Root stack (Bootstrap → Login | Main)
  providers/     TanStack Query
  screens/       Login, Bootstrap, Home placeholder only
  types/         AuthProfile
```

## Deep linking

- Scheme: `travelos` (`app.json`)
- Config: `src/lib/linking.ts`
- Routes: `travelos://login`, `travelos://home`

## Environment configuration

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `EXPO_PUBLIC_API_URL` | Next.js origin (no trailing slash) |

## Known limitations (Sprint 7B)

- No CRM/booking UI screens (7C/7D).
- Bookings **create/update** remain web Refine paths; only **read** + status PATCH APIs for mobile.
- Push notifications not implemented.
- Password reset UI not in mobile shell (Supabase email link only).
- `include_permissions` is a hint list; server always re-checks per route.

## Validation

```bash
npm run test:auth-bearer
GATE_BASE_URL=http://localhost:3000 npm run gate:sprint7b:foundation
```

See `docs/03-Architecture/Sprint7B-Foundation-Validation.md`.
