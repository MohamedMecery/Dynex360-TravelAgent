# Sprint 9E — Production Verification Matrix

**Purpose:** Single PASS/FAIL view per subsystem before pilot promotion.  
**Runner:** `node scripts/run-production-verification-matrix.mjs`  
**Output artifact:** `scripts/production-verification-matrix.json`

---

## How to run

```bash
# Local (app on :3000)
npm run dev
# separate terminal:
npm run gate:production-matrix

# Staging / pilot Vercel
GATE_BASE_URL=https://travelos-pilot.vercel.app npm run gate:production-matrix

# Strict production env only (no HTTP gates)
SKIP_GATE_SCRIPTS=1 npm run gate:production-matrix
```

---

## Matrix template

Record after each run (copy from JSON or table below):

| Subsystem | Gate command | PASS/FAIL | Date | Notes |
|-----------|--------------|-----------|------|-------|
| Production environment | `node scripts/validate-production-env.mjs` | | | |
| Worker health | `node scripts/verify-worker-health.mjs` | | | |
| API foundation (7B) | `npm run gate:sprint7b:foundation` | | | |
| CRM dashboard (6) | `npm run gate:sprint6:dashboard` | | | |
| Customer portal | `npm run gate:portal` | | | |
| Domain events (8C) | `npm run gate:sprint8c:events` | | | |
| Dispatch worker (8D) | `npm run gate:sprint8d:worker` | | | |
| Payments (9A) | `npm run gate:sprint9a:payments` | | | |
| WhatsApp (9B) | `npm run gate:sprint9b:whatsapp` | | | |
| Sales AI (9C) | `npm run gate:sprint9c:sales-ai` | | | |
| Operations AI (9D) | `npm run gate:sprint9d:operations-ai` | | | |
| Commercial journey (9E) | `npm run gate:commercial` | | | |

**Promotion rule:** All rows **PASS** for production; **SKIP** acceptable only for optional subsystems documented in run notes.

---

## Prerequisites (all HTTP gates)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `GATE_BASE_URL` | Target app URL |
| `CRON_SECRET` | Worker + commercial gates |
| `PORTAL_TEST_EMAIL` | Portal, payments, commercial |
| `GATE_TEST_PASSWORD` | Test users |

Provision portal account:

```bash
node scripts/provision-portal-test-account.mjs
```

---

## Related

- [TravelOS-Pilot-Launch-Readiness-Report.md](./TravelOS-Pilot-Launch-Readiness-Report.md)
