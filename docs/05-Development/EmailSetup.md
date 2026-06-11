# TravelOS Email Setup (Pilot)

**Last updated:** 2026-06-03

Dual-channel architecture:

| Channel | Emails | Configuration |
|---------|--------|---------------|
| **Supabase Auth** | User invite, password reset | Supabase Dashboard → Auth → SMTP + Email Templates |
| **TravelOS EmailService** | Welcome, booking confirmation, support ticket | Vercel env (`RESEND_API_KEY` or `SMTP_*`) |

See also [AuthEmailSetup.md](./AuthEmailSetup.md) for Supabase Auth flows.

---

## Environment variables (Vercel / `.env.local`)

### EmailService (transactional)

| Variable | Required | Notes |
|----------|----------|-------|
| `EMAIL_PROVIDER` | No | `resend` (default) or `smtp` |
| `RESEND_API_KEY` | Yes (Resend) | From [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | Recommended | Verified sender domain |
| `SMTP_HOST` | Yes (SMTP mode) | SendGrid/SES/Hostinger relay |
| `SMTP_PORT` | No | Default `587` |
| `SMTP_USER` | Yes (SMTP mode) | |
| `SMTP_PASSWORD` | Yes (SMTP mode) | |
| `SMTP_SECURE` | No | `true` for port 465 |
| `SMTP_FROM_EMAIL` | Recommended | |
| `SMTP_FROM_NAME` | No | Default `TravelOS` |
| `NEXT_PUBLIC_SITE_URL` | Yes | Links in emails |

**Copy-paste (server only — do not commit):**

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=TravelOS
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

When keys are missing, emails are **skipped** and logged to `email_delivery_logs` with status `skipped`.

---

## Triggers

| Template | Trigger |
|----------|---------|
| Welcome | `POST /api/auth/onboarding` after activation |
| Booking confirmation | `PATCH /api/bookings/[id]/status` → `confirmed` |
| Support ticket | `PATCH /api/support-tickets/[id]` assignee/status change |

---

## Delivery logs

Table `email_delivery_logs` (migration `024_email_logs.sql`):

- `email_type`, `recipient`, `status` (`sent` \| `failed` \| `skipped`)
- Tenant-scoped via RLS

---

## Branding

Loaded from `tenants.name` + `tenant_settings.settings` JSONB (same keys as invoice PDF):

- `company_name`, `company_logo`, `company_email`, `company_phone`, `company_address`

---

## Testing

```bash
npm run test:email          # node:test template rendering (EN + AR RTL)
npm run test:e2e -- e2e/email-flows.spec.ts
```

---

## Pilot checklist

- [ ] `npm run db:push` (includes `024_email_logs`)
- [ ] Supabase Auth SMTP + invite/reset templates (EN/AR)
- [ ] Resend domain verified + `RESEND_API_KEY` on Vercel
- [ ] Test invite (Supabase) + onboarding welcome (EmailService)
- [ ] Confirm booking → customer receives confirmation (if customer has email)
- [ ] Assign support ticket → assignee receives notification
