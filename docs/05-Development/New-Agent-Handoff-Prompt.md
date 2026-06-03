# New Agent Handoff Prompt — TravelOS

**Last updated:** 2026-06-02  
**Use when:** Opening a **new Cursor Agent** to continue product/engineering work, propose improvements, or plan the next sprint.

Copy everything inside the fenced block below into a new agent chat.

---

## Prompt (copy from here)

```
أنت Agent جديد على مشروع TravelOS — SaaS متعدد المستأجرين لوكالات السفر.

Stack: Next.js 15 · Refine 4 · Supabase (PostgreSQL + RLS + Auth) · TypeScript strict · Tailwind · shadcn/ui · i18n (EN + AR, phased per D-010).

## مهمتك في هذه المحادثة

1. **افهم السياق الحالي** من الملخص أدناه والملفات المرجعية — لا تفترض أن Phase 5 غير منفّذ.
2. **اقرأ** (حسب الحاجة) الملفات المذكورة في «مراجع إلزامية» قبل أي اقتراح أو كود.
3. **قدّم خطة تطويرية** — قائمة **نقاط تطوير إضافية** مرتّبة بالأولوية (Must / Should / POST-MVP) مع:
   - المشكلة أو الفرصة
   - الملفات/الوحدات المتأثرة
   - جهد تقريبي (S / M / L)
   - معيار قبول مختصر
4. **اسأل المستخدم** أي مسار يريد تنفيذه أولاً — لا تبدأ تنفيذاً واسعاً دون موافقة.
5. إذا طُلب التنفيذ: **أصغر diff ممكن**، `npm run typecheck` بعد TS، **لا git commit** إلا بطلب صريح.

---

## حالة المشروع (2026-06-02)

### مكتمل / يعمل

| Area | Status |
|------|--------|
| Docs | PRD, Requirements, User Stories, Domain Model v2, ERD, Database Design, RBAC, API spec |
| DB migrations | **001–021** (آخر: `021_audit_user_triggers` — `created_by`/`updated_by` triggers) |
| MVP modules UI | Auth, Users, Customers, Travelers, Destinations, Packages, Bookings, Invoices, Payments, Dashboard |
| Marketing | Landing `/` + `/home` |
| Demo seed | `npm run db:seed` — customers, packages, 20 bookings (`DEMO-BK-*`), 4 knowledge docs |
| Phase 5 AI | Knowledge + Booking + Support agents (chat UI + API) |
| AI extras | `POST /api/ai/feedback`, support ticket PATCH + UI actions, auto-assign on escalation |
| Knowledge admin | `/settings/knowledge` — upload / paste docs |
| Audit UI | `RecordMetadata` on Show pages (bookings, customers, packages, …) |
| Grid UX | Action buttons **disabled** (not hidden) when no permission |
| Guides | `docs/05-Development/AI-Agents-Guide.md`, `Phase5-AI-Validation.md`, `DemoScript.md` |
| Deploy | GitHub `MohamedMecery/Dynex360-TravelAgent`; Vercel build fixed (i18n JSON) |

### Phase 5 AI — سلوك معتمد

| Agent | Route | Writes | Guardrails |
|-------|-------|--------|------------|
| Knowledge | `/ai/knowledge` | conversations, feedback | Read-only on business data |
| Booking | `/ai/booking` | **draft** bookings + line items | **Never** confirm/cancel/pay |
| Support | `/ai/support` | tickets, messages | Escalation keywords → tenant admin |

### RBAC (4 أدوار tenant + super_admin)

- `sales_agent` ≈ Agent مبيعات
- `tenant_admin` ≈ Admin
- `finance_officer` — مالي (لا Booking Agent)
- **لا دور `supervisor` منفصل** (POST-MVP إن لزم)

### نموذج البيانات المالي (مهم للعملاء)

- **Package** = المنتج القابل للبيع (ليس «service catalog»)
- **booking_items** = بنود الفاتورة داخل الحجز (qty × unit_price → total)
- **Invoice** = مستند مالي برأس فقط (subtotal + tax + total) — **لا** `invoice_items` في MVP
- **1 booking → N invoices** (D-005)

### Env مطلوب

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # seed/admin scripts only
ANTHROPIC_API_KEY=                  # recommended for agents
OPENAI_API_KEY=                     # optional — embeddings; FTS works without
```

### أوامر محلية

```bash
npm run admin:create
npm run db:push
npm run db:seed
npm run dev
npm run typecheck
```

---

## فجوات معروفة / نقاط تطوير مرشّحة (ابدأ منها)

استخدم هذه كبذرة — **وسّعها** بعد قراءة الكود والوثائق:

### Must (قبل pilot / بيع)

- [ ] Vercel prod env vars + Supabase Auth redirect URLs + SMTP للدعوات
- [ ] تشغيل checklist `Phase5-AI-Validation.md` بالكامل وتسجيل sign-off
- [ ] توثيق glossary: Package vs line items vs invoice (قرار D-011 مقترح)
- [ ] `audit_logs` UI لـ `tenant_admin` (صلاحية موجودة، صفحة غير موجودة)

### Should (جودة MVP)

- [ ] مزامنة invoice subtotal تلقائياً من booking عند الإنشاء (موجود جزئياً في UI)
- [ ] invoice line items أو snapshot من booking_items (قرار منتج مطلوب)
- [ ] Booking Agent: تحديث draft عبر chat بشكل أوضح (UX)
- [ ] Knowledge: re-embed / reindex button في settings
- [ ] Agent conversation history UI (`ai.read` موجود)
- [ ] توسيع disabled-button pattern لبقية grids (invoices, travelers, destinations)
- [ ] Spanish locale (D-010 POST-MVP track) — roadmap only until approved

### POST-MVP (Growth / Phase 6)

- [ ] Services catalog (flights, hotels, transfers) منفصل عن Package
- [ ] دور `supervisor` بين agent و admin
- [ ] Multi-agent orchestrator (Phase 6)
- [ ] Agent analytics dashboard
- [ ] B2C portal + Stripe payments
- [ ] Invoice PDF generation
- [ ] Public customer-facing Support chat

### تقنية / ديون

- [ ] تحديث `Roadmap.md` status table (لا يزال يقول migrations 001–011)
- [ ] `docs/04-Modules/Invoices.md` — module spec ناقص
- [ ] RBAC.md — إضافة صفوف `ai.*` صراحة
- [ ] E2E tests للـ agents (Playwright) — optional

---

## قرارات ثابتة — لا تكسرها

من `docs/01-Product/DECISIONS.md` + `CLAUDE.md`:

1. `countries`/`cities` global · `destinations` tenant-scoped
2. Booking Agent → **draft only**؛ التأكيد عبر Bookings UI
3. Agents **لا** payments **لا** confirm bookings
4. Tenant isolation عبر RLS + JWT `tenant_id` — لا bypass
5. لا `SUPABASE_SERVICE_ROLE_KEY` في client
6. Migrations في `database/migrations/` (sequential)
7. MVP scope فقط — ضع الباقي POST-MVP

---

## مراجع إلزامية (اقرأ قبل الاقتراح)

| Topic | Path |
|-------|------|
| Project rules | `CLAUDE.md` |
| Decisions | `docs/01-Product/DECISIONS.md` |
| Roadmap | `docs/01-Product/Roadmap.md` |
| AI architecture | `ai/AIArchitecture.md` |
| AI module | `docs/04-Modules/AI-Agents.md` |
| AI user/testing guide | `docs/05-Development/AI-Agents-Guide.md` |
| Phase 5 validation | `docs/05-Development/Phase5-AI-Validation.md` |
| Demo script | `docs/05-Development/DemoScript.md` |
| Database | `docs/03-Architecture/DatabaseDesign.md` |
| RBAC | `docs/03-Architecture/RBAC.md` |
| Bookings module | `docs/04-Modules/Bookings.md` |

### مسارات كود رئيسية

```
src/app/ai/knowledge/          — Knowledge Agent UI
src/app/ai/booking/            — Booking Agent UI + Draft builder
src/app/ai/support/            — Support Agent + tickets
src/app/api/ai/                — agent APIs + feedback
src/lib/ai/                    — RAG, booking-tools, support-tools
src/components/shared/record-metadata.tsx
src/providers/access-control-provider.ts
database/migrations/021_audit_user_triggers.sql
scripts/seed/demo-data.mjs     — DEMO-BK-* + KNOWLEDGE_DOCUMENTS
```

---

## مخرجاتك المتوقعة في أول رد

1. **ملخص فهم** (5–8 bullets) — ماذا هو TravelOS اليوم
2. **Backlog مقترح** — جدول أو قائمة أولويات (Must / Should / POST-MVP) — **10–15 نقطة** على الأقل، تشمل ما سبق + اكتشافاتك من الكود
3. **3 Quick wins** — يمكن تنفيذها في < يوم
4. **3 Strategic bets** — لتمييز المنتج عن منافسين
5. **سؤال واحد** للمستخدم: أي مسار ننفّذ أولاً؟

لا تكتب كود في أول رد إلا إذا طلب المستخدم التنفيذ مباشرة.
```

---

## نسخة مختصرة (إذا تجاوزت الحد)

```
TravelOS — Next.js 15 + Supabase + Refine. MVP + Phase 5 AI (Knowledge/Booking/Support) منفّذ.
Migrations 001–021. اقرأ CLAUDE.md, DECISIONS.md, AI-Agents-Guide.md.
مهمتك: افهم السياق، قدّم backlog تطويري (Must/Should/POST-MVP) 10+ نقاط، 3 quick wins، 3 strategic bets، ثم اسأل أي مسار ننفّذ.
قواعد: draft-only bookings, no agent payments, tenant RLS, no service role in client, minimal diff, typecheck, no commit unless asked.
```

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [Phase5-Agent-Handoff.md](./Phase5-Agent-Handoff.md) | Original Phase 5 implementation prompt (historical) |
| [AI-Agents-Guide.md](./AI-Agents-Guide.md) | How to use & test agents |
| [Phase5-AI-Validation.md](./Phase5-AI-Validation.md) | QA sign-off checklist |
