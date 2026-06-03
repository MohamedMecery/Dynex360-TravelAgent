# TravelOS Architecture & Product Decision Log

**Status:** Approved decisions (documentation baseline)  
**Last Updated:** 2026-06-03  
**Implementation:** Decisions 1–5 reflected in migrations 001–010 (in progress). Decisions 6–9 approved for Phase 5+ / marketing. D-010 documents phased i18n. AI agents (D-006–D-008) have partial implementation — see Roadmap Phase 5 completion checklist.

---

## Decision Index

| # | Decision | Status | Date |
|---|----------|--------|------|
| D-001 | Countries and Cities are global reference data | Approved | 2026-06-01 |
| D-002 | Destinations are tenant-scoped | Approved | 2026-06-01 |
| D-003 | Travelers may exist without customer accounts | Approved | 2026-06-01 |
| D-004 | Payments may optionally reference invoices | Approved | 2026-06-01 |
| D-005 | Multiple invoices are allowed per booking | Approved | 2026-06-01 |
| D-006 | Knowledge Agent approved for product scope | Approved | 2026-06-02 |
| D-007 | Booking Agent approved for product scope | Approved | 2026-06-02 |
| D-008 | Support Agent approved for product scope | Approved | 2026-06-02 |
| D-009 | Landing page Trust & Scale Metrics section approved | Approved | 2026-06-02 |
| D-010 | Phased i18n — customer/AI first; staff UI EN+AR for MVP | Approved | 2026-06-02 |
| D-011 | Product glossary: Package vs booking_items vs Invoice | Approved | 2026-06-03 |
| D-012 | Invoice line snapshot: JSONB on `invoices` at `issued` | Approved | 2026-06-03 |

---

## D-001 — Global geography reference (Countries & Cities)

**Decision:** `countries` and `cities` are platform-wide reference tables without `tenant_id`.

**Rationale:** ISO-aligned geography is shared across all agencies; avoids duplicate country/city rows per tenant.

**Impact:** Seeded once; read-only for tenants via RLS or public read policies. See [DomainModel.md](../03-Architecture/DomainModel.md) §6.

---

## D-002 — Tenant-scoped destinations

**Decision:** `destinations` are curated per tenant (`tenant_id` required) even though they reference global `countries` / `cities`.

**Rationale:** Each agency markets its own destination catalog while reusing normalized geography.

**Impact:** Packages link to `destinations.id`; RLS enforces tenant isolation.

---

## D-003 — Standalone travelers

**Decision:** `travelers.customer_id` is nullable.

**Rationale:** Walk-in passengers, group tours, and B2B scenarios may require traveler profiles before a customer account exists.

**Impact:** `booking_travelers` still links travelers to bookings; CRM history may be partial until customer is assigned.

---

## D-004 — Optional payment–invoice link

**Decision:** `payments.invoice_id` is optional; `payments.booking_id` remains required.

**Rationale:** MVP supports direct booking payments; invoicing can be adopted progressively.

**Impact:** Payment reconciliation supports both invoice-based and booking-direct workflows.

---

## D-005 — Multiple invoices per booking

**Decision:** Cardinality is **1 booking → N invoices** (no single-invoice constraint).

**Rationale:** Deposits, partial billing, and add-on charges are common in travel operations.

**Impact:** Invoice status and payment status triggers must aggregate at booking level when needed.

---

## D-006 — Knowledge Agent approved

**Decision:** Add **Knowledge Agent** to official product scope (Phase 5 — AI Foundation).

**Purpose:** Internal RAG assistant for policies, procedures, packages, pricing, supplier contracts, FAQs, and operational documents.

**Constraints:** Tenant-scoped retrieval only; no autonomous writes to business tables in MVP.

**References:** [AIArchitecture.md](../../ai/AIArchitecture.md), [AI-Agents.md](../04-Modules/AI-Agents.md), [Roadmap.md](./Roadmap.md) Phase 5.

---

## D-007 — Booking Agent approved

**Decision:** Expand **Booking Agent** from MVP draft-only foundation to full Phase 5 scope: recommendations, draft/create/update/cancel assistance, status lookup, traveler collection — with **human approval** for all confirmations and cancellations.

**Constraints:** Aligns with existing guardrail: never auto-confirm bookings (see `ai/workflows/booking-agent-workflow.md`).

**References:** [Bookings.md](../04-Modules/Bookings.md), [API.md](../03-Architecture/API.md) `/api/ai/booking-agent`.

---

## D-008 — Support Agent approved

**Decision:** Add **Support Agent** to official product scope (Phase 5 — AI Foundation).

**Purpose:** Customer FAQ, booking support, ticket creation, routing, and escalation workflows.

**Constraints:** External customer channels POST-MVP; Phase 5 focuses on staff-assisted and in-app support console.

**References:** [Customers.md](../04-Modules/Customers.md) (CRM/support integration), [AI-Agents.md](../04-Modules/AI-Agents.md).

---

## D-009 — Landing Trust & Scale Metrics section approved

**Decision:** Add **Trust & Scale Metrics** section between Hero and Features on the marketing site.

**Metrics (illustrative marketing figures):**

| Metric | Display |
|--------|---------|
| Bookings processed | +50,000 |
| Travel agencies | +200 |
| Countries served | +20 |
| Platform uptime | 99.9% |

**Requirements:** Responsive layout, animated counters, RTL support, TravelOS premium branding.

**Specification:** [LandingPage.md](./LandingPage.md) — **implemented** in `src/components/landing/trust-metrics-section.tsx` (animated counters, RTL, `#metrics` anchor).

---

## D-010 — Phased internationalization (locales)

**Decision:** MVP and pilot staff UI remain **English + Arabic** only. Additional languages (starting with **Spanish**) roll out on **customer-facing and AI surfaces first**, not the full Refine admin catalog.

**Rationale:** Translating 700+ admin keys per locale is costly; agencies in MENA primarily need AR/EN for staff. Spanish (and later FR/PT/DE) matters most for marketing, chatbot replies, emails, and future B2C/mobile — not for every bookings screen on day one.

**Phases:**

| Phase | Scope |
|-------|--------|
| Growth | `/home` in ES; agent locale detection; email templates |
| Growth+ | Customer portal + mobile app locales |
| Enterprise | Optional full staff UI locale per tenant (e.g. ES for Latin America HQ) |

**Technical:** `FUTURE_LOCALES` in `src/i18n/config.ts`; add to `LOCALES` + `messages/es.json` when each surface is approved.

**References:** [Roadmap.md](./Roadmap.md) § Internationalization — Future Work.

---

## D-011 — Product glossary (Package vs line items vs Invoice)

**Decision:** Publish a single glossary defining **Package**, **booking_items**, **Invoice (MVP header only)**, and **Payment** relationships.

**Rationale:** Sales and finance teams confuse “package price” with invoice lines; engineering must not add `invoice_items` in MVP without an explicit product decision.

**Impact:** MVP schema and UI; frozen snapshot at issue documented in D-012.

**Reference:** [Glossary.md](./Glossary.md).

---

## D-012 — Invoice line snapshot at issue

**Decision:** When an invoice transitions to `issued`, copy the booking’s `booking_items` into `invoices.line_items_snapshot` (JSONB array). Do **not** add an `invoice_items` table for this phase.

**Rationale:** Finance needs a stable commercial breakdown on issued invoices even if the booking is edited later; JSONB keeps MVP schema small and matches the existing header-only invoice model (D-011).

**Rules:**

- Snapshot is written **once** (trigger on first `issued`; never overwritten).
- Draft invoices continue to show **live** booking lines in the UI.
- Backfill: migration `022` populates snapshot for invoices already `issued`.

**Impact:** Migration `022_invoice_line_snapshot.sql`; UI `InvoiceBookingLineItems`; module spec [Invoices.md](../04-Modules/Invoices.md).

---

## Change Control

- New decisions are appended with the next `D-0xx` ID.
- Breaking schema changes require Domain Model, ERD, and Database Design updates before migrations.
- AI and landing changes require PRD, Requirements, User Stories, and Roadmap alignment (this log is the source of truth for approvals).
