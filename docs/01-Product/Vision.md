# TravelOS Product Vision

## Vision Statement

TravelOS is the operating system for modern travel businesses — a unified, multi-tenant SaaS platform that replaces fragmented spreadsheets, legacy booking tools, and disconnected CRMs with a single source of truth for customers, packages, bookings, and payments.

We envision a world where travel agencies of any size can launch, manage, and scale their operations with enterprise-grade security, AI-assisted workflows, and real-time visibility into their business.

## Mission

Empower travel agencies, tour operators, and DMCs to deliver exceptional travel experiences by providing intuitive tools that automate routine work, reduce booking errors, and accelerate revenue collection.

## Market Positioning

| Segment | Position |
|---------|----------|
| **Primary (MVP)** | Small-to-mid travel agencies (5–50 staff) seeking an affordable, modern replacement for legacy systems |
| **Secondary** | Tour operators and DMCs needing package management and B2B agent portals |
| **Future** | Enterprise travel departments and OTAs requiring multi-region, multi-currency operations |

### Competitive Differentiation

1. **Multi-tenant SaaS from day one** — no per-installation overhead
2. **AI-native architecture** — Knowledge, Booking, and Support agents (Phase 5), not bolt-on chatbots
3. **Enterprise marketing presence** — bilingual landing with trust metrics for agencies and DMCs
4. **Modern stack** — Next.js + Supabase for fast iteration and low ops cost
5. **Open API design** — integrations with suppliers, payment gateways, and GDS systems

## B2B vs B2C Strategy

### B2B (MVP Focus)

- Tenant onboarding with isolated data and branding
- Role-based access for agency staff (Admin, Sales, Finance)
- Agent dashboard for customer and booking management
- Internal package catalog and pricing management

### B2C (Post-MVP)

- Public-facing package browse and search
- Online booking and payment for end travelers
- Customer self-service portal for itinerary and documents

## Target Personas

### Agency Owner / Tenant Admin

- **Goal:** Run the business efficiently, see revenue and booking pipeline
- **Pain:** Disconnected tools, no real-time reporting, manual reconciliation
- **Needs:** User management, settings, financial overview, audit trail

### Sales Agent

- **Goal:** Convert inquiries into confirmed bookings quickly
- **Pain:** Slow quote generation, duplicate customer records, lost follow-ups
- **Needs:** Customer CRM, package search, booking creation, status tracking

### Finance Officer

- **Goal:** Collect payments, reconcile bookings, minimize outstanding balances
- **Pain:** Manual payment tracking, unclear booking payment status
- **Needs:** Payment recording, transaction history, export for accounting

### Super Admin (Platform)

- **Goal:** Manage tenants, monitor platform health, enforce policies
- **Pain:** No visibility across tenants, security concerns
- **Needs:** Tenant provisioning, cross-tenant audit, system configuration

## Product Principles

1. **Tenant isolation is non-negotiable** — every data access path enforces multi-tenancy
2. **Audit everything** — who did what, when, on which record
3. **Progressive disclosure** — simple defaults, advanced options when needed
4. **API-first** — every UI action has a corresponding API endpoint
5. **AI assists, humans decide** — agents propose, staff approve

## Success Vision (3-Year Horizon)

- 500+ active tenant agencies across 10+ countries
- 1M+ bookings processed annually
- Knowledge, Booking, and Support agents handling 30%+ of routine inquiries (drafts and tickets — humans confirm)
- 99.9% platform uptime with sub-200ms API response times

## Out of Scope (MVP)

- GDS/flight inventory integration
- Multi-currency conversion engine
- Full CRM pipeline (leads, opportunities)
- Marketing automation
- Supplier inventory management (hotels, flights, transfers)
- Invoice generation and refund workflows
- Public B2C booking portal
- Full seven-agent AI suite beyond Knowledge, Booking, Support

Approved for Phase 5: [DECISIONS.md](./DECISIONS.md), [AIArchitecture.md](../../ai/AIArchitecture.md).  
Marketing specification: [LandingPage.md](./LandingPage.md).

These capabilities are planned per [Roadmap.md](./Roadmap.md).
