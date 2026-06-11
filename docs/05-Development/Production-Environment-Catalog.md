# Production Environment Catalog

**Sprint:** 9E — Pilot Hardening  
**Last updated:** 2026-06-04  
**Scope:** Vercel (Next.js), Supabase, Resend, Paymob, Meta WhatsApp, Anthropic, Cron worker

Use with:

- [Production-Deploy-Checklist.md](./Production-Deploy-Checklist.md)
- `node scripts/validate-production-env.mjs` (local) or `PRODUCTION_CHECK=1 node scripts/validate-production-env.mjs` (strict)

---

## Legend

| Category | Meaning |
|----------|---------|
| **Required** | Pilot production will not function correctly without this |
| **Optional** | Feature degrades gracefully or has a fallback |
| **Development only** | Gate scripts, local URLs, test passwords — never on Vercel Production |
| **Forbidden in production** | Mock flags, sandbox bypass, or secrets exposed to the browser |

---

## Core platform (Required)

| Variable | Category | Purpose | Validation |
|----------|----------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Supabase project URL | Must be `https://*.supabase.co` for cloud pilot |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required | Browser + anon API key | Or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Required* | Admin scripts, worker, webhooks server-side | *Not `NEXT_PUBLIC_*`; set on Vercel for worker/cron |
| `NEXT_PUBLIC_SITE_URL` | Required | Auth redirects, email links, portal URLs | HTTPS production domain; not `localhost` |
| `CRON_SECRET` | Required | `POST /api/cron/process-dispatch-jobs` | 32+ random bytes; Bearer or `x-cron-secret` |

---

## Email — Resend / SMTP

| Variable | Category | Purpose |
|----------|----------|---------|
| `EMAIL_PROVIDER` | Optional | `resend` (default) or `smtp` |
| `RESEND_API_KEY` | Required (pilot) | TravelOS transactional email |
| `RESEND_FROM_EMAIL` | Required (pilot) | Verified sender domain |
| `SMTP_HOST` | Optional | When `EMAIL_PROVIDER=smtp` |
| `SMTP_PORT` | Optional | Default `587` |
| `SMTP_USER` | Optional | SMTP auth |
| `SMTP_PASSWORD` | Optional | SMTP auth |
| `SMTP_SECURE` | Optional | `true` for port 465 |
| `SMTP_FROM_EMAIL` | Optional | SMTP from address |
| `SMTP_FROM_NAME` | Optional | Display name |

**Supabase Auth SMTP** is configured in the Supabase Dashboard (invite/reset), not via Vercel env.

---

## AI — Anthropic / OpenAI

| Variable | Category | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Required (pilot) | Sales/Ops/Knowledge agents (server-only) |
| `OPENAI_API_KEY` | Optional | Vector embeddings for RAG; FTS works without |

---

## Payments — Paymob (Sprint 9A)

| Variable | Category | Purpose |
|----------|----------|---------|
| `PAYMOB_API_KEY` | Required (live payments) | Paymob API |
| `PAYMOB_INTEGRATION_ID` | Required (live) | Card integration |
| `PAYMOB_IFRAME_ID` | Optional | Hosted iframe checkout |
| `PAYMOB_HMAC_SECRET` | Required (live) | Webhook signature verification |
| `NEXT_PUBLIC_APP_URL` | Optional | Checkout return URLs; prefer `NEXT_PUBLIC_SITE_URL` |
| `PAYMOB_MOCK_MODE` | **Forbidden in production** | Simulates gateway without Paymob |
| `PAYMOB_MOCK_WEBHOOKS` | **Forbidden in production** | Accepts unsigned test webhooks |
| `NEXT_PUBLIC_PAYMOB_MOCK_MODE` | **Forbidden in production** | Portal UI mock checkout indicator |

Mock behavior also activates when `PAYMOB_API_KEY` is unset (server treats as mock).

---

## WhatsApp — Meta Cloud (Sprint 9B)

| Variable | Category | Purpose |
|----------|----------|---------|
| `WHATSAPP_META_PHONE_NUMBER_ID` | Required (live) | Meta phone number ID |
| `WHATSAPP_META_ACCESS_TOKEN` | Required (live) | Graph API token |
| `WHATSAPP_META_APP_SECRET` | Required (live) | Webhook signature |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Required (live) | Meta webhook challenge |
| `WHATSAPP_META_API_VERSION` | Optional | Default `v21.0` |
| `WHATSAPP_MOCK_MODE` | **Forbidden in production** | Logs mock sends, no Meta API |

Mock also implied when access token is unset.

---

## Cron & worker (Sprint 8D)

| Variable | Category | Purpose |
|----------|----------|---------|
| `CRON_SECRET` | Required | Authorizes worker batch processing |

**Vercel Cron** (recommended): schedule `POST /api/cron/process-dispatch-jobs` every 1–5 minutes with header `Authorization: Bearer <CRON_SECRET>`.

---

## Development only (do not set on Production)

| Variable | Purpose |
|----------|---------|
| `GATE_BASE_URL` / `E2E_BASE_URL` | Gate script target URL |
| `GATE_TEST_PASSWORD` | Shared test user password |
| `PORTAL_TEST_EMAIL` | Portal gate account |
| `GATE_ADMIN_EMAIL` / `GATE_SALES_EMAIL` | Gate staff users |
| `PORTAL_CUSTOMER_ID` | Portal provisioning script |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `npm run admin:create` |
| `E2E_*` | Playwright CI |
| `WORKER_PENDING_WARN` / `WORKER_PENDING_FAIL` | Health script thresholds |
| `SKIP_GATE_SCRIPTS` | Matrix runner partial mode |
| `PRODUCTION_CHECK` | Strict env validator |

---

## Production validation checklist

Run before pilot go-live:

| # | Check | Command / action |
|---|-------|------------------|
| 1 | All migrations **001–064** applied | `npm run db:push` on pilot project |
| 2 | Auth hook enabled | `custom_access_token_hook` |
| 3 | No mock payment flags | `PRODUCTION_CHECK=1 node scripts/validate-production-env.mjs` |
| 4 | No mock WhatsApp | `WHATSAPP_MOCK_MODE` unset or `false` + Meta tokens set |
| 5 | `CRON_SECRET` set and cron scheduled | Vercel Cron or external scheduler |
| 6 | `NEXT_PUBLIC_SITE_URL` matches Vercel domain | Supabase redirect URLs aligned |
| 7 | Resend domain verified | Test welcome email → `email_delivery_logs` |
| 8 | Paymob live keys + HMAC | Test deposit in sandbox org first, then production keys |
| 9 | Meta webhook subscribed | `GET/POST /api/webhooks/whatsapp` |
| 10 | Service role never in `NEXT_PUBLIC_*` | Vercel env audit |
| 11 | Worker health | `node scripts/verify-worker-health.mjs` |
| 12 | Commercial journey | `node scripts/run-commercial-journey-gate.mjs` |

---

## Detected anti-patterns

| Signal | Risk | Remediation |
|--------|------|-------------|
| `WHATSAPP_MOCK_MODE=true` | No real WhatsApp delivery | Disable; set Meta credentials |
| `PAYMOB_MOCK_*` | Payments not real | Live Paymob keys + HMAC |
| `http://localhost` in `NEXT_PUBLIC_SITE_URL` | Broken portal/email links | Production HTTPS URL |
| Missing `CRON_SECRET` | Queue stalls | Set secret + cron job |
| Missing `RESEND_*` | Email status `skipped` | Configure Resend |
| Unset `ANTHROPIC_API_KEY` | AI falls back to extractive-only | Set key for pilot quality |
| `127.0.0.1` Supabase URL on Vercel | Production points to local | Cloud Supabase project |

---

## Related documentation

- [Production-Worker-Runbook.md](./Production-Worker-Runbook.md)
- [EmailSetup.md](./EmailSetup.md)
- [Sprint-9A-Payments-Implementation-Report.md](../03-Architecture/Sprint-9A-Payments-Implementation-Report.md)
- [Sprint-9B-WhatsApp-Implementation-Report.md](../03-Architecture/Sprint-9B-WhatsApp-Implementation-Report.md)
