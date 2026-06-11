# Operations Monitoring Runbook

**Sprint:** 9E  
**Primary UI:** `/crm/operations` (Operations Dashboard)  
**API:** `GET /api/crm/operations/metrics`

---

## What to monitor

| Subsystem | Signal | Location |
|-----------|--------|----------|
| Dispatch queue | pending, failed, dead_letter | Operations dashboard + `event_dispatch_jobs` |
| Email | sent/failed 24h | `email_delivery_logs` + dashboard |
| In-app notifications | sent/failed 24h | dashboard |
| WhatsApp | sent/delivered/read/failed 24h | dashboard + `whatsapp_messages` |
| Domain events | throughput / hour | dashboard |
| Payments | webhook errors | Vercel logs `/api/webhooks/paymob` |
| AI usage | snapshots + open recommendations | `/crm/sales-insights`, `/crm/operations-insights` |
| Bookings at risk | Ops AI widgets | `/crm/dashboard` |

---

## Daily checks (5–10 minutes)

| # | Action | Healthy |
|---|--------|---------|
| 1 | Open `/crm/operations` | `jobs_dead_letter = 0` |
| 2 | `jobs_pending` | &lt; 20 |
| 3 | `emails_failed_24h` | 0 or known incidents |
| 4 | `whatsapp_failed_24h` | low; investigate spikes |
| 5 | Vercel cron log | `process-dispatch-jobs` 200 every 2–5 min |
| 6 | Optional script | `node scripts/verify-worker-health.mjs` |

---

## Weekly checks

| # | Action |
|---|--------|
| 1 | Run `node scripts/run-production-verification-matrix.mjs` on staging |
| 2 | Review `dead_letter` jobs — replay or fix templates |
| 3 | Resend dashboard — bounce/spam rate |
| 4 | Meta WhatsApp quality rating |
| 5 | Paymob settlement vs `payments` ledger sample |
| 6 | AI open recommendations backlog (sales + ops) |

---

## Monthly checks

| # | Action |
|---|--------|
| 1 | Supabase advisors / backup restore drill |
| 2 | Rotate review: `CRON_SECRET`, API keys |
| 3 | Permission audit — inactive users disabled |
| 4 | Migration drift: `npm run db:push` dry-run on clone |
| 5 | Commercial journey gate on staging |
| 6 | Pilot readiness score update (launch report) |

---

## Incident response

### Severity 1 — Platform down

| Step | Action |
|------|--------|
| 1 | Check Vercel status + last deploy |
| 2 | `GET /api/health/supabase` |
| 3 | Supabase project health dashboard |
| 4 | Communicate ETA to agency; freeze config changes |

### Severity 2 — Queue stalled (notifications/email/WhatsApp delayed)

| Step | Action |
|------|--------|
| 1 | Confirm cron 401/500 in Vercel logs |
| 2 | Verify `CRON_SECRET` matches |
| 3 | Manual `POST /api/cron/process-dispatch-jobs` with batch 25 |
| 4 | Follow [Production-Worker-Runbook.md](./Production-Worker-Runbook.md) dead-letter section |

### Severity 3 — Payments not completing

| Step | Action |
|------|--------|
| 1 | Paymob dashboard transaction status |
| 2 | Vercel webhook logs — HMAC failures |
| 3 | `payment_orders` row status for affected order |
| 4 | Never enable `PAYMOB_MOCK_WEBHOOKS` in production to “fix” |

### Severity 4 — WhatsApp delivery failures

| Step | Action |
|------|--------|
| 1 | Template approval status in Meta |
| 2 | Customer opt-in in `customer_communication_preferences` |
| 3 | `notification_deliveries` channel `whatsapp` last_error |

---

## Escalation

| Role | Contact | When |
|------|---------|------|
| Pilot lead | Agency ops manager | Business-visible outage |
| Engineering | Dynex360 support | S1/S2 &gt; 30 min |
| Supabase support | Dashboard ticket | DB/Auth outage |

---

## Automation references

| Script | Purpose |
|--------|---------|
| `verify-worker-health.mjs` | Queue + cron smoke |
| `run-production-verification-matrix.mjs` | All subsystem gates |
| `run-commercial-journey-gate.mjs` | End-to-end commercial path |

---

## Related

- [Production-Worker-Runbook.md](./Production-Worker-Runbook.md)
- [Pilot-Execution-Runbook.md](./Pilot-Execution-Runbook.md)
