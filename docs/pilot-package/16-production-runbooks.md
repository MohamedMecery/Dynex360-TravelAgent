# TravelOS Production Runbooks

**Audience:** Pilot operations, DevOps, on-call engineering  
**Last updated:** 2026-06-04

Consolidates startup, monitoring, recovery, and incident response for the TravelOS pilot stack (Supabase + Vercel).

---

## 1. Startup (initial pilot deploy)

### 1.1 Prerequisites checklist

| # | Item | Owner |
|---|------|-------|
| 1 | Dedicated Supabase project (not CI) | ENG |
| 2 | Vercel project linked to repo | ENG |
| 3 | Resend domain verified | IT |
| 4 | Paymob merchant account (if live payments) | Finance |
| 5 | Meta WABA (if live WhatsApp) | IT/Marketing |
| 6 | Anthropic API key | ENG |

### 1.2 Database startup

```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

| Step | Verification |
|------|--------------|
| Auth hook enabled | Dashboard → Authentication → Hooks → `custom_access_token_hook` |
| Tables exist | `tenants`, `quotations`, `customer_portal_accounts`, `event_dispatch_jobs`, `payment_orders`, `whatsapp_messages` |
| First admin | `npm run admin:create` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env.local` |

### 1.3 Vercel startup

| Step | Action |
|------|--------|
| 1 | Set all [required env vars](./14-environment-config.md) |
| 2 | Deploy `main` (or pilot branch) |
| 3 | Configure cron: `POST /api/cron/process-dispatch-jobs` schedule `*/2 * * * *` |
| 4 | Add header `Authorization: Bearer <CRON_SECRET>` |
| 5 | Set `NEXT_PUBLIC_SITE_URL` to production HTTPS URL |

### 1.4 Post-deploy smoke

| Check | Command / URL |
|-------|---------------|
| Health | `GET /api/health/supabase` |
| Staff login | `/login` → dashboard |
| Env strict | `PRODUCTION_CHECK=1 node scripts/validate-production-env.mjs` |
| Worker | `node scripts/verify-worker-health.mjs` |
| Commercial path | `node scripts/run-commercial-journey-gate.mjs` (staging) |

### 1.5 Tenant go-live

| Step | Action |
|------|--------|
| 1 | Invite tenant_admin |
| 2 | Configure tenant settings (currency, branding) |
| 3 | Enable `tenant_payment_settings.payments_enabled` if using Paymob |
| 4 | Enable WhatsApp + seed approved templates |
| 5 | Provision portal accounts for pilot customers |

**Detailed steps:** `docs/05-Development/Pilot-Execution-Runbook.md`

---

## 2. Monitoring

### 2.1 Daily (5–10 minutes)

| # | Check | Healthy |
|---|-------|---------|
| 1 | Open `/crm/operations` | `jobs_dead_letter = 0` |
| 2 | `jobs_pending` | < 20 |
| 3 | `emails_failed_24h` | 0 |
| 4 | `whatsapp_failed_24h` | Low / explained |
| 5 | Vercel cron logs | `process-dispatch-jobs` → 200 every 2–5 min |
| 6 | Optional script | `node scripts/verify-worker-health.mjs` |

### 2.2 Weekly

| # | Action |
|---|--------|
| 1 | `node scripts/run-production-verification-matrix.mjs` on staging |
| 2 | Review dead-letter jobs — replay or fix templates |
| 3 | Resend dashboard — bounces |
| 4 | Meta WhatsApp quality rating |
| 5 | Paymob settlement vs `payments` sample |
| 6 | AI recommendation backlog (sales + ops) |

### 2.3 Monthly

| # | Action |
|---|--------|
| 1 | Supabase advisors + backup restore drill |
| 2 | Review API key rotation (`CRON_SECRET`, Paymob, Meta, Anthropic) |
| 3 | Disable inactive staff users |
| 4 | Migration drift check on DB clone |
| 5 | Re-run commercial journey gate |
| 6 | Update pilot readiness scorecard |

### 2.4 Monitoring surfaces

| Surface | URL / tool |
|---------|------------|
| Operations dashboard | `/crm/operations` |
| Sales insights | `/crm/sales-insights` |
| Operations insights | `/crm/operations-insights` |
| Vercel | Function logs, cron invocations |
| Supabase | Logs, advisors, database health |
| Paymob | Merchant transaction dashboard |
| Meta | WhatsApp Manager |

**Reference:** `docs/05-Development/Operations-Monitoring-Runbook.md`

---

## 3. Recovery

### 3.1 Queue backlog

| Step | Action |
|------|--------|
| 1 | Confirm cron not returning 401/500 |
| 2 | Manual run: `curl -X POST https://YOUR_APP/api/cron/process-dispatch-jobs -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{"batchSize":50}'` |
| 3 | Increase cron frequency temporarily |
| 4 | Check Anthropic/Resend rate limits if AI/email jobs dominate |

### 3.2 Dead-letter jobs

| Step | Action |
|------|--------|
| 1 | Query `event_dispatch_jobs` where `status = dead_letter` |
| 2 | Read `last_error` and linked `domain_events` payload |
| 3 | Fix root cause (template, SMTP, phone, opt-in) |
| 4 | Replay via new domain event emission (preferred) |
| 5 | Do not delete `domain_events` |

### 3.3 Failed job retry

```sql
-- Example: force retry (service role, single job)
UPDATE event_dispatch_jobs
SET status = 'pending', next_run_at = now(), retry_count = 0
WHERE id = 'JOB_UUID';
```

### 3.4 Stuck processing locks

| Symptom | Action |
|---------|--------|
| Jobs in `processing` > 30 min | Engineering invokes `fail_event_dispatch_job` or maintenance per Worker Runbook |
| Cron 401 | Rotate `CRON_SECRET` on Vercel + cron config |

### 3.5 Payment reconciliation

| Step | Action |
|------|--------|
| 1 | Find `payment_orders` by customer/quotation |
| 2 | Compare Paymob dashboard to `payment_provider_events` |
| 3 | Never enable `PAYMOB_MOCK_WEBHOOKS` in production |
| 4 | Manual ledger entry only after finance approval if webhook lost |

---

## 4. Incident response

### Severity 1 — Platform down

| Step | Action |
|------|--------|
| 1 | Check [Vercel status](https://www.vercel-status.com/) and last deploy |
| 2 | `GET /api/health/supabase` |
| 3 | Supabase project health dashboard |
| 4 | Communicate ETA to agency; freeze config changes |
| 5 | Escalate to Dynex360 engineering if > 30 min |

### Severity 2 — Queue stalled (delayed email/WhatsApp/notifications)

| Step | Action |
|------|--------|
| 1 | Vercel cron logs — 401/500 |
| 2 | Verify `CRON_SECRET` |
| 3 | Manual worker POST (see §3.1) |
| 4 | Follow dead-letter procedures if failures persist |

### Severity 3 — Payments not completing

| Step | Action |
|------|--------|
| 1 | Paymob dashboard transaction status |
| 2 | Vercel logs `/api/webhooks/paymob` — HMAC failures |
| 3 | Inspect `payment_orders.status` and `last_error` on attempts |
| 4 | Confirm `payments_enabled` for tenant |

### Severity 4 — WhatsApp delivery failures

| Step | Action |
|------|--------|
| 1 | Template `meta_status` in `/crm/whatsapp/templates` |
| 2 | Customer opt-in in preferences |
| 3 | `notification_deliveries` where `channel = whatsapp` |

### Severity 5 — Auth / login widespread failure

| Step | Action |
|------|--------|
| 1 | Supabase Auth status |
| 2 | Auth hook still enabled |
| 3 | `NEXT_PUBLIC_SITE_URL` and redirect URLs |
| 4 | SMTP for reset emails |

---

## Escalation matrix

| Role | When |
|------|------|
| Pilot lead (agency) | Customer-visible outage, commercial impact |
| Dynex360 engineering | S1/S2 > 30 minutes, data integrity, migration issues |
| Supabase support | Database or Auth platform outage |
| Paymob / Meta support | Provider-side payment or WhatsApp outages |

---

## Automation scripts reference

| Script | Purpose |
|--------|---------|
| `scripts/validate-production-env.mjs` | Env gate |
| `scripts/verify-worker-health.mjs` | Queue + cron health |
| `scripts/run-production-verification-matrix.mjs` | Subsystem gates |
| `scripts/run-commercial-journey-gate.mjs` | E2E commercial path |
| `npm run gate:sprint8d:worker` | Worker CI gate |
| `npm run gate:sprint9a:payments` | Payments gate |
| `npm run gate:sprint9b:whatsapp` | WhatsApp gate |

---

## Related runbooks (repository)

| Document | Topic |
|----------|-------|
| [Pilot-Execution-Runbook.md](../05-Development/Pilot-Execution-Runbook.md) | Full pilot deploy |
| [Production-Worker-Runbook.md](../05-Development/Production-Worker-Runbook.md) | Worker detail |
| [Operations-Monitoring-Runbook.md](../05-Development/Operations-Monitoring-Runbook.md) | Monitoring |
| [Production-Deploy-Checklist.md](../05-Development/Production-Deploy-Checklist.md) | Deploy checklist |
| [Tenant-Onboarding-Runbook.md](../05-Development/Tenant-Onboarding-Runbook.md) | New agency |
| [Customer-Onboarding-Runbook.md](../05-Development/Customer-Onboarding-Runbook.md) | Portal customers |
