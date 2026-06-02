# TravelOS Project Context

## Overview

TravelOS is a multi-tenant Travel Management SaaS platform for travel agencies, tour operators, and DMCs. Built on Next.js, Refine, and Supabase.

## MVP Scope

Core modules: Authentication, User Management, Customers, Packages, Bookings, Payments.

Cross-cutting: Multi-tenancy (RLS), RBAC (4 tenant roles + Super Admin), Audit logging, Soft delete.

## Technology Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Refine
- **Backend:** Supabase (PostgreSQL, RLS, Auth, Storage)
- **AI:** Claude/OpenAI, RAG, MCP (Booking Agent in MVP)
- **Infrastructure:** Vercel, GitHub Actions

## Documentation Structure

```
docs/
├── 01-Product/     PRD, Vision, Roadmap
├── 02-Business/    Requirements, UserStories, AcceptanceCriteria, BusinessFlows, Roles, Permissions
├── 03-Architecture/ DomainModel, ERD, DatabaseDesign, API, SolutionArchitecture, RBAC
├── 04-Modules/     Per-module specifications
└── 05-Development/ CodingStandards, Testing, Deployment
```

## Key Decisions

1. MVP-first approach: 5 core modules, ~52 user stories, ~25 database tables
2. Single currency (USD) for MVP
3. Manual payment recording (no payment gateway in MVP)
4. English-only UI for MVP
5. Strict tenant isolation via Supabase RLS

## Current Phase

Phase 1 complete. Proceeding through Phase 2 (Database Design).
