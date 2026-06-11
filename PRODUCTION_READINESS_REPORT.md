# TravelOS — Production Readiness Report

**Date:** 2026-06-11
**Scope:** Production readiness & pilot launch verification (Phases 1–12)
**Method:** Local execution of all runnable verifications + deep static code audit for everything requiring live infrastructure. No assumption was recorded as a PASS — every verdict below cites its evidence.

---

## Executive Summary

The **codebase is in strong shape**: zero ESLint warnings, clean TypeScript, a passing production build, 7/7 passing unit suites, 100% RLS coverage across all 83 tables, consistent tenant isolation, and a fully implemented event-driven commercial journey. Four real defects were found and **fixed during this review** (one critical payment-webhook bypass, a missing Vercel cron definition, a missing GET handler for Vercel Cron, and a portal reset-password session gap).

However, **live production verification was impossible**: the only Supabase project referenced anywhere in the repo (`ndomcfohwnvbyufnrxek.supabase.co`) **no longer exists in DNS** (verified via default resolver, 8.8.8.8 and 1.1.1.1 — Supabase does not use wildcard DNS, so this is conclusive), no production URL is recorded anywhere (docs contain only placeholders), the connected Vercel account contains **zero projects**, and Docker is unavailable for a local Supabase fallback. Every phase that requires a live backend (Supabase auth/RLS runtime tests, login flows, cron execution, commercial journey gate, payment/WhatsApp/AI gates) is therefore **BLOCKED**, not failed.

### Final Decision: **NO GO**

A pilot cannot launch against a backend that does not exist. The path to GO is short and fully documented in “Production Blockers” below — once a Supabase project is restored/created and env vars are set on Vercel, the existing gate suite (`npm run gate:production-matrix`) can produce the live evidence this report could not.

---

## Phase 1 — ESLint Cleanup ✅ COMPLETE

**Before:** 10 warnings in 8 files. **After:** `✔ No ESLint warnings or errors`; `tsc --noEmit` exit 0; `next build` exit 0.

| File | Warning | Fix |
|---|---|---|
| `src/app/crm/quotations/create/page.tsx` | `opportunities` logical expression destabilized 2 useMemo deps | Wrapped `oppData?.data ?? []` in `useMemo` |
| `src/app/invoices/create/page.tsx` | same pattern for `lineItems` + missing `applyBookingAmounts` dep | `useMemo` for `lineItems`; `applyBookingAmounts` → `useCallback` and added to effect deps (identity changes when its inputs change, so behavior is preserved) |
| `src/app/payments/create/page.tsx` | same pattern for `activeBookings` | `useMemo` |
| `src/components/packages/package-itinerary-editor.tsx` | same pattern for `days` | `useMemo` |
| `src/components/packages/package-pricing-editor.tsx` | same pattern for `pricingRows` | `useMemo` |
| `src/components/whatsapp/whatsapp-send-panel.tsx` | useEffect missing `selected` dep | `selected` → `useMemo`, effect depends on `selected` |
| `src/lib/invoices/pdf/invoice-pdf-document.tsx` | jsx-a11y/alt-text | False positive: `@react-pdf/renderer` `Image` is a PDF primitive, not a DOM `<img>` (it accepts no `alt` prop). Aliased import to `PdfImage` instead of disabling the rule |
| `src/lib/portal/quotation-pdf-service.tsx` | jsx-a11y/alt-text | Same alias fix |

No rules were disabled; no behavior changed (all fixes are referential-stability or naming changes).

---

## Phase 2 — Production Environment Audit ⚠️ BLOCKED (Vercel) / DONE (local)

**Vercel:** The Vercel account connected to this session (`team_h3KoXKNhnWDFj8DCuVLRkGkO`, “Mohamed Mecery's projects”) contains **no projects**, and there is no `.vercel/project.json` linking the repo. Production env vars on Vercel could **not** be inspected. The claimed “Deployment: PASS on Vercel” could not be located (probe of the doc-example host `travelos-pilot.vercel.app` → 404).

**Local audit** (`node scripts/validate-production-env.mjs`, evidence in `scripts/production-env-validation-results.json`):

| Variable | Local status | Production requirement |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SET — **but host is dead (FAIL)** | Must point to a live project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | SET (unverifiable — host dead) | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | SET (unverifiable — host dead) | Required server-side only |
| `NEXT_PUBLIC_SITE_URL` | MISSING | **Required** — reset-password emails fall back to `VERCEL_URL`/localhost (`src/lib/auth/site-url.ts`) |
| `CRON_SECRET` | MISSING | **Required** — worker fails closed without it |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | MISSING | Required for transactional email |
| `ANTHROPIC_API_KEY` | MISSING | Required for LLM answers (code degrades gracefully to extractive answers — `src/lib/ai/claude-client.ts:24-31`) |
| `PAYMOB_API_KEY/INTEGRATION_ID/IFRAME_ID/HMAC_SECRET` | MISSING | Required for live payments; otherwise mock mode |
| `PAYMOB_MOCK_MODE` / `PAYMOB_MOCK_WEBHOOKS` | not set locally (PASS) | **Must NOT be set in production** (validator marks FAIL) |
| `WHATSAPP_META_*` (4 vars) | MISSING | Required for live WhatsApp; otherwise mock mode |
| `WHATSAPP_MOCK_MODE` | not set (PASS) | Must NOT be set in production |

Strict mode (`PRODUCTION_CHECK=1`) result: **FAIL (13 failures, 4 warnings)** — this enumerates exactly what Vercel Production must contain.

**Dangerous-value note:** `.env.example` ships `PAYMOB_MOCK_MODE=true` + `PAYMOB_MOCK_WEBHOOKS=true`; copying it to production verbatim would have disabled webhook signature checks under the old code. The code-level hole this opened is now fixed (Phase 10), and the validator flags the flags themselves.

---

## Phase 3 — Supabase Verification ❌ BLOCKED (live) / ✅ PASS (static)

**Live connectivity: FAIL.** `npm run doctor` → “Cannot connect to Supabase”. Root cause: `ndomcfohwnvbyufnrxek.supabase.co` returns NXDOMAIN on three independent resolvers; a control query proved Supabase has no wildcard DNS, so the record’s absence means the project is deleted/deprovisioned (a merely *paused* project keeps resolving). No other project ref exists anywhere in the repo. Docker is not installed, so `npx supabase start` was unavailable as a fallback. **All runtime tests (staff auth, portal auth, tenant isolation, RLS probes, storage) are BLOCKED.**

**Static audit (agent-audited, all 65 migrations): PASS.**
- **RLS coverage: 83/83 tables enabled — zero uncovered tables**, including all CRM, quotation, payment, WhatsApp, AI, event/notification and portal tables.
- `custom_access_token_hook` defined (`009`, extended `020`, final `039_customer_portal.sql:114-197`): staff get `tenant_id`, `role`, `user_type`, `account_status`; portal users get `customer_id` + `portal_status` and **deliberately no `tenant_id`** (defense in depth). ⚠️ Hook enablement is a **manual dashboard step** (documented at `Production-Deploy-Checklist.md` step S4) — must be re-done on any new project, and portal logins break entirely if missed.
- Canonical policy pattern uses JWT claims via `current_tenant_id()` with a safe DB fallback (`011`); no spoofable `user_metadata` usage found.
- 18 SECURITY DEFINER functions, all with pinned `search_path`, all validating tenant context.
- Worker/AI/payment/WhatsApp tables enforce service-role-only writes via `REVOKE` (e.g. `048_payment_gateway_rls.sql:48-50`).
- Storage: one bucket (`knowledge-documents`, private, 5 MB, tenant-scoped paths, full CRUD policies — `016_knowledge_storage.sql`).

---

## Phase 4 — Login Flow Validation ❌ BLOCKED (live) / ✅ PASS (static, 1 fix applied)

All 7 routes exist and were traced end-to-end in code (staff: `/login`, `/onboarding`, `/forgot-password`, `/reset-password`; portal: `/portal/login`, `/portal/forgot-password`, `/portal/reset-password`).

- Inactive users: rejected at login (`auth-provider.ts:43-44`), at middleware (`middleware.ts:173-185` — pending → `/onboarding`, else sign-out), and at API layer (`validate-active-account.ts`, which also rejects JWT↔DB tenant/status mismatches). **PASS**
- Staff/portal segregation: portal login signs out staff accounts; middleware redirects staff off portal routes (`middleware.ts:101-108`); `require-portal-api-access` 403s CRM accounts. **PASS**
- Onboarding (`/api/auth/onboarding`): invite-only, idempotent (409 if already active, 403 if inactive); no open-signup endpoint exists. **PASS**
- **FIXED:** `/portal/reset-password` accepted form input without a recovery session (unlike the staff page) — session check + invalid-link state added, mirroring `src/app/reset-password/page.tsx`.
- ⚠️ Reset links depend on `NEXT_PUBLIC_SITE_URL` (fallback `VERCEL_URL`, then localhost) — must be set in production (Phase 2).

Runtime scenarios (valid/invalid login, redirects, session creation, role/tenant resolution) require a live Supabase — **BLOCKED**, covered by `gate:sprint7b:foundation` / `gate:portal` once a backend exists.

---

## Phase 5 — Cron Worker Validation ❌ BLOCKED (live) / ✅ PASS (static, 3 fixes applied)

Static audit verdicts (evidence in `src/app/api/cron/process-dispatch-jobs/route.ts`, `src/lib/events/*`, migrations `041/042/045`):

| Check | Verdict |
|---|---|
| Route exists, CRON_SECRET required, fail-closed when unset | PASS |
| Job claiming via `claim_event_dispatch_jobs` with `FOR UPDATE SKIP LOCKED` | PASS |
| Retry: exponential backoff `2^n × 30s` capped 1h, `max_retries=5` | PASS |
| Dead-letter on exhausted retries | PASS |
| Idempotent enqueue (unique `idempotency_key` on jobs + events) | PASS |
| All 5 job types wired (notification, email, whatsapp, ai_score, ai_ops_score) | PASS |
| Tables `event_dispatch_jobs`/`domain_events`/`notification_deliveries` migrated | PASS (045/041/042) |
| **Vercel cron schedule codified** | **WAS FAIL → FIXED** |
| **Stale-lock recovery** | **WARN — open risk** (see Known Risks) |

**Fixes applied:**
1. **`vercel.json` created** with `{"crons":[{"path":"/api/cron/process-dispatch-jobs","schedule":"*/2 * * * *"}]}` — previously no cron was defined anywhere, meaning the production queue would never drain.
2. **GET handler added** to the route — Vercel Cron invokes with GET (+ auto `Authorization: Bearer $CRON_SECRET`); the route previously only exported POST and would have returned 405 to every scheduled invocation even with crons configured.
3. **Timing-safe secret comparison** (`crypto.timingSafeEqual`) replacing `===`.

Runbooks updated accordingly (`Production-Worker-Runbook.md`, `Production-Deploy-Checklist.md` C2), including the note that `*/2 * * * *` requires a Vercel plan with sub-daily crons.

Live tests (manual trigger, queue/retry/DLQ/notification/email/WhatsApp/AI-job processing, `verify-worker-health`) — **BLOCKED**; `node scripts/verify-worker-health.mjs` fails with `fetch failed` (no live backend), captured as evidence.

---

## Phase 6 — Commercial Journey ❌ BLOCKED (live) / ✅ PASS (static trace)

Full static trace of all 13 transitions (Lead → … → AI scoring) against the contract in `scripts/run-commercial-journey-gate.mjs`: **every transition is implemented**, emits the expected domain event, and enqueues the expected dispatch jobs. Highlights:

- `quotation.sent` → NOTIFICATION + EMAIL + WHATSAPP + AI_SCORE (`/api/quotations/[id]/send` → `emitAndDispatch`)
- Portal accept → `quotation.accepted` (same fan-out)
- Checkout → `payment.created` (+ AI_OPS_SCORE), creates `payment_orders` + `payment_attempts`
- Webhook → `payment.completed` **and** `booking.created`; booking auto-created from quotation via `convertQuotationToBooking()` inside the completion service; `confirm_on_deposit` honored
- No manual intervention required anywhere in the chain.

⚠️ One gap: **Lead → Opportunity conversion emits no domain event**, so Sales AI never scores fresh opportunities until a later event fires (recommended post-restore fix; not applied because it adds a new event type — behavior change beyond this review's mandate).

Live gate (`gate:commercial`) — **BLOCKED**.

---

## Phase 7 — Payments Validation ✅ PASS (code) / ❌ BLOCKED (live), 1 critical fix

- Unit suite `test:payments` — **PASS** (exit 0).
- Checkout: validates accepted quotation, tenant `payments_enabled`, deposit-vs-full calculation, stable idempotency key, 409 on already-paid, cached attempt reuse.
- Webhook: HMAC-SHA512 verification; duplicate webhooks deduped via `payment_provider_events` unique key → `{status:"duplicate"}`; **amount mismatch → 422 AMOUNT_MISMATCH** (±1 cent tolerance); single ledger insert per attempt (duplicate-ledger guard).
- **CRITICAL FIX APPLIED:** `src/app/api/webhooks/paymob/route.ts` previously accepted **unsigned webhooks** whenever `PAYMOB_MOCK_MODE=true` and no HMAC secret was set — a forged-payment / fake-booking vector if mock mode leaked to production (and `.env.example` ships it as `true`). The route-level bypass was removed; bypass now only happens inside `adapter.verifyWebhook()` which requires the **explicit** `PAYMOB_MOCK_WEBHOOKS=true` flag (itself a FAIL in the production env validator). Gates/E2E unaffected (they set both flags explicitly).

Live checkout/webhook/ledger flow — **BLOCKED** (`gate:sprint9a:payments`).

---

## Phase 8 — WhatsApp Validation ✅ PASS (code) / ❌ BLOCKED (live)

- Unit suite `test:whatsapp` — **PASS**.
- Static audit: 4 events subscribed (`quotation.sent`, `quotation.accepted`, `payment.completed`, `booking.created`); dispatcher enforces tenant enablement → **opt-in** (`whatsapp_opted_in`) → **quiet hours** → approved-template resolution → E.164 phone normalization, then logs to **both** `whatsapp_messages` and `notification_deliveries` with status propagation (pending → sent/failed). Webhook GET verify-token and POST X-Hub-Signature-256 (timing-safe) verified in `meta-cloud-adapter.ts:116-143`. Mock mode clean.
- Live template/dispatch tests — **BLOCKED** (`gate:sprint9b:whatsapp`).

---

## Phase 9 — AI Validation ✅ PASS (code) / ❌ BLOCKED (live)

- Unit suites `test:sales-ai`, `test:operations-ai` — **PASS**.
- **Sales AI** (9C): event-driven snapshots + 6 recommendation rules; interactive agent gated by `ai.sales.use` permission, per-user rate limit, **per-tenant monthly token budget (429 on exceed)**.
- **Operations AI** (9D): booking health/readiness/risk scoring + 7 rules; same permission/rate/budget guards.
- Tenant isolation: every AI query tenant-filtered; AI tables service-role-write-only with staff read policies (migrations 059/063).
- `ANTHROPIC_API_KEY` missing → graceful extractive fallback with `usedLlm:false` (`claude-client.ts:24-31`) — no hard failure.
- ⚠️ Knowledge/Booking/Support agents (Phase 5 scope) are stubs per `CLAUDE.md` — expected, not a regression.

---

## Phase 10 — Security Audit ✅ PASS after 1 critical fix

| Area | Verdict |
|---|---|
| Paymob webhook signature | **FAIL → FIXED** (see Phase 7) |
| WhatsApp webhook signature (timing-safe) + verify token | PASS |
| Webhook replay/duplicate | PASS (provider-event idempotency) |
| Cross-tenant API access (8 routes sampled) | PASS — `tenant_id` always from JWT (`gate.access.tenantId`), never from request body |
| Portal → staff APIs | PASS — `requirePortalApiAccess` 403s staff and vice-versa; middleware segregates both directions |
| Staff → portal APIs | PASS (explicit 403 “CRM accounts cannot access the customer portal API”) |
| Service-role key | PASS — 33 server-side usages, all behind auth gates or webhook signature checks; never client-exposed |
| Secrets hygiene | PASS — no hardcoded secrets; `.gitignore` covers all `.env*` variants |
| Cron auth | PASS (fail-closed; now timing-safe) |

Penetration-style runtime attempts (actual cross-tenant reads, webhook replay against live endpoint) — **BLOCKED**, no live target.

---

## Phase 11 — Performance & Observability ✅ PASS (documentation), live metrics BLOCKED

The **Operational Monitoring Checklist deliverable already exists and is adequate**: `docs/05-Development/Operations-Monitoring-Runbook.md` defines daily (queue depth < 20, dead_letter = 0, cron 200s every 2–5 min, failed email/WhatsApp counts), weekly (DLQ review, bounce rates, Paymob settlement reconciliation, verification matrix on staging) and monthly checks (backup restore drill, secret rotation, migration drift), plus Sev-1/Sev-2 incident procedures. The Operations dashboard (`/crm/operations` + `GET /api/crm/operations/metrics`) exposes queue/email/WhatsApp/event metrics. `scripts/verify-worker-health.mjs` provides scripted queue-depth/DLQ checks.

---

## Files Modified During This Review

| File | Change |
|---|---|
| `src/app/crm/quotations/create/page.tsx`, `src/app/invoices/create/page.tsx`, `src/app/payments/create/page.tsx`, `src/components/packages/package-itinerary-editor.tsx`, `src/components/packages/package-pricing-editor.tsx`, `src/components/whatsapp/whatsapp-send-panel.tsx`, `src/lib/invoices/pdf/invoice-pdf-document.tsx`, `src/lib/portal/quotation-pdf-service.tsx` | ESLint fixes (Phase 1) |
| `src/app/api/webhooks/paymob/route.ts` | **Security:** removed implicit unsigned-webhook acceptance |
| `src/app/api/cron/process-dispatch-jobs/route.ts` | GET handler for Vercel Cron + timing-safe secret comparison |
| `vercel.json` | **New** — codified cron schedule |
| `src/app/portal/reset-password/page.tsx` | Recovery-session validation (parity with staff flow) |
| `docs/05-Development/Production-Worker-Runbook.md`, `docs/05-Development/Production-Deploy-Checklist.md` | Updated for vercel.json/GET cron semantics |
| `PRODUCTION_READINESS_REPORT.md` | This report |

**Verification after all changes:** `next lint` → 0 warnings · `tsc --noEmit` → exit 0 · `next build` → exit 0 (all routes generated) · 7/7 unit suites → exit 0.

---

## Production Blockers (must clear before GO)

| # | Blocker | Owner action |
|---|---|---|
| B1 | **Supabase project `ndomcfohwnvbyufnrxek` no longer exists** (NXDOMAIN). | Restore it, or create a new project → `npm run db:sync && npx supabase db push` (65 migrations) → update `NEXT_PUBLIC_SUPABASE_URL` + keys everywhere → re-enable **Custom Access Token hook** in Auth → Hooks (manual!) → recreate `knowledge-documents` bucket policies via migration 016 → configure Auth redirect URLs per checklist §S |
| B2 | **No Vercel project found / production URL unknown.** | Link repo to the actual Vercel project (or grant access); record the production URL in `docs/05-Development/Production-Environment-Catalog.md` |
| B3 | **Production env vars unverified/missing** — 13 strict-mode failures (Phase 2 table). | Set all REQUIRED vars on Vercel Production; ensure `PAYMOB_MOCK_*`/`WHATSAPP_MOCK_MODE` are **absent** |
| B4 | **No live verification has ever been run against the production stack** in its current state. | After B1–B3: `GATE_BASE_URL=https://<prod> npm run gate:production-matrix` (runs env, worker health, foundation, portal, events, worker, payments, WhatsApp, sales/ops AI, commercial journey) and attach the JSON outputs |

## Known Risks (non-blocking, recommended)

1. **Stale worker locks:** a crashed worker leaves jobs in `processing` forever; recovery is manual. Add a lock-timeout reclaim (`locked_at < now() - interval '5 minutes'`) to `claim_event_dispatch_jobs` in a future migration.
2. **Lead→Opportunity emits no domain event** — Sales AI blind spot for fresh opportunities.
3. **Auth hook enablement is manual** — add a post-deploy verification step (it silently breaks portal login if forgotten).
4. **Vercel plan dependency:** `*/2 * * * *` cron requires Pro; Hobby is daily-only (external scheduler fallback documented).
5. Hobby-grade gaps acceptable for pilot: no rate limiting on portal APIs; no webhook timestamp staleness check.

---

## Go-Live Recommendation

**NO GO** — solely due to infrastructure absence (B1–B4), not code quality. The application layer passed every verification that could be executed, and the four defects found were fixed and re-verified. Once a Supabase project exists and Vercel env vars are set, run the production verification matrix against the deployed URL; if it passes (with the auth-hook manual step confirmed), the posture converts to **GO WITH CONDITIONS** (conditions: live Paymob/WhatsApp credentials before enabling those channels for real customers, stale-lock mitigation scheduled).
