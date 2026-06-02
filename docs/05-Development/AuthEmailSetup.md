# Supabase Auth Email Configuration (WP-4B)

TravelOS uses **Supabase Auth** for password recovery and invite onboarding. No custom mail service is required.

## Redirect URLs

Set in **Supabase Dashboard → Authentication → URL Configuration**:

| Environment | Site URL | Additional redirect URLs |
|-------------|----------|---------------------------|
| Local | `http://localhost:3000` | `http://localhost:3000/auth/callback`, `http://localhost:3000/reset-password`, `http://localhost:3000/onboarding` |
| Production | `https://<your-app-domain>` | Same paths on production origin |

App env:

```env
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

Used by `src/lib/auth/site-url.ts` for `resetPasswordForEmail` and invite `redirectTo`.

## Email templates (Dashboard → Authentication → Email Templates)

| Template | Purpose in TravelOS |
|----------|---------------------|
| **Reset password** | Forgot password → `/auth/callback?next=/reset-password` |
| **Invite user** | Tenant admin invite → `/auth/callback?next=/onboarding` |

Customize subject/body for EN (and duplicate for AR in template HTML if needed).

## SMTP

| Environment | Guidance |
|-------------|----------|
| **Local** | `npx supabase start` — emails appear in **Inbucket** (Studio → Auth → logs or Inbucket UI, typically port 54324) |
| **Production** | Dashboard → **Project Settings → Auth → SMTP**. Use SendGrid, AWS SES, or Resend. Required for real invite/reset delivery |

## Flow summary

1. **Forgot password:** `resetPasswordForEmail` → user email → callback → `/reset-password` → `updateUser` → login.
2. **Invite:** `inviteUserByEmail` → invite email → callback → `/onboarding` → API activates `pending` → `active` → login.

## Custom Access Token Hook

Ensure **Authentication → Hooks → Custom Access Token** points to `public.custom_access_token_hook` (migration 009/020) so JWT includes `account_status` after activation.

## Checklist before production

- [ ] `NEXT_PUBLIC_SITE_URL` set on Vercel/host
- [ ] Production redirect URLs allowlisted in Supabase
- [ ] SMTP configured and test email sent
- [ ] Reset + Invite templates mention TravelOS branding
- [ ] Hook enabled on cloud project
