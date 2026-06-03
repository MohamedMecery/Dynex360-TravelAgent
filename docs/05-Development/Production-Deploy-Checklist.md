# Production Deploy Checklist (Pilot / Vercel)

**Last updated:** 2026-06-03  
**Use when:** First deploy or promoting `main` to a live agency pilot.  
**Related:** [Phase5-AI-Validation.md](./Phase5-AI-Validation.md) · [DemoScript.md](./DemoScript.md) · [Glossary.md](../01-Product/Glossary.md)

---

## 1. Supabase project

| Step | Action | Done |
|------|--------|:----:|
| S1 | Create or select cloud project; note **Project URL** and **API keys** | ☐ |
| S2 | Apply migrations: `npm run db:push` (or run `database/migrations/001`–`021` in order) | ☐ |
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

### Optional

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for emails/links if added later |

**Copy-paste template (fill values, do not commit):**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
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

## 4. SMTP / user invites (tenant onboarding)

Required if **tenant_admin** invites users by email.

| Step | Action | Done |
|------|--------|:----:|
| M1 | **Project Settings → Auth → SMTP Settings** — configure provider (Resend, SendGrid, AWS SES, etc.) | ☐ |
| M2 | Set **Sender email** and **Sender name** (e.g. `TravelOS <noreply@yourdomain.com>`) | ☐ |
| M3 | Send test invite from **Users → Invite** in admin UI | ☐ |
| M4 | Confirm invite link opens app and completes signup | ☐ |

Without SMTP, create users manually in Supabase Auth + `users` table (dev only).

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

## 6. Post-deploy smoke (15 min)

| # | Check | Pass |
|---|-------|:----:|
| P1 | Login / logout | ☐ |
| P2 | Create or view customer, package, booking | ☐ |
| P3 | Create invoice from booking — subtotal matches booking line items | ☐ |
| P4 | `/ai/knowledge` — question returns answer | ☐ |
| P5 | `/settings/knowledge` — documents listed | ☐ |
| P6 | `/audit-logs` — rows visible for `tenant_admin` | ☐ |
| P7 | Run [Phase5-AI-Validation.md](./Phase5-AI-Validation.md) sign-off when selling AI | ☐ |

---

## 7. Security reminders

- Never set `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` variables.
- RLS is enforced for all tenant data; do not bypass in application code.
- Booking Agent remains **draft-only**; confirmations happen in Bookings UI.
- Rotate API keys if exposed in logs or screenshots.

---

## 8. Rollback

- Vercel: redeploy previous deployment from **Deployments** tab.
- Database: migrations are forward-only; restore from Supabase backup if a bad migration was applied.

---

## Sign-off

| Role | Name | Date | Environment URL |
|------|------|------|-----------------|
| Engineering | | | |
| Product / Pilot lead | | | |
