# Tenant Onboarding Runbook

**Sprint:** 9E  
**Goal:** New agency tenant live in **under 30 minutes** (repeat deploys)  
**Prerequisites:** Supabase pilot project with migrations **001–064**, Vercel production deploy

---

## Pilot tenant checklist (30-minute target)

| # | Task | Time | Owner | Done |
|---|------|------|-------|:----:|
| 1 | Create Supabase project (if net-new) | 5 min | ENG | ☐ |
| 2 | `npm run db:push` (001–064) | 5 min | ENG | ☐ |
| 3 | Enable auth hook `custom_access_token_hook` | 2 min | OPS | ☐ |
| 4 | `npm run admin:create` → tenant + tenant_admin | 3 min | ENG | ☐ |
| 5 | Vercel env per [Production-Environment-Catalog.md](./Production-Environment-Catalog.md) | 5 min | ENG | ☐ |
| 6 | Invite CRM users (sales, finance) | 3 min | OPS | ☐ |
| 7 | Configure payments + WhatsApp + portal (below) | 5 min | OPS | ☐ |
| 8 | `PRODUCTION_CHECK=1 node scripts/validate-production-env.mjs` | 1 min | ENG | ☐ |
| 9 | `node scripts/run-commercial-journey-gate.mjs` (staging) | 5 min | ENG | ☐ |

---

## 1. Create tenant

**First tenant (bootstrap):**

```bash
npm run admin:create
```

Creates auth user, `tenants` row, `tenant_users` with `tenant_admin`.

**Additional tenants:** Super-admin flow or SQL `provision_tenant.sql` (engineering only).

Record:

| Field | Value |
|-------|-------|
| Tenant ID | |
| Tenant name | |
| Admin email | |

---

## 2. Create CRM users

| Step | Action |
|------|--------|
| 1 | Sign in as `tenant_admin` → **Users** → Invite |
| 2 | Assign role: `sales_agent`, `finance_officer` as needed |
| 3 | Invitee completes email link (Supabase Auth SMTP must work) |
| 4 | Confirm user `status = active` in **Users** list |

**Permissions:** Defined in migration `029_crm_permissions` + `063_ai_ops_rls_permissions`. Sales needs `crm.leads.*`, `crm.quotations.send`, portal does not use staff roles.

---

## 3. Assign permissions

Default role bundles are automatic via JWT `role` claim (auth hook). Verify:

| Role | Can |
|------|-----|
| tenant_admin | Full CRM, settings, users, operations dashboard |
| sales_agent | Leads, opportunities, quotations (own + write rules) |
| finance_officer | Read customers/bookings, payments read |

Custom per-user overrides: not in pilot scope — use role assignment only.

---

## 4. Configure payments

| Step | Action |
|------|--------|
| 1 | Vercel: `PAYMOB_*` live keys, **no** `PAYMOB_MOCK_MODE` |
| 2 | CRM → **Settings** (or `tenant_payment_settings`): enable payments, deposit %, `auto_on_deposit` |
| 3 | Run `npm run gate:sprint9a:payments` against staging |

---

## 5. Configure WhatsApp

| Step | Action |
|------|--------|
| 1 | Meta Business → WhatsApp Cloud API → tokens |
| 2 | Vercel: `WHATSAPP_META_*`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`; `WHATSAPP_MOCK_MODE=false` |
| 3 | Register webhook: `https://YOUR_APP/api/webhooks/whatsapp` |
| 4 | CRM: enable tenant WhatsApp; approve templates in `whatsapp_templates` |
| 5 | `npm run gate:sprint9b:whatsapp` |

---

## 6. Configure customer portal

| Step | Action |
|------|--------|
| 1 | Ensure `NEXT_PUBLIC_SITE_URL` is production HTTPS |
| 2 | Supabase redirect URLs include `/portal/**` paths |
| 3 | Per customer: create portal account (see [Customer-Onboarding-Runbook.md](./Customer-Onboarding-Runbook.md)) |
| 4 | `npm run gate:portal` |

---

## 7. Configure AI

| Step | Action |
|------|--------|
| 1 | `ANTHROPIC_API_KEY` on Vercel |
| 2 | Optional knowledge docs upload for RAG |
| 3 | `npm run gate:sprint9c:sales-ai` and `npm run gate:sprint9d:operations-ai` |

AI scoring runs via worker (`dispatch.ai_score`, `dispatch.ai_ops_score`) — requires **cron** (section 8).

---

## 8. Configure email

| Channel | Configuration |
|---------|----------------|
| Auth (invite/reset) | Supabase Dashboard → SMTP |
| Transactional | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `EMAIL_PROVIDER=resend` |

Test: onboarding welcome → row in `email_delivery_logs`.

---

## 9. Configure cron

| Step | Action |
|------|--------|
| 1 | Generate `CRON_SECRET` (32+ bytes) |
| 2 | Vercel cron → `POST /api/cron/process-dispatch-jobs` every 2–5 min |
| 3 | `node scripts/verify-worker-health.mjs` |

---

## 10. Enable production mode

| Check | Production value |
|-------|------------------|
| `WHATSAPP_MOCK_MODE` | unset / `false` |
| `PAYMOB_MOCK_MODE` | unset / `false` |
| `PAYMOB_MOCK_WEBHOOKS` | unset / `false` |
| `NEXT_PUBLIC_SITE_URL` | production domain |
| `PRODUCTION_CHECK=1` validator | PASS (no FAIL rows) |

---

## Sign-off

| Role | Signature | Date |
|------|-----------|------|
| Pilot lead | | |
| Engineering | | |

---

## Related

- [Pilot-Execution-Runbook.md](./Pilot-Execution-Runbook.md)
- [Customer-Onboarding-Runbook.md](./Customer-Onboarding-Runbook.md)
