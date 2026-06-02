# Claude Context — TravelOS

Project standards, architecture, and coding rules for AI-assisted development.

---

## Project Overview

TravelOS is a multi-tenant Travel Management SaaS for travel agencies. MVP modules: Authentication, Customers, Packages, Bookings, Payments (expanded schema includes Travelers, Destinations, Invoices — see docs).

**Approved AI agents (Phase 5 — docs only until implementation gate):** Knowledge Agent, Booking Agent, Support Agent. See `ai/AIArchitecture.md` and `docs/01-Product/DECISIONS.md`.

**Marketing:** Landing at `/` and `/home` — Trust & Scale Metrics spec in `docs/01-Product/LandingPage.md` (UI pending).

**Stack:** Next.js 15, Refine 4, Supabase, TypeScript, Tailwind CSS, shadcn/ui.

---

## Architecture Overview

```
src/
├── app/           Next.js App Router (pages + API routes)
├── components/    Shared UI (layout, ui/)
├── lib/           Utilities, Supabase clients
├── providers/     Refine providers (auth, data, access control, resources)
└── types/         TypeScript interfaces

database/
├── schema/        DDL reference files
└── migrations/    Supabase migrations (001-004)

docs/              Full specification (01-Product through 05-Development)
ai/                AI agents, prompts, RAG knowledge base
```

**Data flow:** Refine UI → Supabase JS Client → PostgreSQL (RLS) → Triggers (audit, calculations)

---

## Coding Standards

1. **TypeScript strict mode** — no `any`, explicit return types on exported functions
2. **Functional components** — React FC with hooks, no class components
3. **File naming:** kebab-case files, PascalCase components
4. **Imports:** Use `@/` path alias for src imports
5. **Forms:** react-hook-form via `@refinedev/react-hook-form`
6. **Styling:** Tailwind utility classes, cn() helper for conditional classes
7. **No placeholders** — implement real logic or document as POST-MVP

---

## Database Standards

- UUID primary keys via `gen_random_uuid()`
- `tenant_id` on all tenant-scoped tables
- Soft delete via `deleted_at` (filter in queries: `.is('deleted_at', null)`)
- Audit columns: `created_by`, `updated_by`, `created_at`, `updated_at`
- Use Supabase migrations in `database/migrations/` (sequential numbering)
- Never bypass RLS in application code

---

## API Standards

- REST endpoints under `src/app/api/`
- Validate input with Zod schemas
- Return `{ data, meta }` for lists, `{ data }` for single resources
- Error format: `{ error: { code, message, details } }`
- Check auth via Supabase server client on every API route
- Enforce RBAC before database operations

---

## Security Standards

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- JWT custom claims: `tenant_id`, `role`
- All mutations logged to `audit_logs` via DB triggers
- Validate tenant_id matches JWT on all write operations
- Sanitize user input before database queries

---

## Folder Conventions

| Path | Purpose |
|------|---------|
| `src/app/{resource}/page.tsx` | List page |
| `src/app/{resource}/create/page.tsx` | Create form |
| `src/app/{resource}/edit/[id]/page.tsx` | Edit form |
| `src/app/{resource}/show/[id]/page.tsx` | Detail view |
| `src/app/api/{resource}/route.ts` | API handler |
| `docs/04-Modules/{Module}.md` | Module specification |

---

## AI Instructions

- Read module spec in `docs/04-Modules/` before implementing a module
- Check `docs/03-Architecture/API.md` for endpoint contracts
- Check `docs/03-Architecture/DatabaseDesign.md` for schema
- MVP scope only — tag out-of-scope items as POST-MVP
- Booking Agent creates drafts only — never confirm bookings autonomously
- Knowledge Agent is read-only on business data; Support Agent owns tickets
- Do not add AI/support DB migrations until Phase 5 implementation is approved

---

## Code Review Rules

1. Does it enforce tenant isolation?
2. Does it match the API spec?
3. Are types correct (no `any`)?
4. Is RBAC checked for the operation?
5. Are edge cases handled (empty lists, not found, validation errors)?
6. Is the diff minimal and focused?

---

## Key References

- [PRD](docs/01-Product/PRD.md)
- [API Spec](docs/03-Architecture/API.md)
- [Database Design](docs/03-Architecture/DatabaseDesign.md)
- [RBAC](docs/03-Architecture/RBAC.md)
- [Booking Agent Workflow](ai/workflows/booking-agent-workflow.md)
