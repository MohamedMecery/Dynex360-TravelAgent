# TravelOS Pilot Execution Runbook

**Version:** 2.0 (Sprint 9E)  
**Last updated:** 2026-06-04  
**Audience:** Pilot lead, operations, or product — with optional engineering support for database scripts  
**Goal:** Deploy and validate a **single-agency TravelOS pilot** on Supabase + Vercel without reading the codebase.

**Estimated total time:** 1–2 days (first pilot) · 3–5 hours (repeat deploy after templates exist)

---

## Before you start

### Accounts and access you need

| # | Item | Who usually has it |
|---|------|-------------------|
| 1 | [Supabase](https://supabase.com) organization — ability to create a project | Engineering / DevOps |
| 2 | [Vercel](https://vercel.com) team — ability to import the GitHub repo and set env vars | Engineering / DevOps |
| 3 | [Resend](https://resend.com) account — domain verification | Marketing / IT |
| 4 | [Anthropic](https://console.anthropic.com) API key (for AI quality) | Engineering |
| 5 | GitHub access to the TravelOS repository (branch `main`) | Engineering |
| 6 | A laptop with **Node.js 20** and the repo cloned (for migrations + seed only) | Engineering |

### Important rules

1. **Use a dedicated Supabase project for the pilot.** Do not use the GitHub E2E/CI Supabase project — CI may overwrite seed data.
2. **Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_*` variable** — server-only on Vercel.
3. **Run steps in order** — Auth hook and migrations must exist before login and invite tests pass.
4. **Demo seed is optional** — skip Section 4 if the agency will enter real data only (AI smoke tests need seed or manual knowledge docs).

### Roles in this runbook

| Symbol | Meaning |
|--------|---------|
| **ENG** | Engineering — terminal, Supabase CLI, Vercel env |
| **OPS** | Pilot lead / operations — dashboards, UI smoke, sign-off |
| **IT** | DNS / email domain owner |

Record your pilot URLs here before starting:

| Field | Your value |
|-------|------------|
| Supabase project name | |
| Supabase project URL | `https://____.supabase.co` |
| Vercel production URL | `https://____` |
| Custom domain (if any) | |
| Resend verified sender | `noreply@____` |
| Tenant admin email (pilot login) | |
| Pilot sign-off date | |

---

## 1. Supabase setup

### 1.1 Create project

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 1.1.1 | Log in to [Supabase Dashboard](https://supabase.com/dashboard) | OPS | ☐ |
| 1.1.2 | **New project** → choose region close to users → strong DB password → create | OPS | ☐ |
| 1.1.3 | Wait until project status is **Healthy** | OPS | ☐ |
| 1.1.4 | Open **Project Settings → API** and copy: **Project URL**, **anon/publishable key**, **service_role key** (store in password manager; service role is secret) | ENG | ☐ |

### 1.2 Apply migrations (001–064)

Migrations create core platform, CRM, customer portal, domain events, async worker, payments, WhatsApp, and AI assistants.

**Option A — Recommended (engineering laptop)**

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 1.2.1 | Clone the TravelOS repo and open a terminal in the project folder | ENG | ☐ |
| 1.2.2 | Create `.env.local` with pilot Supabase URL and service role key (see Section 2.1 template) | ENG | ☐ |
| 1.2.3 | Log in to Supabase CLI: `npx supabase login` | ENG | ☐ |
| 1.2.4 | Link project: `npx supabase link --project-ref YOUR_PROJECT_REF` (ref is the ID in the Supabase URL) | ENG | ☐ |
| 1.2.5 | Run: `npm install` then `npm run db:push` | ENG | ☐ |
| 1.2.6 | Confirm command finishes with **no errors** | ENG | ☐ |

**Option B — If CLI is unavailable**

Ask engineering to run Option A, or apply the bundled SQL script `database/scripts/RUN_IN_SUPABASE_SQL_EDITOR.sql` in **SQL Editor** (engineering must confirm it matches migration **024** — CLI is safer).

**Migration checklist (all must be present on pilot DB)**

| # | File | Purpose |
|---|------|---------|
| 001–008 | Core schema, RLS base, reference seed | Tenants, users, RBAC |
| 009 | Auth hook function | JWT `tenant_id` + `role` |
| 010 | Geography seed | Countries for addresses |
| 011–021 | Bookings, AI, support, audit, user mgmt | MVP + Phase 5 |
| 022 | Invoice line snapshot | Issued invoice freeze |
| 023 | AI analytics | `/ai/analytics` |
| 024 | Email delivery logs | Transactional email audit |
| 025–038 | CRM + quotations + dashboard | Leads, opportunities, quotes |
| 039–042 | Customer portal | Portal accounts, transactions |
| 041, 045 | Domain events + dispatch jobs | Async communications |
| 047–050 | Payments | Paymob, ledger, tenant settings |
| 051–055 | WhatsApp | Templates, messages, preferences |
| 056–064 | AI Sales + Operations | Snapshots, recommendations, insights |

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 1.2.7 | In Supabase **Table Editor**, confirm tables exist: `tenants`, `quotations`, `customer_portal_accounts`, `event_dispatch_jobs`, `payment_orders`, `whatsapp_messages`, `ai_ops_snapshots` | OPS | ☐ |

### 1.3 Enable Auth hook (required)

Without this hook, users cannot access tenant data correctly.

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 1.3.1 | Dashboard → **Authentication** → **Hooks** | OPS | ☐ |
| 1.3.2 | Enable **Custom Access Token** hook | OPS | ☐ |
| 1.3.3 | Select function: **`public.custom_access_token_hook`** | OPS | ☐ |
| 1.3.4 | Save / enable the hook | OPS | ☐ |

### 1.4 Configure Auth URLs

Replace `YOUR_APP_URL` with your final Vercel URL (or custom domain).

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 1.4.1 | **Authentication → URL Configuration** | OPS | ☐ |
| 1.4.2 | **Site URL:** `YOUR_APP_URL` (example: `https://travelos-pilot.vercel.app`) | OPS | ☐ |
| 1.4.3 | **Redirect URLs** — add each line below (one per line) | OPS | ☐ |

```
YOUR_APP_URL/**
YOUR_APP_URL/auth/callback
YOUR_APP_URL/reset-password
YOUR_APP_URL/onboarding
http://localhost:3000/**
http://localhost:3000/auth/callback
```

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 1.4.4 | For Vercel preview apps, also add: `https://*.vercel.app/**` | OPS | ☐ |

### 1.5 Configure SMTP (Auth emails: invite + password reset)

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 1.5.1 | **Project Settings → Authentication → SMTP Settings** → enable custom SMTP | OPS | ☐ |
| 1.5.2 | Enter SMTP host, port, user, password from your provider (Resend SMTP, SendGrid, or SES) | IT/ENG | ☐ |
| 1.5.3 | Set sender name and from-address (e.g. `TravelOS <noreply@yourdomain.com>`) | IT | ☐ |
| 1.5.4 | Send a **test email** from the SMTP settings page | OPS | ☐ |
| 1.5.5 | **Authentication → Email Templates** — customize **Invite user** and **Reset password** (TravelOS branding, EN; add AR copy if needed) | OPS | ☐ |

### 1.6 Storage bucket (Knowledge uploads)

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 1.6.1 | **Storage** → confirm bucket **`knowledge-documents`** exists (created by migration 016) | OPS | ☐ |
| 1.6.2 | If missing, ask engineering to re-run `npm run db:push` | ENG | ☐ |

### 1.7 Supabase setup sign-off

| Check | Pass |
|-------|:----:|
| Migrations 001–064 applied | ☐ |
| Auth hook `custom_access_token_hook` enabled | ☐ |
| Site URL + redirect URLs set | ☐ |
| SMTP test email received | ☐ |
| Storage bucket present | ☐ |

---

## 2. Vercel setup

### 2.1 Environment variables

Open **Vercel → Your project → Settings → Environment Variables**. Set for **Production** (and Preview if you test previews).

**Required — app will not work without these**

| Variable | Value source | Role |
|----------|--------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | ENG |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API → publishable or anon key | ENG |

**Required for user invite and onboarding**

| Variable | Value source | Role |
|----------|--------------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role (secret) | ENG |

**Required for AI quality (recommended for pilot)**

| Variable | Value source | Role |
|----------|--------------|------|
| `ANTHROPIC_API_KEY` | Anthropic console | ENG |

**Required for transactional email (welcome, booking, support)**

| Variable | Example | Role |
|----------|---------|------|
| `NEXT_PUBLIC_SITE_URL` | `https://your-production-domain.com` | ENG |
| `EMAIL_PROVIDER` | `resend` | ENG |
| `RESEND_API_KEY` | Resend → API Keys | ENG |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `noreply@yourdomain.com` | ENG |

**Required for async communications (Sprint 8D)**

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Worker endpoint; configure Vercel Cron → `POST /api/cron/process-dispatch-jobs` |

**Required for live payments / WhatsApp (disable mocks in production)**

| Variable | Purpose |
|----------|---------|
| `PAYMOB_*` | Paymob gateway (see [Production-Environment-Catalog.md](./Production-Environment-Catalog.md)) |
| `WHATSAPP_META_*` | Meta Cloud API |
| Do **not** set | `PAYMOB_MOCK_*`, `WHATSAPP_MOCK_MODE=true` on production |

**Optional**

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Vector embeddings for knowledge (FTS works without it) |
| `SMTP_*` | Only if `EMAIL_PROVIDER=smtp` instead of Resend |

**Sprint 9E references:** [Production-Environment-Catalog.md](./Production-Environment-Catalog.md) · [Tenant-Onboarding-Runbook.md](./Tenant-Onboarding-Runbook.md) · [TravelOS-Pilot-Launch-Readiness-Report.md](../03-Architecture/TravelOS-Pilot-Launch-Readiness-Report.md)

**Copy-paste template (fill in; do not commit to Git)**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SITE_URL=
EMAIL_PROVIDER=resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 2.1.1 | Add all variables above for **Production** | ENG | ☐ |
| 2.1.2 | Redeploy after changing env vars (Vercel prompts or manual redeploy) | ENG | ☐ |

### 2.2 Deployment

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 2.2.1 | Vercel → **Add New Project** → import GitHub repo | ENG | ☐ |
| 2.2.2 | Framework: **Next.js** (auto-detected) | ENG | ☐ |
| 2.2.3 | Production branch: **`main`** | ENG | ☐ |
| 2.2.4 | Build command: `npm run build` (default) · Install: `npm ci` or `npm install` | ENG | ☐ |
| 2.2.5 | Deploy and wait for **Ready** status | ENG | ☐ |
| 2.2.6 | Open production URL — landing page `/` loads | OPS | ☐ |
| 2.2.7 | Open `/login` — login form loads (do not sign in until Section 4 if using seed) | OPS | ☐ |

### 2.3 Domain configuration (optional)

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 2.3.1 | Vercel → **Settings → Domains** → add custom domain | IT | ☐ |
| 2.3.2 | At DNS provider, add records Vercel shows (usually `CNAME` or `A`) | IT | ☐ |
| 2.3.3 | Wait for **Valid** certificate on Vercel | IT | ☐ |
| 2.3.4 | Update Supabase **Site URL** and **Redirect URLs** to the custom domain | OPS | ☐ |
| 2.3.5 | Update Vercel `NEXT_PUBLIC_SITE_URL` to custom domain and redeploy | ENG | ☐ |

### 2.4 Vercel sign-off

| Check | Pass |
|-------|:----:|
| Production deploy green | ☐ |
| Env vars set (including service role + Resend if email in scope) | ☐ |
| `/` and `/login` load on production URL | ☐ |

---

## 3. Resend setup (transactional email)

TravelOS uses **two email channels**:

| Channel | Sends | Configured in |
|---------|-------|---------------|
| Supabase Auth | User invite, password reset | Section 1.5 (SMTP) |
| TravelOS EmailService | Welcome, booking confirmation, support updates | This section (API) |

### 3.1 Account and domain

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 3.1.1 | Sign up at [resend.com](https://resend.com) | IT/OPS | ☐ |
| 3.1.2 | **Domains → Add Domain** → enter agency domain (e.g. `youragency.com`) | IT | ☐ |
| 3.1.3 | Resend shows **DNS records** to add — typically: | IT | ☐ |

| Record type | Purpose |
|-------------|---------|
| **DKIM** (TXT or CNAME) | Signing outbound mail |
| **SPF** (TXT) | Authorize Resend to send for the domain |
| **Return-Path** (CNAME, if shown) | Bounce handling |

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 3.1.4 | Add records at your DNS host (Cloudflare, GoDaddy, etc.) | IT | ☐ |
| 3.1.5 | In Resend, click **Verify** — status must become **Verified** (may take up to 48 hours; often minutes) | IT | ☐ |
| 3.1.6 | Optional but recommended: add **DMARC** TXT per Resend/docs for deliverability | IT | ☐ |

### 3.2 API key and sender

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 3.2.1 | Resend → **API Keys → Create** → copy key once (secret) | ENG | ☐ |
| 3.2.2 | Choose sender address on verified domain, e.g. `noreply@youragency.com` | OPS | ☐ |
| 3.2.3 | Set on Vercel: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `EMAIL_PROVIDER=resend` | ENG | ☐ |
| 3.2.4 | Redeploy Vercel production | ENG | ☐ |

### 3.3 Resend sign-off

| Check | Pass |
|-------|:----:|
| Domain **Verified** in Resend | ☐ |
| API key on Vercel | ☐ |
| `RESEND_FROM_EMAIL` uses verified domain | ☐ |

---

## 4. Seed data (demo tenant)

**Skip this section** if the pilot uses only real agency data. If you skip, complete Phase 5 AI tests only after uploading knowledge documents manually.

### 4.1 Create admin tenant and user (once per pilot DB)

Run on the engineering laptop with `.env.local` pointing at the **pilot** Supabase project.

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 4.1.1 | Set admin credentials (example — use your own secure password): | ENG | ☐ |

```powershell
# Windows PowerShell example
$env:ADMIN_EMAIL="pilot-admin@youragency.com"
$env:ADMIN_PASSWORD="YourSecurePassword12!"
$env:TENANT_NAME="Your Agency Name"
$env:TENANT_SLUG="your-agency-slug"
npm run admin:create
```

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 4.1.2 | Command prints success — note the email and tenant slug | ENG | ☐ |
| 4.1.3 | Store pilot admin password in password manager | OPS | ☐ |

**Default** (if env vars omitted): slug `dynex360-travel`, email from script defaults — change for production pilots.

### 4.2 Load demo business data

| Step | Action | Role | Done |
|------|--------|------|:----:|
| 4.2.1 | Same `.env.local` with service role key | ENG | ☐ |
| 4.2.2 | Run: `npm run db:seed` (optional: `TENANT_SLUG=your-agency-slug npm run db:seed`) | ENG | ☐ |
| 4.2.3 | Wait for **Seed complete** with no errors | ENG | ☐ |

### 4.3 What demo seed creates

| Entity | Count | Notes |
|--------|------:|-------|
| Destinations | 3 | Dubai, Istanbul, Paris |
| Packages | 5 | All **published** |
| Customers | 10 | Emails `*@demo.travelos.local` |
| Travelers | 20 | 2 per customer |
| Bookings | 20 | 4 draft · 7 confirmed · 5 completed · 4 cancelled |
| Payments | 10 | Linked to bookings |
| Knowledge documents | 4 | For Knowledge/Support agents |

**Seeded booking reference examples:** `DEMO-BK-001` … `DEMO-BK-020` (use `DEMO-BK-005` in AI tests).

### 4.4 Seed verification (UI)

| Step | Action | Role | Pass |
|------|--------|------|:----:|
| 4.4.1 | Sign in at `YOUR_APP_URL/login` with pilot admin | OPS | ☐ |
| 4.4.2 | **Dashboard** — booking status cards show non-zero counts | OPS | ☐ |
| 4.4.3 | **Customers** — search `demo.travelos.local` → 10 results | OPS | ☐ |
| 4.4.4 | **Bookings** — filter **Draft** → 4 bookings | OPS | ☐ |
| 4.4.5 | **Settings → Knowledge Base** — 4 published documents | OPS | ☐ |

---

## 5. Smoke tests

Perform on **production Vercel URL** after Sections 1–4 (or 1–3 if no seed).  
**Tester:** Pilot lead · **Time:** ~45–60 minutes

### 5.1 Authentication

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| AUTH-1 | Open `/login` → sign in with pilot admin | Redirect to `/dashboard` | ☐ |
| AUTH-2 | Refresh page | Still signed in | ☐ |
| AUTH-3 | Sign out → sign in again | Works without error | ☐ |
| AUTH-4 | Open `/forgot-password` → enter admin email → submit | Message that email was sent (check inbox) | ☐ |
| AUTH-5 | Use reset link from email → set new password → sign in | Login succeeds with new password | ☐ |

### 5.2 User invitation

Requires `SUPABASE_SERVICE_ROLE_KEY` on Vercel.

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| INV-1 | As tenant admin, go to **Users** → **Invite** (or create invite) | Form opens | ☐ |
| INV-2 | Invite a test address you control (role: Agent or Finance) | Success toast; no server error | ☐ |
| INV-3 | Open invite email → complete onboarding link | Lands on onboarding; activation succeeds | ☐ |
| INV-4 | New user signs in | Dashboard loads for new role | ☐ |
| INV-5 | Supabase **Authentication → Users** | New user listed | ☐ |

### 5.3 Booking flow

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| BK-1 | **Bookings** → open a **Draft** booking (e.g. DEMO-BK-001) | Detail page opens | ☐ |
| BK-2 | Use **Confirm** (status action on booking show/list) | Status becomes **Confirmed** | ☐ |
| BK-3 | Open **Bookings** → filter **Confirmed** | Count includes the booking you confirmed | ☐ |
| BK-4 | Optional: create new booking via **Bookings → Create** | Saves as draft with reference number | ☐ |
| BK-5 | Open a **Cancelled** booking | Cancel details visible; cannot record new payment | ☐ |

### 5.4 Payment flow

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| PAY-1 | **Payments** → list loads | Demo payments visible (if seeded) | ☐ |
| PAY-2 | Open a booking with **Partial** payment status | Payment history on show page | ☐ |
| PAY-3 | On a **Confirmed** booking with balance, click **Record Payment** | Payment create form opens | ☐ |
| PAY-4 | Enter amount ≤ remaining balance → save | Payment appears; booking payment status updates | ☐ |
| PAY-5 | Try **Record Payment** on **Cancelled** booking | Blocked in UI | ☐ |

### 5.5 Invoice PDF

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| INV-PDF-1 | **Invoices → Create** → select confirmed booking (e.g. DEMO-BK-005) | Subtotal matches booking lines | ☐ |
| INV-PDF-2 | Save invoice → **Issue** (if draft) | Status issued; line snapshot frozen | ☐ |
| INV-PDF-3 | Open invoice **Show** → **Download PDF** | PDF downloads; opens without error | ☐ |
| INV-PDF-4 | Switch app language to **AR** (if enabled) → download PDF again | Arabic layout renders | ☐ |

### 5.6 Email delivery

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| EM-1 | Invite user (Section 5.2) | **Auth** invite email received | ☐ |
| EM-2 | Complete onboarding for a **new** invited user | **Welcome** email received (if Resend configured) | ☐ |
| EM-3 | Confirm a booking whose customer has a **real email** you control | **Booking confirmation** email received | ☐ |
| EM-4 | Assign or update a **support ticket** | Assignee receives notification email | ☐ |
| EM-5 | Supabase **Table Editor → `email_delivery_logs`** | Rows with `sent` (or `skipped` if misconfigured — fix before GO) | ☐ |

If emails show `skipped` in logs, check Vercel `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `NEXT_PUBLIC_SITE_URL`.

### 5.7 Knowledge Agent

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| KN-1 | Go to `/ai/knowledge` | Chat UI loads | ☐ |
| KN-2 | Ask: *What is the cancellation policy for confirmed bookings?* | Answer with at least one citation | ☐ |
| KN-3 | Ask about Dubai packages | Answer references package/FAQ content | ☐ |
| KN-4 | Click 👍 on a reply | Thank-you feedback message | ☐ |

### 5.8 Booking Agent

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| BA-1 | Go to `/ai/booking` | Chat UI loads | ☐ |
| BA-2 | Ask: *Show Dubai packages under $1500* | Package recommendations returned | ☐ |
| BA-3 | **Draft builder** → Preview → **Confirm & apply** | New booking in **Draft** status only | ☐ |
| BA-4 | Ask: *What is the status of DEMO-BK-005?* | Status, payment, total returned | ☐ |
| BA-5 | Agent must **not** auto-confirm bookings | Confirmed only via Bookings UI (Section 5.3) | ☐ |

### 5.9 Support Agent

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| SA-1 | Go to `/ai/support` | Chat UI loads | ☐ |
| SA-2 | Ask: *What is booking DEMO-BK-005 status?* | Live booking summary in reply | ☐ |
| SA-3 | Ask to open a ticket (or enable **Create ticket**) | Ticket number shown | ☐ |
| SA-4 | Message includes *refund dispute* | Ticket created **escalated** | ☐ |
| SA-5 | `/ai/support/tickets` → open ticket → **Assign** / **Resolve** | Status updates; thread shows system message | ☐ |

### 5.10 Agent Analytics

Requires migration **023** and role **tenant_admin** or **super_admin**.

| # | Steps | Expected result | Pass |
|---|--------|-----------------|:----:|
| AN-1 | Go to `/ai/analytics` | Dashboard loads without error | ☐ |
| AN-2 | Change date range preset | Charts/metrics update | ☐ |
| AN-3 | Click **Export** (CSV) | File downloads | ☐ |
| AN-4 | Sign in as **Agent** role (if available) | Analytics **not** accessible (403 or hidden nav) | ☐ |

### 5.11 Smoke summary

| Area | Pass |
|------|:----:|
| Authentication | ☐ |
| User invitation | ☐ |
| Booking flow | ☐ |
| Payment flow | ☐ |
| Invoice PDF | ☐ |
| Email delivery | ☐ |
| Knowledge Agent | ☐ |
| Booking Agent | ☐ |
| Support Agent | ☐ |
| Agent Analytics | ☐ |

---

## 6. Phase 5 sign-off

Complete after Section 5 smoke tests. Mark each item **Pass** only if observed on the **pilot production URL**.

**Sign in as:** tenant admin (default tenant slug `dynex360-travel` unless you changed it in Section 4).

### 6.1 Knowledge Agent (K1–K5)

| ID | Step | Expected | Pass |
|----|------|----------|:----:|
| **K1** | Ask: *What is the cancellation policy for confirmed bookings?* | Answer with ≥1 citation from seeded policy doc | ☐ |
| **K2** | Ask about Dubai packages | References package/FAQ content | ☐ |
| **K3** | Click 👍 on assistant reply | Toast “Thanks for your feedback”; row in `ai_feedback` (optional: verify in Supabase Table Editor) | ☐ |
| **K4** | Open **Settings → Knowledge Base** | Four demo documents listed as published | ☐ |
| **K5** | Open `/ai/analytics` | Metrics load; usage reflects recent agent chats | ☐ |

### 6.2 Booking Agent (B1–B5)

| ID | Step | Expected | Pass |
|----|------|----------|:----:|
| **B1** | Ask: *Show Dubai packages under $1500* | Ranked package recommendations | ☐ |
| **B2** | **Draft builder** → Preview draft → **Confirm & apply** | Booking created with `status = draft` and reference number | ☐ |
| **B3** | **Bookings** → confirm that draft manually | Status moves to **confirmed** (human-in-the-loop) | ☐ |
| **B4** | Ask status of seeded reference `DEMO-BK-005` | Returns status, payment_status, total | ☐ |
| **B5** | 👍/👎 on assistant reply | Feedback saved | ☐ |

**Guardrail:** Agent must **never** set `status = confirmed` autonomously.

### 6.3 Support Agent (S1–S5)

| ID | Step | Expected | Pass |
|----|------|----------|:----:|
| **S1** | Ask: *What is booking DEMO-BK-005 status?* | Live booking summary in reply | ☐ |
| **S2** | Message with “open ticket” or enable **Create ticket** | Ticket number shown; appears in `/ai/support/tickets` | ☐ |
| **S3** | Message containing “refund dispute” | Ticket **escalated** with assignee (tenant admin) | ☐ |
| **S4** | Open ticket → **Escalate** / **Assign** / **Resolve** | Status updates + system message in thread | ☐ |
| **S5** | 👍/👎 on assistant reply | Feedback saved | ☐ |

### 6.4 Security (T1–T2)

| ID | Step | Expected | Pass |
|----|------|----------|:----:|
| **T1** | If two tenants exist: query knowledge in each | No cross-tenant data in answers | ☐ or N/A |
| **T2** | Open `YOUR_APP_URL/api/ai/knowledge-agent` in browser without login | **401 Unauthorized** (not 200) | ☐ |

### 6.5 Phase 5 sign-off table

| Role | Name | Date | All K/B/S/T passed |
|------|------|------|:------------------:|
| Product / Pilot lead | | | ☐ |
| Engineering | | | ☐ |

When all rows pass, Phase 5 AI is **signed off** for this pilot environment.

---

## 7. Go / No-Go checklist

### Blockers (must be YES to GO)

| # | Gate | YES |
|---|------|:---:|
| G1 | Supabase migrations **001–024** applied on pilot project | ☐ |
| G2 | Auth hook **`custom_access_token_hook`** enabled | ☐ |
| G3 | Vercel `NEXT_PUBLIC_SUPABASE_URL` + publishable key set | ☐ |
| G4 | Vercel `SUPABASE_SERVICE_ROLE_KEY` set (if staff invites required) | ☐ |
| G5 | Pilot admin can sign in and reach `/dashboard` | ☐ |
| G6 | No critical smoke failure in Sections 5.1–5.3 (auth, invite, booking) | ☐ |

### High priority (YES for full pilot; NO = limited pilot)

| # | Gate | YES |
|---|------|:---:|
| H1 | Supabase Auth SMTP working (invite + reset) | ☐ |
| H2 | Resend domain verified + transactional env on Vercel | ☐ |
| H3 | `ANTHROPIC_API_KEY` set (AI answers usable) | ☐ |
| H4 | Phase 5 sign-off (Section 6) complete if AI is in pilot scope | ☐ |
| H5 | Invoice PDF smoke passed (Section 5.5) | ☐ |
| H6 | `email_delivery_logs` shows `sent` for at least one real send | ☐ |

### Go / No-Go decision

| Decision | When to choose |
|----------|----------------|
| **GO** | All blockers (G1–G6) YES · High items YES for anything promised to the agency |
| **GO (limited)** | Blockers YES but email or AI deferred — document limitations to agency |
| **NO-GO** | Any blocker NO · or repeated `failed`/`skipped` email with no fix |

| Field | Value |
|-------|-------|
| **Decision** | GO / GO (limited) / NO-GO |
| **Decided by** | |
| **Date** | |
| **Notes** | |

---

## 8. Rollback plan

### 8.1 Application (Vercel)

| Step | Action |
|------|--------|
| 1 | Vercel → **Deployments** |
| 2 | Find last known-good deployment → **⋯ → Promote to Production** |
| 3 | Confirm production URL serves previous version |
| 4 | If env var change caused the issue, restore previous values and redeploy |

**Typical recovery time:** 5–15 minutes

### 8.2 Database (Supabase)

Migrations are **forward-only**. Do not delete production data casually.

| Situation | Action |
|-----------|--------|
| Bad deploy only (no schema change) | Vercel rollback (8.1) — no DB action |
| Bad migration just applied | Supabase **Database → Backups** → restore to point-in-time **or** contact engineering |
| Need to wipe pilot and restart | Create **new** Supabase project, re-run Section 1, update Vercel env, redeploy |

### 8.3 Email / DNS

| Situation | Action |
|-----------|--------|
| Wrong sender domain | Pause campaigns; fix DNS in Resend; update `RESEND_FROM_EMAIL` |
| Auth emails broken | Revert Supabase SMTP settings to last working provider |

### 8.4 Rollback drill (recommended once)

| Step | Pass |
|------|:----:|
| Note current Vercel deployment ID | ☐ |
| Promote previous deployment in staging/preview | ☐ |
| Confirm login still works | ☐ |
| Promote current deployment back | ☐ |

---

## 9. Known issues

| Issue | Impact | Workaround |
|-------|--------|------------|
| Transactional email **skipped** when `RESEND_API_KEY` or `RESEND_FROM_EMAIL` missing | No welcome/booking/support emails | Set Resend env vars; check `email_delivery_logs.status` |
| AI **extractive fallback** without `ANTHROPIC_API_KEY` | Weak or generic agent answers | Add Anthropic key on Vercel |
| **Tenant branding UI** not in Settings | PDF/email use default or JSON in `tenant_settings` | Engineering sets branding keys in DB for pilot |
| **Booking confirmation email** only when status changes via **Confirm** action API | Direct DB edits won’t trigger email | Always use UI status buttons |
| **Demo seed** uses `@demo.travelos.local` emails | Booking confirmation emails won’t reach real inboxes for demo customers | Use a customer with your real email for EM-3 |
| **Second tenant** rarely tested | Cross-tenant bugs may hide | T1 test when multi-agency needed |
| **GitHub E2E project** must stay separate | CI seed can wipe pilot data | Never point E2E secrets at pilot Supabase |
| Migrations require **engineering CLI** once per environment | OPS cannot click “migrate” in dashboard alone | Schedule ENG for Section 1.2 |
| `npm run db:seed` on **live agency data** | Overwrites/upserts demo UUID rows only — safe for demo IDs; avoid on production customer DB | Seed only on fresh pilot or demo tenant |

---

## 10. Pilot success criteria

The pilot is **successful** when all of the following are true:

### Business operations

| Criterion | Met |
|-----------|:---:|
| Agency admin can sign in, sign out, and reset password | ☐ |
| Agency can invite at least one staff user who completes onboarding | ☐ |
| Agency can view and manage customers, packages, and bookings | ☐ |
| Agency can record a payment and see payment status update on the booking | ☐ |
| Agency can issue an invoice and download a PDF | ☐ |

### AI (if in pilot scope)

| Criterion | Met |
|-----------|:---:|
| Knowledge Agent answers policy/package questions with citations | ☐ |
| Booking Agent creates **draft** bookings only; human confirms | ☐ |
| Support Agent creates and updates tickets | ☐ |
| Agent Analytics visible to tenant admin | ☐ |
| Phase 5 sign-off (Section 6) completed | ☐ |

### Security and compliance

| Criterion | Met |
|-----------|:---:|
| Unauthenticated AI API returns 401 | ☐ |
| Service role key not exposed in browser or public env | ☐ |
| Audit logs visible to tenant admin at `/audit-logs` | ☐ |

### Operations

| Criterion | Met |
|-----------|:---:|
| Production URL stable on Vercel | ☐ |
| Supabase backups enabled (default on paid plans) | ☐ |
| Go/No-Go (Section 7) recorded as **GO** or **GO (limited)** with written limitations | ☐ |
| Pilot lead and engineering names on sign-off tables | ☐ |

### Pilot closure

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Pilot lead | | | |
| Engineering | | | |
| Agency stakeholder | | | |

---

## Quick reference — support contacts

| Topic | Document |
|-------|----------|
| AI usage detail | [AI-Agents-Guide.md](./AI-Agents-Guide.md) |
| Email architecture | [EmailSetup.md](./EmailSetup.md) · [AuthEmailSetup.md](./AuthEmailSetup.md) |
| Demo walkthrough | [DemoScript.md](./DemoScript.md) |
| Seed reference | [SeedData.md](./SeedData.md) |

---

*End of TravelOS Pilot Execution Runbook*
