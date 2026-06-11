# TravelOS Deployment Guide

**Version:** 2.0 — Pilot (Sprint 9E)  
**Last updated:** 2026-06-04

---

## Prerequisites

- Node.js 20+
- Supabase cloud project (pilot-dedicated; not CI/E2E project)
- Vercel account
- Resend (transactional email), Anthropic (AI), Paymob + Meta WhatsApp (live pilot)

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local
# Fill Supabase URL, keys, optional mocks for payments/WhatsApp
npm run db:push
npm run admin:create
npm run dev
```

Health: `npm run doctor`

---

## Environment setup

Full variable list, categories, and production validation:

**[Production-Environment-Catalog.md](./Production-Environment-Catalog.md)**

```bash
npm run validate:production-env
PRODUCTION_CHECK=1 npm run validate:production-env
```

---

## Database migrations

Apply **001–064** in order via CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

| Range | Domain |
|-------|--------|
| 001–024 | Core MVP, AI, email logs |
| 025–038 | CRM, quotations, dashboard RPC |
| 039–042 | Customer portal |
| 041, 045 | Domain events, dispatch jobs |
| 047–050 | Payments (Paymob) |
| 051–055 | WhatsApp |
| 056–064 | AI Sales + AI Operations |

Enable **Custom Access Token** hook: `public.custom_access_token_hook`

Optional demo data: `npm run db:seed` (not for production pilot with real PII)

---

## Vercel deployment

1. Import GitHub repo → Next.js preset
2. Set Production env vars (catalog)
3. Configure **Cron** for worker (see [Production-Worker-Runbook.md](./Production-Worker-Runbook.md))
4. Deploy `main`

Redirects: Supabase Auth **Site URL** = `NEXT_PUBLIC_SITE_URL`

---

## Post-deploy verification

```bash
GATE_BASE_URL=https://your-app.vercel.app npm run gate:production-matrix
```

See [Production-Deploy-Checklist.md](./Production-Deploy-Checklist.md) and [TravelOS-Pilot-Launch-Readiness-Report.md](../03-Architecture/TravelOS-Pilot-Launch-Readiness-Report.md).

---

## Branch strategy

| Branch | Deploys to |
|--------|------------|
| `main` | Production |
| PRs | Vercel Preview |

---

## Monitoring

| Surface | Purpose |
|---------|---------|
| `/crm/operations` | Queue, email, WhatsApp, events |
| Vercel Analytics | Web vitals |
| Supabase Dashboard | DB, auth |
| `npm run verify:worker-health` | Automated queue check |

Procedures: [Operations-Monitoring-Runbook.md](./Operations-Monitoring-Runbook.md)

---

## Rollback

1. Vercel → redeploy previous deployment
2. Database: forward-only migrations — restore Supabase backup if needed

---

## Health checks

| Endpoint | Expected |
|----------|----------|
| `GET /api/health/supabase` | 200 when configured |
| `GET /api/auth/me` | 401 unauthenticated |
| `POST /api/cron/process-dispatch-jobs` | 401 without secret; 200 with `CRON_SECRET` |

---

## Related runbooks

- [Pilot-Execution-Runbook.md](./Pilot-Execution-Runbook.md)
- [Tenant-Onboarding-Runbook.md](./Tenant-Onboarding-Runbook.md)
- [Customer-Onboarding-Runbook.md](./Customer-Onboarding-Runbook.md)
