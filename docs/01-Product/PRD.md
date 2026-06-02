# TravelOS Product Requirements Document (PRD)

**Version:** 1.1 — MVP + Approved AI Platform  
**Status:** Approved (documentation) — AI implementation Phase 5  
**Last Updated:** 2026-06-02  
**Author:** TravelOS Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Goals](#2-business-goals)
3. [Product Vision](#3-product-vision)
4. [User Personas](#4-user-personas)
5. [Market Positioning](#5-market-positioning)
6. [Functional Scope — MVP](#6-functional-scope--mvp)
7. [Non-Functional Scope](#7-non-functional-scope)
8. [KPIs and Success Metrics](#8-kpis-and-success-metrics)
9. [Release Strategy](#9-release-strategy)
10. [Risks](#10-risks)
11. [Assumptions](#11-assumptions)
12. [Constraints](#12-constraints)
13. [Out of Scope](#13-out-of-scope)

---

## 1. Executive Summary

TravelOS is a multi-tenant SaaS platform designed for travel agencies, tour operators, and destination management companies. The MVP delivers core operational capabilities — customer management, package catalog, booking lifecycle, and payment tracking — within a secure, role-based environment.

The platform replaces fragmented tools (spreadsheets, legacy booking systems, standalone CRMs) with a unified system built on Next.js, Refine, and Supabase. A **marketing landing page** targets travel agencies, tour operators, and DMCs. The **TravelOS AI Platform** (Phase 5) delivers three approved agents: **Knowledge**, **Booking**, and **Support** — with human-in-the-loop controls and tenant-isolated RAG.

**MVP delivers value when an agency can:**

1. Onboard as a tenant with isolated data
2. Manage staff with role-based permissions
3. Maintain a customer database with contact details
4. Create and publish travel packages with itineraries and pricing
5. Create bookings linking customers to packages
6. Record and track payments against bookings

---

## 2. Business Goals

| # | Goal | Measure |
|---|------|---------|
| G1 | Reduce booking creation time by 60% vs manual/spreadsheet process | Avg time < 5 minutes |
| G2 | Eliminate duplicate customer records | Zero duplicates per tenant |
| G3 | Provide real-time booking and payment visibility | Dashboard loads < 2s |
| G4 | Enable secure multi-tenant operations from launch | Zero cross-tenant data leaks |
| G5 | Establish foundation for AI-assisted operations | Phase 5: Knowledge, Booking, Support agents operational per tenant |
| G7 | Credible enterprise positioning for prospects | Landing page with Trust & Scale Metrics (D-009) |
| G6 | Achieve 10 pilot tenant agencies within 3 months of MVP launch | 10 active tenants |

---

## 3. Product Vision

See [Vision.md](./Vision.md) for full vision statement.

**Summary:** TravelOS is the operating system for modern travel businesses — unified, secure, AI-native, and built for scale.

---

## 4. User Personas

### 4.1 Tenant Admin (Agency Owner)

- **Role:** Manages the agency tenant
- **Technical level:** Low-to-medium
- **Primary tasks:** User management, tenant settings, business overview
- **Key screens:** Dashboard, Users, Settings

### 4.2 Sales Agent

- **Role:** Front-line staff creating bookings
- **Technical level:** Low
- **Primary tasks:** Customer lookup/creation, package selection, booking creation, status updates
- **Key screens:** Customers, Packages, Bookings

### 4.3 Finance Officer

- **Role:** Handles payment collection and reconciliation
- **Technical level:** Medium
- **Primary tasks:** Record payments, view outstanding balances, export data
- **Key screens:** Payments, Bookings (payment status), Reports (basic)

### 4.4 Super Admin (Platform Operator)

- **Role:** Manages the TravelOS platform
- **Technical level:** High
- **Primary tasks:** Tenant provisioning, platform monitoring, security audit
- **Key screens:** Tenants, Audit Logs, System Settings

### 4.5 Support / Operations Staff (Phase 5)

- **Role:** Handles customer issues and internal policy questions
- **Primary tasks:** Ticket triage, FAQ responses, escalation
- **Key screens:** Support Agent console, Customers, Bookings (read)

### 4.6 Internal Knowledge User (all staff)

- **Role:** Any employee needing policy/package/supplier answers
- **Primary tasks:** Semantic search over company knowledge base
- **Key screens:** Knowledge Agent chat

---

## 5. Market Positioning

TravelOS targets small-to-mid travel agencies (5–50 staff) in emerging and established markets who need a modern, affordable alternative to legacy systems.

**Key differentiators:**

- Multi-tenant SaaS (no per-installation cost)
- AI-native platform (Knowledge, Booking, Support agents)
- Arabic RTL marketing and admin UI
- Modern web stack (fast, responsive, mobile-friendly admin)
- Open API for future integrations

See [Vision.md](./Vision.md) for competitive positioning details.

---

## 6. Functional Scope — MVP

### 6.1 Authentication (AUTH)

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Email/password registration and login via Supabase Auth | Must |
| AUTH-02 | JWT-based session management | Must |
| AUTH-03 | Password reset via email | Must |
| AUTH-04 | Session expiry and refresh | Must |
| AUTH-05 | Logout clears session | Must |

### 6.2 User Management (USER)

| ID | Requirement | Priority |
|----|-------------|----------|
| USER-01 | Tenant Admin can invite users by email | Must |
| USER-02 | Assign one role per user (Admin, Sales Agent, Finance Officer) | Must |
| USER-03 | Deactivate/reactivate user accounts | Must |
| USER-04 | View list of tenant users with role and status | Must |
| USER-05 | Super Admin can manage users across tenants | Should |

### 6.3 Customers (CUST)

| ID | Requirement | Priority |
|----|-------------|----------|
| CUST-01 | Create customer with name, email, phone, type (individual/corporate) | Must |
| CUST-02 | Add multiple contacts per customer | Must |
| CUST-03 | Add multiple addresses per customer | Must |
| CUST-04 | Search customers by name, email, phone | Must |
| CUST-05 | Edit and soft-delete customers | Must |
| CUST-06 | View customer booking history | Should |

### 6.4 Packages (PKG)

| ID | Requirement | Priority |
|----|-------------|----------|
| PKG-01 | Create package with title, description, destination, duration | Must |
| PKG-02 | Add itinerary days with activities | Must |
| PKG-03 | Define pricing tiers (adult, child, infant) | Must |
| PKG-04 | Set package status (draft, published, archived) | Must |
| PKG-05 | Upload package cover image | Should |
| PKG-06 | Search/filter packages by destination, status, date | Must |

### 6.5 Bookings (BKG)

| ID | Requirement | Priority |
|----|-------------|----------|
| BKG-01 | Create booking linking customer + package | Must |
| BKG-02 | Add travelers with name, DOB, passport number | Must |
| BKG-03 | Add line items with quantity and unit price | Must |
| BKG-04 | Booking status workflow: draft → confirmed → completed → cancelled | Must |
| BKG-05 | Auto-calculate total from line items | Must |
| BKG-06 | Track payment status (unpaid, partial, paid) | Must |
| BKG-07 | View booking status history | Must |
| BKG-08 | Search/filter bookings by status, customer, date range | Must |

### 6.6 Payments (PAY)

| ID | Requirement | Priority |
|----|-------------|----------|
| PAY-01 | Record payment against a booking | Must |
| PAY-02 | Support payment methods: cash, bank transfer, card, other | Must |
| PAY-03 | Track payment amount, date, reference number | Must |
| PAY-04 | Auto-update booking payment status on payment record | Must |
| PAY-05 | View payment transaction history per booking | Must |
| PAY-06 | List all payments with filters (date, method, status) | Must |

### 6.7 Cross-Cutting (XCT)

| ID | Requirement | Priority |
|----|-------------|----------|
| XCT-01 | All data scoped to tenant via RLS | Must |
| XCT-02 | RBAC enforced on all API endpoints and UI routes | Must |
| XCT-03 | Audit log on INSERT/UPDATE/DELETE for business entities | Must |
| XCT-04 | Soft delete (deleted_at) on all business entities | Must |
| XCT-05 | created_by / updated_by on all business entities | Must |
| XCT-06 | Responsive admin UI (desktop + tablet) | Must |
| XCT-07 | Public marketing site (EN/AR, RTL) with product positioning | Must |
| XCT-08 | Authenticated users reach marketing via `/home` without losing session | Should |

### 6.8 AI Platform (AI) — Phase 5 Approved

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| AI-01 | **Knowledge Agent:** semantic search over tenant knowledge (policies, packages, pricing, suppliers, FAQs) | Must | 5 |
| AI-02 | **Knowledge Agent:** answers include source citations | Must | 5 |
| AI-03 | **Booking Agent:** recommend published packages | Must | 5 |
| AI-04 | **Booking Agent:** create and update **draft** bookings from chat | Must | 5 |
| AI-05 | **Booking Agent:** lookup booking status by reference | Must | 5 |
| AI-06 | **Booking Agent:** collect traveler information for drafts | Must | 5 |
| AI-07 | **Booking Agent:** propose cancellations; staff executes confirm/cancel | Must | 5 |
| AI-08 | **Support Agent:** answer customer FAQs with RAG | Must | 5 |
| AI-09 | **Support Agent:** create and route support tickets | Must | 5 |
| AI-10 | **Support Agent:** escalation workflow to human assignee | Must | 5 |
| AI-11 | All agents enforce tenant_id and RBAC | Must | 5 |
| AI-12 | Agent conversations and tool calls auditable | Must | 5 |
| AI-13 | Admin can upload and index knowledge documents | Should | 5 |

See [AI-Agents.md](../04-Modules/AI-Agents.md) and [AIArchitecture.md](../../ai/AIArchitecture.md).

### 6.9 Marketing Landing Page (MKT)

| ID | Requirement | Priority |
|----|-------------|----------|
| MKT-01 | Hero with headline, value proposition, CTAs, dashboard mockup | Must (done) |
| MKT-02 | Trust & Scale Metrics section (+50K bookings, +200 agencies, +20 countries, 99.9% uptime) | Must (implemented) |
| MKT-03 | Features, solutions (booking/packages/customers/AI), pricing, testimonials, FAQ | Must (done) |
| MKT-04 | Full Arabic RTL layout | Must (done) |

See [LandingPage.md](./LandingPage.md).

---

## 7. Non-Functional Scope

### 7.1 Performance

| Requirement | Target |
|-------------|--------|
| Page load (dashboard) | < 2 seconds |
| API response (CRUD) | < 500ms p95 |
| Search results | < 1 second |
| Concurrent users per tenant | 50 |

### 7.2 Security

| Requirement | Target |
|-------------|--------|
| Authentication | Supabase Auth with JWT |
| Authorization | Row Level Security + RBAC |
| Data isolation | Zero cross-tenant access |
| Transport | HTTPS only (TLS 1.2+) |
| Password policy | Min 8 chars, Supabase defaults |
| Audit | All mutations logged with user + timestamp |

### 7.3 Scalability

| Requirement | Target |
|-------------|--------|
| Tenants (MVP) | 50 |
| Records per tenant | 100K customers, 10K bookings |
| Database | PostgreSQL via Supabase (auto-scaling) |

### 7.4 Availability

| Requirement | Target |
|-------------|--------|
| Uptime (MVP) | 99% |
| Backup | Supabase daily automated backups |
| Recovery | Point-in-time recovery via Supabase |

### 7.5 Usability

| Requirement | Target |
|-------------|--------|
| Admin UI language | English (MVP) |
| Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Mobile | Responsive tablet; phone read-only |

### 7.6 Maintainability

| Requirement | Target |
|-------------|--------|
| Code language | TypeScript (strict mode) |
| Test coverage | 70%+ on business logic |
| Documentation | All modules spec'd before implementation |
| CI/CD | Automated lint, test, deploy on merge to main |

---

## 8. KPIs and Success Metrics

| KPI | Baseline | MVP Target | Measurement |
|-----|----------|------------|-------------|
| Booking creation time | ~15 min (manual) | < 5 min | Avg time from customer select to booking save |
| Customer duplicate rate | ~10% | 0% | Duplicate detection on email/phone |
| Payment collection rate | ~70% | 80% | Paid bookings / total confirmed bookings |
| User adoption (daily active) | N/A | 70% of invited users | DAU / total users per tenant |
| Platform uptime | N/A | 99% | Monitoring via Vercel + Supabase |
| Tenant onboarding time | N/A | < 30 min | Time from signup to first booking |

---

## 9. Release Strategy

See [Roadmap.md](./Roadmap.md) for detailed phase breakdown.

**MVP release approach:**

1. Internal alpha with 2–3 pilot agencies
2. Closed beta with 10 agencies
3. Public launch after beta feedback incorporated

---

## 10. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Scope creep to full 26-module spec | High | High | Strict MVP boundary; POST-MVP tag on deferred items |
| R2 | RLS policy bugs causing data leaks | Medium | Critical | Security test suite; peer review all policies |
| R3 | Refine + Supabase integration complexity | Medium | High | Early spike in Phase 5; fallback to direct Supabase client |
| R4 | Low pilot tenant adoption | Medium | Medium | Hands-on onboarding; dedicated support channel |
| R5 | Performance degradation at scale | Low | Medium | Index strategy in Phase 2; load testing before launch |
| R6 | AI agent hallucination in booking context | Medium | Medium | Human-in-the-loop approval; agent creates drafts only |

---

## 11. Assumptions

1. Pilot agencies operate primarily in English
2. Single currency (USD) for MVP; multi-currency deferred
3. Agencies have stable internet connectivity
4. Supabase free/pro tier sufficient for MVP scale
5. No GDS or flight inventory integration needed for MVP
6. Payment recording is manual (no payment gateway in MVP)
7. Users access admin via desktop/laptop primarily

---

## 12. Constraints

1. **Budget:** Bootstrap / minimal infrastructure cost (Supabase free tier + Vercel hobby)
2. **Timeline:** MVP target Q3 2026
3. **Team:** Small team (1–3 developers) with AI-assisted development
4. **Technology:** Next.js + Refine + Supabase (per specification)
5. **Compliance:** No PCI DSS required for MVP (manual payment recording only)

---

## 13. Out of Scope (MVP)

The following are explicitly deferred to Growth or Enterprise phases:

- GDS / flight / hotel inventory integration
- Online payment gateway (Stripe, PayPal)
- Invoice PDF generation
- Refund processing
- CRM (leads, opportunities, pipeline)
- Marketing campaigns and email automation
- Multi-currency and exchange rates
- Multi-language (i18n)
- Public B2C booking portal
- Supplier management (hotels, flights, transfers, excursions, guides)
- Document upload and storage (beyond package cover image)
- Advanced reporting and analytics dashboards
- Full AI agent suite beyond Knowledge, Booking, Support (Recommendation, CRM, Marketing, Operations agents)
- Knowledge / Booking / Support Agent **implementation** (approved for Phase 5 — not MVP core DB migrations)
- Autonomous booking confirmation or payment by agents
- SSO / SAML enterprise authentication
- Mobile native apps

See [Roadmap.md](./Roadmap.md) for post-MVP module schedule. Approved decisions: [DECISIONS.md](./DECISIONS.md).
