# TravelOS Testing Strategy

**Version:** 2.0 — Pilot gates (Sprint 9E)

---

## Test Pyramid

| Level | Target Coverage | Tools |
|-------|----------------|-------|
| Unit | 70% business logic | Vitest (POST-MVP) |
| Integration | API routes + DB | Vitest + Supabase local (POST-MVP) |
| E2E | Critical user flows | Playwright |
| Security | RLS policies | Custom SQL tests |

---

## E2E Tests (Playwright)

Automated critical flows in `e2e/`:

| Spec | Coverage |
|------|----------|
| `auth.setup.ts` | Login → save session |
| `dashboard.spec.ts` | Dashboard KPIs + stats API |
| `customers.spec.ts` | Create customer → list search |
| `booking-flow.spec.ts` | Customer → package publish → booking → confirm → payment |
| `ai-agents.spec.ts` | AI pages + draft builder (UI); live chat API tests when `E2E_RUN_AI_API=1` |
| `invoice-snapshot.spec.ts` | Invoice from `DEMO-BK-005` → draft lines → Issue → frozen snapshot badge |
| `invoice-pdf.spec.ts` | Invoice show → Download PDF → `application/pdf` response |

### Prerequisites

1. Supabase configured in `.env.local` (same as dev).
2. Tenant admin provisioned: `npm run admin:create`
3. At least one **destination** for package create (run `npm run db:seed` or create manually).
4. Playwright browsers installed once:

```bash
npx playwright install chromium
```

### Environment

Copy optional overrides:

```bash
cp e2e/.env.example .env.e2e.local
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `E2E_BASE_URL` | `http://localhost:3099` | App URL (default E2E port avoids dev on 3000) |
| `E2E_PORT` | `3099` | Port for production server started by Playwright |
| `E2E_ADMIN_EMAIL` | from `admin:create` | Login email |
| `E2E_ADMIN_PASSWORD` | from `admin:create` | Login password |
| `E2E_SKIP_WEBSERVER` | unset | Set `1` if dev server already running |

### Run locally

```bash
# Builds and starts production server automatically (unless E2E_SKIP_WEBSERVER=1)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Headed browser (debug)
npm run test:e2e:headed

# Open HTML report after failure
npm run test:e2e:report
```

E2E tests use **unique timestamps** in data (emails, package titles) so re-runs do not collide with prior records.

---

## Sprint gate scripts (pilot verification)

HTTP and DB gates run against `GATE_BASE_URL` (default `http://localhost:3000`). Requires `.env.local` with Supabase keys; portal gates need `node scripts/provision-portal-test-account.mjs`.

| Command | Sprint | Coverage |
|---------|--------|----------|
| `npm run validate:production-env` | 9E | Env catalog / mock detection |
| `npm run verify:worker-health` | 9E | Queue depth, cron smoke |
| `npm run gate:commercial` | 9E | Full commercial journey |
| `npm run gate:production-matrix` | 9E | All subsystem gates |
| `npm run gate:sprint7b:foundation` | 7B | API auth Bearer + cookie |
| `npm run gate:sprint6:dashboard` | 6 | CRM dashboard RPC |
| `npm run gate:portal` | 8A–C | Portal APIs + notifications |
| `npm run gate:sprint8c:events` | 8C | Domain events |
| `npm run gate:sprint8d:worker` | 8D | Dispatch worker |
| `npm run gate:sprint9a:payments` | 9A | Checkout + Paymob webhook |
| `npm run gate:sprint9b:whatsapp` | 9B | WhatsApp dispatch |
| `npm run gate:sprint9c:sales-ai` | 9C | Sales AI schema/RPC |
| `npm run gate:sprint9d:operations-ai` | 9D | Ops AI schema/RPC |
| `npm run test:crm-rls` | CRM | RLS policy smoke |
| `npm run test:customer360-gate` | 5 | Customer 360 validation |

**Unified commercial path:** `npm run gate:commercial` — see [Sprint-9E-Production-Verification-Matrix.md](../03-Architecture/Sprint-9E-Production-Verification-Matrix.md).

**Playwright portal spec:** `e2e/portal-gate.spec.ts` (UI layer; optional alongside HTTP gate).

### CI

Workflow: `.github/workflows/e2e.yml` (runs on push to `main` and manual dispatch).

**Setup guide (step-by-step secrets + dedicated Supabase):** [E2E-CI-Setup.md](./E2E-CI-Setup.md)

Before tests, Playwright `globalSetup` runs `npm run e2e:ci-prep` (admin sync + `db:seed` for `DEMO-BK-005` and knowledge docs).

Required GitHub secrets: see [E2E-CI-Setup.md §2](./E2E-CI-Setup.md#2-github-repository-secrets).

Optional: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `E2E_RUN_AI_API=1` for live agent chat tests.

---

## Unit Tests

Test business logic in isolation:

- Access control permission checks
- Currency/date formatting utilities
- Validation schemas (Zod)
- Booking total calculations
- Payment status logic

Location: `src/__tests/` (POST-MVP)

```bash
npm run test        # POST-MVP
npm run test:watch  # POST-MVP
```

---

## Integration Tests

Test API routes with Supabase:

- CRUD operations per module
- RBAC enforcement (403 for unauthorized roles)
- Tenant isolation (tenant A cannot see tenant B data)
- Trigger behavior (audit logs, payment status updates)

Location: `src/__tests__/integration/` (POST-MVP)

Requires Supabase local: `npx supabase start`

---

## Security Tests

RLS policy verification:

```sql
-- Test: tenant A user cannot read tenant B customers
SET request.jwt.claims = '{"tenant_id": "tenant-a-id", "role": "sales_agent"}';
SELECT count(*) FROM customers WHERE tenant_id = 'tenant-b-id';
-- Expected: 0
```

Run as part of migration CI check.

---

## CI Pipeline

Tests run on every PR via GitHub Actions:

1. Lint (ESLint)
2. Type check (tsc --noEmit)
3. Build (next build)

E2E runs on merge to `main` (see `e2e.yml`).

---

## MVP Testing Priority

1. **Must have:** Type check + lint + build in CI
2. **Done:** E2E for login, dashboard, customer, booking + payment flow
3. **Should have:** Unit tests for utils and access control (POST-MVP)
4. **POST-MVP:** Full integration test suite, security test automation

See also: [SeedData.md](./SeedData.md) for demo data to support manual and automated QA.
