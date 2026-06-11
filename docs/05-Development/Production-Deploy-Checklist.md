# Production Deploy Checklist (Pilot / Vercel)

**Last updated:** 2026-06-04 (Sprint 9E)  
**Use when:** First deploy or promoting `main` to a live agency pilot.  
**Related:** [Production-Environment-Catalog.md](./Production-Environment-Catalog.md) · [Pilot-Execution-Runbook.md](./Pilot-Execution-Runbook.md) · [TravelOS-Pilot-Launch-Readiness-Report.md](../03-Architecture/TravelOS-Pilot-Launch-Readiness-Report.md) · [E2E-CI-Setup.md](./E2E-CI-Setup.md)

---

## 0. Recommended order (Pilot vs CI)

Complete in this order for a safe first pilot:

| Order | Track | Document / action |
|:-----:|-------|-------------------|
| 1 | **CI (optional but recommended)** | [E2E-CI-Setup.md](./E2E-CI-Setup.md) — separate Supabase + GitHub secrets → green E2E on `main` |
| 2 | **Pilot DB** | §1 below — **production/pilot** Supabase (not the E2E project) |
| 3 | **Vercel** | §2 + §5 — env vars + deploy |
| 4 | **Auth + SMTP** | §3 + §4 |
| 5 | **Smoke + AI sign-off** | §6 + [Phase5-AI-Validation.md](./Phase5-AI-Validation.md) |

> Do not point GitHub E2E secrets at the pilot database. CI runs seed/admin sync on every E2E run.

---

## 1. Supabase project

| Step | Action | Done |
|------|--------|:----:|
| S1 | Create or select cloud project; note **Project URL** and **API keys** | ☐ |
| S2 | Apply migrations: `npm run db:push` (migrations **001–064**; CRM 025–038, portal 039–042, events 041/045, payments 047–050, WhatsApp 051–055, AI 056–064) | ☐ |
| S3 | Run seed once if demo needed: `npm run db:seed` (uses service role locally only) | ☐ |
| S4 | **Authentication → Hooks:** enable **Custom Access Token** hook (`009_auth_hook.sql` function) | ☐ |
| S5 | **Authentication → URL configuration** — set **Site URL** to production app origin (see §3) | ☐ |
| S6 | **Redirect URLs** — add allow-list entries (see §3) | ☐ |
| S7 | **Storage:** bucket `knowledge-documents` exists (migration `016`) if using Knowledge upload | ☐ |
| S8 | Optional: enable **pgvector** / OpenAI for embeddings (FTS works without `OPENAI_API_KEY`) | ☐ |

---

## 2. Vercel environment variables

Set in **Project → Settings → Environment Variables** for **Production** (and Preview if needed).

### Required (app will not work without these)

| Variable | Example / notes |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key from Supabase API settings |

### Server-only (never expose to browser)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Optional on Vercel unless you run server scripts; **not** required for normal admin UI |
| `ANTHROPIC_API_KEY` | Knowledge / Booking / Support agents (extractive fallback if missing) |
| `OPENAI_API_KEY` | Optional — vector embeddings for RAG; FTS-only mode works without it |

### Required for pilot (communications, payments, worker)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS URL (email, portal, redirects) |
| `CRON_SECRET` | Async worker cron endpoint |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Transactional email |
| `EMAIL_PROVIDER` | `resend` (default) or `smtp` |

### Payments (Paymob) — live pilot

| Variable | Purpose |
|----------|---------|
| `PAYMOB_API_KEY` | Paymob API |
| `PAYMOB_INTEGRATION_ID` | Integration |
| `PAYMOB_HMAC_SECRET` | Webhook verification |
| **Do not set** | `PAYMOB_MOCK_MODE`, `PAYMOB_MOCK_WEBHOOKS` in production |

### WhatsApp (Meta) — live pilot

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_META_*` | Cloud API credentials |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook challenge |
| **Do not set** | `WHATSAPP_MOCK_MODE=true` in production |

### Optional

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Vector embeddings (FTS works without) |
| `SMTP_*` | Alternative if `EMAIL_PROVIDER=smtp` |

**Full catalog:** [Production-Environment-Catalog.md](./Production-Environment-Catalog.md)

**Copy-paste template (fill values, do not commit):**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
CRON_SECRET=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

**Pre-flight validator:**

```bash
PRODUCTION_CHECK=1 npm run validate:production-env
```

---

## 3. Auth redirect URLs (Supabase Dashboard)

Replace `https://YOUR_APP.vercel.app` with your production hostname.

**Site URL:**

```
https://YOUR_APP.vercel.app
```

**Redirect URLs (add each):**

```
https://YOUR_APP.vercel.app/**
https://YOUR_APP.vercel.app/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

For **Preview deployments**, add:

```
https://*.vercel.app/**
```

> Local dev: keep `http://localhost:3000` entries so `npm run dev` login still works.

---

## 4. Email (dual channel)

### 4a. Supabase Auth (invite + password reset)

| Step | Action | Done |
|------|--------|:----:|
| M1 | **Project Settings → Auth → SMTP** — Resend/SendGrid/SES | ☐ |
| M2 | Customize **Invite** and **Reset password** templates (EN/AR) | ☐ |
| M3 | Test invite from **Users → Invite** | ☐ |
| M4 | Test forgot password flow | ☐ |

### 4b. TravelOS EmailService (welcome, booking, support)

| Step | Action | Done |
|------|--------|:----:|
| E1 | Apply migration `024_email_logs` (`npm run db:push`) | ☐ |
| E2 | Set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` on Vercel | ☐ |
| E3 | Set `NEXT_PUBLIC_SITE_URL` to production URL | ☐ |
| E4 | Complete onboarding → check `email_delivery_logs` for `welcome` | ☐ |
| E5 | Confirm booking (customer with email) → `booking_confirmation` log | ☐ |

See [EmailSetup.md](./EmailSetup.md).

---

## 5. Vercel deploy

| Step | Action | Done |
|------|--------|:----:|
| V1 | Connect GitHub repo `MohamedMecery/Dynex360-TravelAgent` — branch `main` | ☐ |
| V2 | Framework preset: **Next.js**; build: `npm run build` (default) | ☐ |
| V3 | Install command: `npm ci` or `npm install` | ☐ |
| V4 | Deploy; open production URL — landing `/` and `/login` load | ☐ |
| V5 | Sign in as tenant admin; open `/dashboard` | ☐ |

---

## 6. Cron worker (Sprint 8D)

| Step | Action | Done |
|------|--------|:----:|
| C1 | Set `CRON_SECRET` on Vercel (32+ random bytes) | ☐ |
| C2 | Cron schedule ships in `vercel.json` (`*/2 * * * *` → GET `/api/cron/process-dispatch-jobs`); Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. Verify the cron appears under Project → Settings → Cron Jobs after deploy (requires Pro for sub-daily) | ☐ |
| C3 | `npm run verify:worker-health` — pending/dead-letter acceptable | ☐ |

See [Production-Worker-Runbook.md](./Production-Worker-Runbook.md).

---

## 7. Post-deploy verification (gates)

| # | Command | Pass |
|---|---------|:----:|
| P1 | `PRODUCTION_CHECK=1 npm run validate:production-env` | ☐ |
| P2 | `GATE_BASE_URL=https://YOUR_APP npm run gate:portal` | ☐ |
| P3 | `npm run gate:sprint8d:worker` | ☐ |
| P4 | `npm run gate:sprint9a:payments` (mock OK on staging) | ☐ |
| P5 | `npm run gate:commercial` | ☐ |
| P6 | `npm run gate:production-matrix` (full matrix) | ☐ |
| P7 | `/crm/operations` dashboard loads metrics | ☐ |

Matrix doc: [Sprint-9E-Production-Verification-Matrix.md](../03-Architecture/Sprint-9E-Production-Verification-Matrix.md)

---

## 8. Post-deploy smoke (15 min)

| # | Check | Pass |
|---|-------|:----:|
| P1 | Login / logout (staff + portal) | ☐ |
| P2 | CRM lead → quotation → send | ☐ |
| P3 | Portal quotation accept + checkout (if payments on) | ☐ |
| P4 | `/crm/operations` — queue metrics | ☐ |
| P5 | `/ai/sales` and `/ai/operations` — read-only insights | ☐ |

---

## 9. Security reminders

- Never set `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` variables.
- RLS is enforced for all tenant data; do not bypass in application code.
- Booking Agent remains **draft-only**; confirmations happen in Bookings UI.
- Rotate API keys if exposed in logs or screenshots.

---

## 10. Rollback

- Vercel: redeploy previous deployment from **Deployments** tab.
- Database: migrations are forward-only; restore from Supabase backup if a bad migration was applied.

---

## Sign-off

| Role | Name | Date | Environment URL |
|------|------|------|-----------------|
| Engineering | | | |
| Product / Pilot lead | | | |
