# Phase 5 — New Agent Handoff Prompt

انسخ المحتوى داخل قسم **「Prompt للصق في محادثة Agent جديدة」** إلى Cursor Agent جديد عند بدء تنفيذ Phase 5.

**Last updated:** 2026-06-02

---

## Prompt للصق في محادثة Agent جديدة

```
أنت تعمل على مشروع TravelOS — SaaS متعدد المستأجرين لوكالات السفر (Next.js 15, Refine 4, Supabase, TypeScript, Tailwind, shadcn/ui).

## مهمتك
تنفيذ **Phase 5 — AI Foundation** حسب الوثائق المعتمدة. المستخدم يريد المتابعة على مسارين (بالترتيب الموصى به):
1. **قاعدة البيانات Phase 5** — migrations 012–015 (AI + RAG + Support) بدون كسر MVP الحالي
2. **Knowledge Agent MVP** — RAG + API + واجهة محادثة داخلية

اقرأ السياق أدناه ثم اسأل المستخدم أي مسار يبدأ اليوم إن لم يحدد — وإلا ابدأ بـ **Phase 5 database** ثم Knowledge Agent.

---

## حالة المشروع الحالية

### مكتمل / قيد التشغيل
- PRD, Requirements, User Stories (65), Domain Model v2, ERD, Database Design v2
- Migrations **001–011** في `database/migrations/` (تزامن مع `supabase/migrations/`)
- وحدات MVP في التطبيق: Auth, Customers, Packages, Bookings, Payments, Dashboard, Travelers, Destinations, Invoices (واجهات Refine)
- Landing page marketing: `/` و `/home` — بما فيها **Trust & Scale Metrics** (منفذ)
- Booking Agent API stub: `src/app/api/ai/booking-agent/route.ts`

### معتمد في الوثائق — لم يُنفَّذ بعد (Phase 5)
- **Knowledge Agent** — RAG داخلي، إجابات مع citations (D-006)
- **Booking Agent** — توسيع: توصيات، مسودات، تحديث، إلغاء مقترح — الموظف يؤكد (D-007)
- **Support Agent** — FAQ، تذاكر، تصعيد (D-008)
- جداول AI مقترحة في Database Design §8 — **لا migrations بعد**

---

## قرارات معمارية ثابتة (لا تغيّرها)

من `docs/01-Product/DECISIONS.md`:
1. `countries` و `cities` — مرجع عالمي (global)
2. `destinations` — لكل مستأجر (tenant-scoped)
3. `travelers.customer_id` — nullable (مسافر مستقل)
4. `payments.invoice_id` — optional
5. `bookings` → `invoices` — 1:N
6–8. Knowledge / Booking / Support Agents — معتمدة Phase 5
9. Trust & Scale Metrics — منفذ على Landing

قواعد AI إلزامية:
- **لا تأكيد حجز تلقائي** — Booking Agent يخلق/يعدّل `draft` فقط؛ التأكيد عبر واجهة BKG العادية
- **لا عمليات دفع** عبر الـ agents
- **عزل tenant** على كل استعلام RLS و JWT
- **لا `SUPABASE_SERVICE_ROLE_KEY` في العميل**

---

## Phase 5 — Database (الأولوية الموصى بها)

### الملفات المرجعية
- `docs/03-Architecture/DatabaseDesign.md` — **§8** (تفاصيل الجداول)
- `docs/03-Architecture/DomainModel.md` — **§10**
- `docs/03-Architecture/ERD.md` — **§4**
- `docs/03-Architecture/RBAC.md` — أضف صلاحيات `ai.*` و `knowledge.manage`

### Migrations مقترحة (أنشئها بالترتيب)
```
012_ai_core.sql         — ai_agents, ai_sessions, ai_conversations, ai_messages, ai_logs, ai_feedback
013_knowledge_rag.sql   — extension vector, knowledge_documents, knowledge_chunks, RPC بحث semantic
014_support.sql         — support_tickets, support_ticket_messages
015_rls_ai.sql          — RLS policies لكل جداول Phase 5
```
- انسخ إلى `supabase/migrations/` بعد `npm run db:sync` أو حسب سير العمل في المشروع
- اتبع أنماط 001–011: UUID PK, tenant_id, soft delete حيث ينطبق, audit columns
- **لا تتجاوز RLS** في كود التطبيق

### معايير القبول
- `npx supabase db push` (أو local) ينجح
- سياسات RLS تمنع قراءة بيانات tenant آخر
- Types في `src/types/` محدّثة إن لزم

---

## Phase 5 — Knowledge Agent MVP (بعد DB)

### الملفات المرجعية
- `ai/AIArchitecture.md` — §2 Knowledge Agent
- `ai/workflows/knowledge-agent-workflow.md`
- `ai/rag/knowledge-base.md`
- `docs/04-Modules/AI-Agents.md`
- User stories: US-AI-KNOW-001 إلى 004
- Acceptance: `docs/02-Business/AcceptanceCriteria.md` (قسم Knowledge Agent)

### التنفيذ المتوقع
1. `POST /api/ai/knowledge-agent` — auth + tenant + Zod
2. استرجاع chunks من `knowledge_chunks` (tenant filter)
3. استدعاء Claude مع citations في الرد
4. حفظ `ai_conversations` / `ai_messages` / `ai_logs`
5. واجهة `/ai/knowledge` في Refine (chat بسيط)
6. (Should) صفحة رفع مستندات `/settings/knowledge` — Supabase Storage + ingest chunks

### عدم تنفيذه في هذه المرحلة إلا طُلب
- Support Agent كامل
- Booking Agent توسيع كامل
- Phase 6 orchestration

---

## معايير الكود (من CLAUDE.md)
- TypeScript strict، لا `any`
- مسارات `@/`
- API: `{ data }` / `{ error: { code, message } }`
- تحقق RBAC على كل route
- اقرأ `docs/04-Modules/` و `docs/03-Architecture/API.md` قبل endpoints جديدة
- استخدم skill Supabase عند أي عمل DB/Auth

---

## هيكل المستودع
```
src/app/              — صفحات + API routes
src/components/       — UI
src/lib/              — supabase, auth, validation
src/providers/        — Refine
database/migrations/  — DDL (مصدر)
supabase/migrations/  — نسخ للـ CLI
docs/01-Product/      — PRD, Roadmap, DECISIONS, LandingPage
docs/03-Architecture/ — DB, ERD, RBAC, API
ai/                   — AIArchitecture, workflows, prompts
```

---

## تعليمات التشغيل
1. اقرأ الملفات المرجعية للمسار المختار قبل الكتابة.
2. نفّذ أصغر diff يرضي المعايير — لا إعادة هيكلة واسعة.
3. شغّل `npm run typecheck` بعد تغييرات TypeScript.
4. لا commit إلا إذا طلب المستخدم.
5. عند الانتهاء: لخص ما تغيّر، كيف يختبر، وما الخطوة التالية (Support Agent / Booking Agent / Phase 6).

ابدأ بإخبار المستخدم أنك فهمت السياق، ثم نفّذ المسار الذي يختاره (افتراضي: migrations 012–015 ثم Knowledge Agent API + UI).
```

---

## مسار مختصر (بديل)

إذا أردت prompt أقصر:

```
مشروع TravelOS (Next.js 15 + Supabase + Refine). نفّذ Phase 5: 
(1) migrations 012–015 لجداول AI/RAG/support حسب docs/03-Architecture/DatabaseDesign.md §8 
(2) Knowledge Agent MVP — API /api/ai/knowledge-agent + chat UI + RAG على knowledge_chunks.
اقرأ DECISIONS.md, ai/AIArchitecture.md, CLAUDE.md. 
قواعد: tenant RLS, لا تأكيد حجز تلقائي, لا service role في العميل. 
Migrations 001–011 موجودة. Landing و Trust Metrics منفذة.
```

---

## روابط سريعة

| موضوع | ملف |
|--------|-----|
| قرارات | [DECISIONS.md](../01-Product/DECISIONS.md) |
| Roadmap Phase 5 | [Roadmap.md](../01-Product/Roadmap.md) |
| AI معمارية | [AIArchitecture.md](../../ai/AIArchitecture.md) |
| DB §8 | [DatabaseDesign.md](../03-Architecture/DatabaseDesign.md) |
| وحدة AI | [AI-Agents.md](../04-Modules/AI-Agents.md) |
| سياق Claude | [CLAUDE.md](../../CLAUDE.md) |
