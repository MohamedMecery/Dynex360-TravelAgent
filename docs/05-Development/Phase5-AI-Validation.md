# Phase 5 AI — Manual Validation Checklist

**Last updated:** 2026-06-02  
**Prerequisites:** `npm run db:push` · `npm run db:seed` · `.env.local` with Supabase keys  
**User guide:** [AI-Agents-Guide.md](./AI-Agents-Guide.md) — step-by-step usage and test scenarios  
**Production deploy:** [Production-Deploy-Checklist.md](./Production-Deploy-Checklist.md) — Vercel env, Auth URLs, SMTP (run before pilot)

---

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Local or cloud |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Anon/publishable key |
| `ANTHROPIC_API_KEY` | Recommended | Without it: extractive fallback answers |
| `OPENAI_API_KEY` | Optional | Without it: FTS retrieval only (works for demo) |

```bash
npm run admin:create   # once
npm run db:seed        # demo data + knowledge chunks
npm run dev            # http://localhost:3000
```

Sign in as **tenant admin** (default slug `dynex360-travel`).

---

## 1. Knowledge Agent (`/ai/knowledge`)

| # | Step | Expected | Pass |
|---|------|----------|:----:|
| K1 | Ask: *What is the cancellation policy for confirmed bookings?* | Answer with ≥1 citation from seeded policy doc | ☐ |
| K2 | Ask about Dubai packages | References package/FAQ content | ☐ |
| K3 | Click 👍 on assistant reply | Toast “Thanks for your feedback”; row in `ai_feedback` | ☐ |
| K4 | Open **Settings → Knowledge Base** | Four demo documents listed as published | ☐ |

**Acceptance refs:** US-AI-KNOW-001, US-AI-KNOW-002, US-AI-KNOW-004

---

## 2. Booking Agent (`/ai/booking`)

| # | Step | Expected | Pass |
|---|------|----------|:----:|
| B1 | Ask: *Show Dubai packages under $1500* | Ranked package recommendations | ☐ |
| B2 | Use **Draft builder** → Preview draft → **Confirm & apply** | Booking created with `status = draft` and reference number | ☐ |
| B3 | Open **Bookings** → confirm draft manually | Status moves to confirmed (human-in-the-loop) | ☐ |
| B4 | Ask status of a seeded reference (e.g. `DEMO-BK-005`) | Returns status, payment_status, total | ☐ |
| B5 | 👍/👎 on assistant reply | Feedback saved | ☐ |

**Guardrail:** Agent must **never** set `status = confirmed` autonomously.

**Acceptance refs:** US-AI-BKG-001, US-AI-BKG-003, US-AI-BKG-004

---

## 3. Support Agent (`/ai/support`)

| # | Step | Expected | Pass |
|---|------|----------|:----:|
| S1 | Ask: *What is booking DEMO-BK-005 status?* | Live booking summary in reply | ☐ |
| S2 | Message with “open ticket” or enable **Create ticket** | Ticket number shown; appears in `/ai/support/tickets` | ☐ |
| S3 | Message containing “refund dispute” | Ticket created as **escalated** with assignee (tenant admin) | ☐ |
| S4 | Open ticket → **Escalate** / **Assign** / **Resolve** | Status updates + system message in thread | ☐ |
| S5 | 👍/👎 on assistant reply | Feedback saved | ☐ |

**Acceptance refs:** US-AI-SUP-002, US-AI-SUP-003, US-AI-SUP-004

---

## 4. Security (tenant isolation)

| # | Step | Expected | Pass |
|---|------|----------|:----:|
| T1 | Two tenants (if available): query knowledge | No cross-tenant citations | ☐ |
| T2 | API without auth → `/api/ai/knowledge-agent` | 401 Unauthorized | ☐ |

---

## 5. Demo script alignment

Follow [DemoScript.md](./DemoScript.md) sections **6–8** in order during a stakeholder demo (~4 min for AI).

---

## Sign-off

| Role | Name | Date | Phase 5 AI |
|------|------|------|:----------:|
| Product | | | ☐ |
| Engineering | | | ☐ |

When all rows above pass, update Roadmap status to **Phase 5 complete**.
