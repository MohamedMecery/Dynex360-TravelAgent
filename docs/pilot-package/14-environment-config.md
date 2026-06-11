# TravelOS Environment Configuration

**Last updated:** 2026-06-04  
**Reference:** `.env.example`, `docs/05-Development/Production-Environment-Catalog.md`

---

## Environment variable catalog

### Core platform (required — production)

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Anon/publishable key (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server worker, webhooks, admin scripts — **never** `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_SITE_URL` | Yes | Auth redirects, email links, portal URLs (HTTPS) |
| `CRON_SECRET` | Yes | Worker cron authorization (32+ random bytes) |

### Email — transactional (required for pilot comms)

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `EMAIL_PROVIDER` | Optional | `resend` (default) or `smtp` |
| `RESEND_API_KEY` | Yes (pilot) | Application email via Resend |
| `RESEND_FROM_EMAIL` | Yes (pilot) | Verified sender |
| `SMTP_*` | Optional | Alternative SMTP provider |

**Supabase Auth SMTP** (invite, password reset): configured in Supabase Dashboard → Authentication → SMTP. Not a Vercel variable.

### AI (required for AI features)

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `ANTHROPIC_API_KEY` | Yes (pilot) | Sales/Ops/Knowledge/Booking/Support agents |
| `OPENAI_API_KEY` | Optional | Embeddings for RAG; FTS fallback without |

### Payments — Paymob

| Variable | Required (live) | Purpose |
|----------|:---------------:|---------|
| `PAYMOB_API_KEY` | Yes | API access |
| `PAYMOB_INTEGRATION_ID` | Yes | Card integration |
| `PAYMOB_IFRAME_ID` | Optional | Hosted iframe |
| `PAYMOB_HMAC_SECRET` | Yes | Webhook verification |
| `NEXT_PUBLIC_APP_URL` | Optional | Return URLs; prefer `NEXT_PUBLIC_SITE_URL` |
| `PAYMOB_MOCK_MODE` | **Forbidden** prod | Simulated gateway |
| `PAYMOB_MOCK_WEBHOOKS` | **Forbidden** prod | Unsigned test webhooks |
| `NEXT_PUBLIC_PAYMOB_MOCK_MODE` | **Forbidden** prod | Portal mock UI |

Mock activates when API key unset or mock flags true.

### WhatsApp — Meta Cloud

| Variable | Required (live) | Purpose |
|----------|:---------------:|---------|
| `WHATSAPP_META_PHONE_NUMBER_ID` | Yes | Phone number ID |
| `WHATSAPP_META_ACCESS_TOKEN` | Yes | Graph API token |
| `WHATSAPP_META_APP_SECRET` | Yes | Webhook HMAC |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Yes | GET webhook challenge |
| `WHATSAPP_META_API_VERSION` | Optional | Default `v21.0` |
| `WHATSAPP_MOCK_MODE` | **Forbidden** prod | Log-only mock sends |

### Mobile app (`apps/mobile/.env`)

| Variable | Required | Purpose |
|----------|:--------:|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Same project as web |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key |
| `EXPO_PUBLIC_API_URL` | Yes | Next.js API origin |

---

## Development-only variables

**Do not set on Vercel Production.**

| Variable | Purpose |
|----------|---------|
| `GATE_BASE_URL`, `E2E_BASE_URL` | Gate/Playwright target |
| `GATE_TEST_PASSWORD`, `PORTAL_TEST_EMAIL` | Automated test accounts |
| `GATE_ADMIN_EMAIL`, `GATE_SALES_EMAIL` | Gate staff users |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `npm run admin:create` |
| `E2E_*` | CI Playwright |
| `SKIP_GATE_SCRIPTS` | Partial verification matrix |
| `PRODUCTION_CHECK` | Strict env validator flag |

---

## Third-party services

| Service | Used for | Setup owner |
|---------|----------|-------------|
| [Supabase](https://supabase.com) | Auth, PostgreSQL, RLS, storage | Engineering |
| [Vercel](https://vercel.com) | Next.js hosting, serverless API, cron | Engineering |
| [Resend](https://resend.com) | Transactional email | IT (domain verify) |
| [Paymob](https://paymob.com) | Card payments (MENA) | Finance + Engineering |
| [Meta Business](https://business.facebook.com) | WhatsApp Cloud API | Marketing/IT |
| [Anthropic](https://anthropic.com) | LLM for agents | Engineering |
| [OpenAI](https://openai.com) | Optional embeddings | Engineering |
| [GitHub Actions](https://github.com) | CI lint/test | Engineering |

---

## Deployment requirements

### Supabase project

| Requirement | Detail |
|-------------|--------|
| Migrations | Apply `001`–`064` via `npm run db:push` |
| Auth hook | Enable `public.custom_access_token_hook` |
| Redirect URLs | Production + localhost + `*.vercel.app` previews |
| SMTP | Custom SMTP for invite/reset |
| Storage | Knowledge documents bucket (if using uploads) |
| Dedicated pilot project | Do not share with CI/E2E project |

### Vercel project

| Requirement | Detail |
|-------------|--------|
| Env vars | All required production vars |
| Cron job | `POST /api/cron/process-dispatch-jobs` every 2–5 min with `CRON_SECRET` |
| Node | 20.x |
| Domain | `NEXT_PUBLIC_SITE_URL` matches production domain |

### Tenant configuration (post-deploy)

| Setting | Table / UI |
|---------|------------|
| Payments enabled | `tenant_payment_settings.payments_enabled` |
| WhatsApp enabled | `tenant_whatsapp_settings` |
| Approved WhatsApp templates | `/crm/whatsapp/templates` |
| Portal accounts | Provision per customer |
| Paymob / Meta credentials | Vercel env (global) + tenant toggles |

---

## Validation

```bash
# Strict production check
PRODUCTION_CHECK=1 node scripts/validate-production-env.mjs
```

Pre-deploy checklist: `docs/05-Development/Production-Deploy-Checklist.md`

---

## Local development

```bash
# Root — copy .env.example to .env.local
npm install
npm run dev

# Mobile
cd apps/mobile && cp .env.example .env
npm install && npm start
```

Local Supabase (optional): `npx supabase start` — use URLs from `supabase status`.

---

## Related documents

- [16-production-runbooks.md](./16-production-runbooks.md)
- [docs/05-Development/Pilot-Execution-Runbook.md](../05-Development/Pilot-Execution-Runbook.md)
- [docs/05-Development/Deployment.md](../05-Development/Deployment.md)
