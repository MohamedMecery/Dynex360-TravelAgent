# TravelOS AI Agents — User & Testing Guide

**Version:** 1.0  
**Last updated:** 2026-06-02  
**Audience:** Sales agents, tenant admins, QA, and demo presenters

This guide explains **how to use** the three approved Phase 5 agents and **how to test them** step by step. For a short demo script, see [DemoScript.md](./DemoScript.md) §6–8. For a sign-off checklist, see [Phase5-AI-Validation.md](./Phase5-AI-Validation.md).

---

## 1. Overview

TravelOS ships three internal AI assistants for agency staff:

| Agent | Route | Purpose | Writes business data? |
|-------|-------|---------|------------------------|
| **Knowledge Agent** | `/ai/knowledge` | Q&A over tenant policies, FAQs, SOPs, package docs | No (read-only on business tables) |
| **Booking Agent** | `/ai/booking` | Package recommendations, draft bookings, status lookup | Yes — **draft only** |
| **Support Agent** | `/ai/support` | FAQ + booking context, support tickets | Yes — tickets & messages |

**Hard rules (non-negotiable):**

- Agents **never confirm** a booking (`draft → confirmed` is staff-only in **Bookings** UI).
- Agents **never record payments**.
- All data is **tenant-scoped** (RLS + JWT `tenant_id`).
- Booking Agent is **not available** to `finance_officer` role.

Architecture: [AIArchitecture.md](../../ai/AIArchitecture.md) · Module spec: [AI-Agents.md](../04-Modules/AI-Agents.md)

---

## 2. Before you start (setup)

### 2.1 One-time environment setup

```bash
# From project root
npm install
npm run admin:create    # creates tenant admin (default slug: dynex360-travel)
npm run db:push         # applies migrations 001–021
npm run db:seed         # demo customers, packages, bookings, knowledge chunks
npm run dev             # http://localhost:3000
```

Sign in at `/login` with the admin user from `admin:create`.

### 2.2 Required `.env.local` variables

| Variable | Required | Effect if missing |
|----------|:--------:|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | App shows setup gate |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Cannot authenticate |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed only | `db:seed` fails |
| `ANTHROPIC_API_KEY` | Recommended | Agents fall back to **extractive** answers (still works for demo) |
| `OPENAI_API_KEY` | Optional | RAG uses **FTS only** (no embeddings); demo seed works without it |

### 2.3 Demo data you will rely on

After `npm run db:seed`:

| Asset | Examples |
|-------|----------|
| Published packages | **Dubai Desert & City Escape**, **Istanbul & Cappadocia Combo** |
| Demo bookings | `DEMO-BK-001` … `DEMO-BK-020` (mixed statuses) |
| Status lookup test | `DEMO-BK-005` = **confirmed** |
| Knowledge docs (4) | Booking Cancellation Policy, Dubai Package FAQ, Istanbul SOP, Payment & Invoice Guidelines |

Reset demo data anytime: `npm run db:seed` (idempotent).

### 2.4 Who can access what

| Role | Knowledge | Booking | Support | Manage KB (`/settings/knowledge`) |
|------|:---------:|:-------:|:-------:|:----------------------------------:|
| `tenant_admin` | ✓ | ✓ | ✓ | ✓ |
| `sales_agent` | ✓ | ✓ | ✓ | — |
| `finance_officer` | ✓ | — | ✓ | — |

Nav items appear in the sidebar only when your role has permission.

---

## 3. Knowledge Agent

### 3.1 What it does

- Answers staff questions using **tenant knowledge chunks** (seeded or uploaded).
- Returns **citations** (document title + excerpt) and a **confidence** badge.
- Stores conversation in `ai_conversations` / `ai_messages`.
- Accepts **👍 / 👎** feedback per assistant message.

### 3.2 How to use (UI steps)

1. Open **Knowledge Agent** → `/ai/knowledge`.
2. Type a question in the text area at the bottom.
3. Press **Enter** (or Shift+Enter for a new line).
4. Read the answer, expand **Sources** citations if shown.
5. Click **👍** or **👎** under the reply to record feedback.

**Tips:**

- Ask concrete questions tied to seeded docs (policies, Dubai FAQ, payment rules).
- Switch app locale (EN/AR) in the header — the agent receives your UI `locale` for localized replies.

### 3.3 Managing the knowledge base (tenant admin)

1. Go to **Settings → Knowledge Base** → `/settings/knowledge`.
2. Add a document either:
   - **Paste text** — fill title, type (policy / faq / contract / package / sop), and content; submit, or
   - **Upload a file** — attach PDF/DOC/TXT; system ingests and chunks it.
3. Wait until status is **published** (processing → published).
4. Return to Knowledge Agent and ask about the new content.

### 3.4 Sample prompts to try

| Prompt | Expected behavior |
|--------|-------------------|
| *What is the cancellation policy for confirmed bookings?* | Cites **Booking Cancellation Policy**; mentions 14-day rule / fees |
| *Tell me about Dubai packages* | Cites **Dubai Package FAQ** |
| *How should a sales agent confirm a booking?* | Cites **Istanbul & Turkey Sales SOP** |
| *How is outstanding balance calculated?* | Cites **Payment & Invoice Guidelines** |

### 3.5 How to test (Knowledge)

| Step | Action | Pass criteria |
|:----:|--------|---------------|
| K1 | Ask cancellation policy question | ≥1 citation; answer matches seeded policy |
| K2 | Ask about Dubai packages | References Dubai FAQ content |
| K3 | Click 👍 on a reply | Toast success; row in `ai_feedback` |
| K4 | Open `/settings/knowledge` as admin | 4 demo documents listed as **published** |
| K5 | Upload or paste a new doc, ask about it | New content retrievable in chat |

**Verify feedback in SQL (optional):**

```sql
SELECT rating, created_at
FROM ai_feedback
ORDER BY created_at DESC
LIMIT 5;
```

---

## 4. Booking Agent

### 4.1 What it does

| Capability | Automation | Notes |
|------------|------------|-------|
| Recommend packages | Suggests only | Filters published packages |
| Create booking | Creates **`draft`** | Human confirms in Bookings UI |
| Update booking | **`draft` only** | Rejects confirmed/completed |
| Cancel booking | **Proposes** only | Adds note; staff cancels in UI |
| Status lookup | Read-only | By reference number e.g. `DEMO-BK-005` |

**Pricing:** Line items are built from **package tier pricing × traveler counts** (same logic as manual booking create). Total = sum of line items (DB trigger).

### 4.2 How to use — chat mode

1. Open **Booking Agent** → `/ai/booking`.
2. Type a natural-language request, e.g. *Show Dubai packages under $1500*.
3. Review **package recommendation cards** (title, destination, adult price).
4. For status: *What is the status of DEMO-BK-005?* → reply includes status and payment status.
5. When the agent shows a **Confirm** button (`pending_action`), click it only after reviewing the preview — this applies the draft to the database.
6. Use **Open Bookings** link to confirm the draft manually.

**Sample chat prompts:**

```
Show Dubai packages under $1500
Recommend a family trip to Istanbul in October
What is booking DEMO-BK-005 status?
I need to cancel booking DEMO-BK-003 — what are the rules?
```

### 4.3 How to use — Draft builder (structured)

Use this when chat parsing is ambiguous or for repeatable demos.

1. On `/ai/booking`, click **Draft builder** (top-right of chat card).
2. Fill the side panel:
   - **Customer** — pick from list (seed: Sarah Johnson, etc.)
   - **Package** — published packages only
   - **Travel date** — must be today or future
   - **Traveler** first/last name and **tier** (adult / child / infant)
3. Click **Preview draft**.
4. Review the assistant preview message (line items + total).
5. Click **Confirm** on the pending action button in the chat thread.
6. Note the **draft reference** badge (e.g. new `BK-…` number).
7. Go to **Bookings** → open the draft → click **Confirm** (human-in-the-loop).

### 4.4 What the agent will NOT do

- Set booking status to `confirmed`, `completed`, or `cancelled` directly.
- Record payments or create invoices.
- Book an **archived** or **draft** package (only **published**).

### 4.5 How to test (Booking)

| Step | Action | Pass criteria |
|:----:|--------|---------------|
| B1 | *Show Dubai packages under $1500* | ≥1 recommendation card |
| B2 | Draft builder → Preview → Confirm | New booking with `status = draft`, line items present |
| B3 | Bookings UI → Confirm that draft | Status → `confirmed` (staff action) |
| B4 | *Status of DEMO-BK-005* | Returns confirmed + payment info |
| B5 | *Cancel DEMO-BK-00X* flow | Shows rules + pending action; booking **not** auto-cancelled |
| B6 | 👍/👎 on reply | Feedback saved |
| B7 | Log in as **finance_officer** | Booking Agent nav hidden / API 403 |

**Verify draft in SQL:**

```sql
SELECT reference_number, status, total_amount, created_by
FROM bookings
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 3;
```

---

## 5. Support Agent

### 5.1 What it does

- Answers from **knowledge RAG** (same corpus as Knowledge Agent).
- Looks up **live booking data** by reference number.
- Creates **support tickets** when asked or when escalation keywords detected.
- Auto-**escalates** and assigns **tenant admin** on keywords like *refund*, *dispute*, *supervisor*.

### 5.2 How to use (UI steps)

1. Open **Support Agent** → `/ai/support`.
2. Ask a question, e.g. *What is booking DEMO-BK-005 status?*
3. Optional: check **Force create ticket** before sending if you want a ticket regardless of resolution.
4. If a ticket is created, note the **ticket number** badge in the reply.
5. Click **View tickets** → `/ai/support/tickets` to see the list.
6. Open a ticket → use **Assign**, **Escalate**, **Resolve**, or **Close** buttons.

**Escalation keywords (EN/AR):** refund, dispute, legal, escalate, supervisor, استرداد, شكوى, تصعيد, مشرف, …

### 5.3 Ticket management

On ticket detail `/ai/support/tickets/show/[id]`:

| Action | Effect |
|--------|--------|
| **Assign** | Sets `assigned_user_id`; choose active user from dropdown |
| **Escalate** | Status → `escalated` |
| **Resolve** | Status → `resolved` |
| **Close** | Status → `closed` |

Each action writes a **system message** in the ticket thread.

### 5.4 Sample prompts

| Prompt | Expected |
|--------|----------|
| *What is booking DEMO-BK-005 status?* | Booking summary in reply |
| *I need a refund for DEMO-BK-005 — open a ticket* | Ticket created, likely **escalated** |
| *Customer complaint about legal dispute* | Escalated ticket + assignee |
| Enable **Force create ticket** + any message | Ticket always created |

### 5.5 How to test (Support)

| Step | Action | Pass criteria |
|:----:|--------|---------------|
| S1 | Ask DEMO-BK-005 status | Live booking summary |
| S2 | Message with *open ticket* or force checkbox | Ticket in `/ai/support/tickets` |
| S3 | Message with *refund dispute* | Status **escalated**, assignee set |
| S4 | Assign / Escalate / Resolve on ticket page | Status updates + system message |
| S5 | 👍/👎 on agent reply | Feedback saved |

**Verify ticket in SQL:**

```sql
SELECT ticket_number, status, priority, assigned_user_id
FROM support_tickets
ORDER BY created_at DESC
LIMIT 5;
```

---

## 6. Cross-agent testing scenarios

Run these end-to-end scripts for stakeholder demos or QA sign-off.

### Scenario A — Sales day (≈10 min)

1. **Knowledge:** Ask cancellation policy → cite policy doc.
2. **Booking:** Recommend Dubai packages → create draft via Draft builder → confirm in Bookings.
3. **Support:** Look up the new booking reference → optional ticket if customer complains.

### Scenario B — Finance handoff (≈5 min)

1. **Booking:** Confirm a draft booking (staff UI).
2. **Payments:** Record partial payment on that booking.
3. **Support:** Ask payment rules from Knowledge/Support → cites Payment & Invoice Guidelines.

### Scenario C — Escalation (≈5 min)

1. **Support:** Send *I want a refund dispute for DEMO-BK-005*.
2. Open ticket → verify **escalated** + assignee.
3. **Resolve** as admin → thread shows system message.

---

## 7. API testing (advanced / Postman)

All agent routes require an **authenticated session** (Supabase cookie from browser login). Unauthenticated calls return **401**.

| Method | Path | Body (JSON) |
|--------|------|-------------|
| POST | `/api/ai/knowledge-agent` | `{ "message": "…", "locale": "en" }` |
| POST | `/api/ai/booking-agent` | `{ "message": "…", "locale": "en" }` |
| POST | `/api/ai/support-agent` | `{ "message": "…", "create_ticket": false, "locale": "en" }` |
| POST | `/api/ai/feedback` | `{ "message_id": "<uuid>", "rating": "helpful" }` |
| PATCH | `/api/support-tickets/:id` | `{ "status": "resolved" }` or `{ "assigned_user_id": "…" }` |

**Booking agent — create draft via API:**

```json
{
  "confirm_action": {
    "type": "create_draft",
    "customer_id": "<uuid>",
    "package_id": "<uuid>",
    "travel_date": "2026-12-01",
    "travelers": [{ "first_name": "Test", "last_name": "User", "tier": "adult" }]
  }
}
```

Then apply:

```json
{
  "apply_action": {
    "type": "create_draft",
    "preview": { "...": "from previous response pending_action.preview" }
  }
}
```

Easier path: use the **UI Draft builder** unless you are automating tests.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Agent pages missing from nav | Role lacks permission | Use `tenant_admin` or `sales_agent` (Booking needs sales/admin) |
| Empty or generic answers | No knowledge chunks | Run `npm run db:seed`; check `/settings/knowledge` |
| “Thinking…” forever | API key / network | Check browser Network tab; verify Supabase session |
| No citations | FTS found nothing | Rephrase; add/upload relevant doc |
| Booking Agent 403 | Logged in as finance | Switch to sales_agent or tenant_admin |
| Draft not created | Missing confirm click | Preview alone is not enough — click **Confirm** on pending action |
| Ticket not escalated | No keyword match | Use *refund* / *dispute* or **Force create ticket** |
| Cross-tenant data visible | Critical bug | Report immediately — should never happen with RLS |

**Logs to inspect:**

- Browser DevTools → Network → agent API responses (`error.code`, `error.message`)
- Supabase → `ai_logs` table (tool calls, latency, errors)

---

## 9. Sign-off checklist

Use [Phase5-AI-Validation.md](./Phase5-AI-Validation.md) and mark each row when testing is complete. Minimum bar for Phase 5:

- [ ] All Knowledge tests K1–K4 pass  
- [ ] All Booking tests B1–B5 pass (guardrail: no auto-confirm)  
- [ ] All Support tests S1–S5 pass  
- [ ] Security T1–T2 pass (401 without auth; tenant isolation if multi-tenant available)

---

## 10. Related documents

| Document | Purpose |
|----------|---------|
| [DemoScript.md](./DemoScript.md) | 15-minute stakeholder demo |
| [Phase5-AI-Validation.md](./Phase5-AI-Validation.md) | QA sign-off checklist |
| [SeedData.md](./SeedData.md) | Demo seed contents |
| [AI-Agents.md](../04-Modules/AI-Agents.md) | Module requirements & permissions |
| [booking-agent-workflow.md](../../ai/workflows/booking-agent-workflow.md) | Booking agent tool flow |
