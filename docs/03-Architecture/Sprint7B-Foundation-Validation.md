# Sprint 7B Foundation — Validation

**Date:** 2026-06-03

## Automated checks

| Check | Command | Expected |
|-------|---------|----------|
| Bearer parser unit tests | `npm run test:auth-bearer` | All pass |
| TypeScript | `npm run typecheck` | Exit 0 |
| HTTP gate (cookie + Bearer) | `GATE_BASE_URL=http://localhost:3000 npm run gate:sprint7b:foundation` | 0 failures |

## HTTP gate coverage

| Section | Item |
|---------|------|
| cookie | `GET /api/auth/me` |
| cookie | `GET /api/crm/dashboard` regression |
| bearer | `GET /api/auth/me` |
| bearer | `GET /api/bookings` |
| bearer | `GET /api/bookings/:id` |
| bearer | `GET /api/users/assignees` |
| security | Unauthenticated → 401 |
| security | Invalid Bearer → 401 |
| middleware | `/api/leads` without auth → JSON 401 (not HTML) |

## Results (local run)

> Run `npm run gate:sprint7b:foundation` with dev server and `.env.local` configured.  
> Output: `scripts/sprint7b-foundation-gate-results.json`

| Run | Environment | Result |
|-----|-------------|--------|
| Unit tests | CI/local | Run `npm run test:auth-bearer` to confirm |
| HTTP gate | Requires `next dev` + Supabase | Run when staging/local API is up |

## Manual mobile smoke

1. Set `apps/mobile/.env` from `.env.example`.
2. `cd apps/mobile && npm install && npm start`.
3. Sign in as sales agent.
4. Confirm Home shows role + sign out works.
5. Relaunch app — session persists (Bootstrap → Main).

## Deep link smoke

- Open `travelos://login` on device/simulator.
- Open `travelos://home` when authenticated.
