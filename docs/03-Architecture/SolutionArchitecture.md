# TravelOS Solution Architecture

**Version:** 1.1 — MVP + AI Platform (documented)  
**Last Updated:** 2026-06-02

---

## System Context

```mermaid
flowchart TB
    subgraph users [Users]
        Admin[Tenant Admin]
        Agent[Sales Agent]
        Finance[Finance Officer]
        SuperAdmin[Super Admin]
    end

    subgraph travelos [TravelOS Platform]
        Frontend[Next.js + Refine Admin]
        API[Next.js API Routes]
        SupaAuth[Supabase Auth]
        SupaDB[(PostgreSQL + RLS)]
        SupaStorage[Supabase Storage]
        AIPlatform[TravelOS AI Platform]
        KnowledgeAgent[Knowledge Agent]
        BookingAgent[Booking Agent]
        SupportAgent[Support Agent]
        Marketing[Landing /home]
    end

    subgraph external [External Services]
        Vercel[Vercel Hosting]
        Claude[Claude API]
        Email[Email Service]
        VectorDB[pgvector / Supabase Vectors]
    end

    Admin --> Frontend
    Agent --> Frontend
    Finance --> Frontend
    SuperAdmin --> Frontend
    Admin --> Marketing
    Frontend --> API
    Frontend --> SupaAuth
    API --> SupaDB
    API --> SupaStorage
    AIPlatform --> KnowledgeAgent & BookingAgent & SupportAgent
    KnowledgeAgent --> VectorDB
    SupportAgent --> VectorDB
    BookingAgent --> SupaDB
    SupportAgent --> SupaDB
    KnowledgeAgent --> Claude
    BookingAgent --> Claude
    SupportAgent --> Claude
    Frontend --> Vercel
    SupaAuth --> Email
```

---

## Component Architecture

```mermaid
flowchart LR
    subgraph presentation [Presentation Layer]
        Pages[Next.js App Router Pages]
        Components[shadcn/ui Components]
        RefineResources[Refine Resources]
    end

    subgraph application [Application Layer]
        APIRoutes[API Route Handlers]
        AuthMiddleware[Auth Middleware]
        RBACMiddleware[RBAC Middleware]
        Validation[Zod Validation]
    end

    subgraph data [Data Layer]
        SupabaseClient[Supabase JS Client]
        RLS[Row Level Security]
        Triggers[DB Triggers]
    end

    Pages --> RefineResources
    RefineResources --> SupabaseClient
    Pages --> APIRoutes
    APIRoutes --> AuthMiddleware
    AuthMiddleware --> RBACMiddleware
    RBACMiddleware --> Validation
    Validation --> SupabaseClient
    SupabaseClient --> RLS
    RLS --> Triggers
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | Next.js 15 (App Router) | SSR, routing, API routes |
| Admin Framework | Refine 4 | CRUD scaffolding, data provider |
| UI Components | shadcn/ui + Tailwind CSS | Design system |
| Language | TypeScript (strict) | Type safety |
| Backend | Supabase | Auth, DB, Storage, RLS |
| Database | PostgreSQL 15 | Relational data |
| AI | Claude API | Booking Agent |
| Hosting | Vercel | Frontend + API deployment |
| CI/CD | GitHub Actions | Lint, test, deploy |

---

## Data Flow: Create Booking

```mermaid
sequenceDiagram
    participant Agent as Sales Agent
    participant UI as Refine UI
    participant API as API Route
    participant Auth as Auth Middleware
    participant DB as Supabase DB

    Agent->>UI: Fill booking form
    UI->>API: POST /api/bookings
    API->>Auth: Validate JWT + role
    Auth->>API: Authorized (sales_agent)
    API->>DB: INSERT bookings (RLS checks tenant_id)
    DB->>DB: Trigger: generate reference_number
    DB->>DB: Trigger: audit_log INSERT
    DB->>API: Return booking
    API->>UI: 201 Created
    UI->>Agent: Show booking detail
```

---

## Multi-Tenancy Architecture

1. **Tenant provisioning:** Super Admin creates tenant → tenant_settings row
2. **User assignment:** Users linked to tenant via `users.tenant_id`
3. **JWT claims:** On login, custom claims set: `{ tenant_id, role }`
4. **RLS enforcement:** Every query filtered by `tenant_id` from JWT
5. **Super Admin bypass:** Dedicated RLS policy for platform-level access

---

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Transport | HTTPS (TLS 1.2+) via Vercel |
| Authentication | Supabase Auth (JWT) |
| Authorization | RBAC middleware + RLS policies |
| Input validation | Zod schemas on all API routes |
| Audit | Database triggers → audit_logs |
| Soft delete | deleted_at filter in all queries |

---

## Deployment Architecture

```mermaid
flowchart LR
    GitHub[GitHub Repo] --> GHA[GitHub Actions]
    GHA --> Lint[Lint + TypeCheck]
    GHA --> Test[Unit Tests]
    Lint --> Vercel[Vercel Deploy]
    Test --> Vercel
    Vercel --> NextJS[Next.js App]
    NextJS --> SupabaseCloud[Supabase Cloud]
```

| Environment | Frontend | Database |
|-------------|----------|----------|
| Development | localhost:3000 | Supabase local or dev project |
| Staging | staging.travelos.app | Supabase staging project |
| Production | app.travelos.app | Supabase production project |

---

## Folder Structure

```
travel-os/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, forgot password
│   ├── (dashboard)/        # Authenticated routes
│   │   ├── customers/
│   │   ├── packages/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── users/
│   │   └── settings/
│   └── api/                # API route handlers
├── components/             # Shared UI components
├── lib/                    # Utilities, Supabase client, validation
├── providers/              # Refine providers (auth, data, access)
├── types/                  # TypeScript types
├── database/
│   ├── schema/             # DDL reference files
│   └── migrations/         # Supabase migrations
├── docs/                   # Documentation
├── ai/                     # AI agents and prompts
└── .github/workflows/      # CI/CD
```

---

## Integration Points (MVP)

| Integration | Status | Phase |
|-------------|--------|-------|
| Supabase Auth | MVP | Phase 5 |
| Supabase Database | MVP | Phase 4 |
| Supabase Storage | MVP (package images) | Phase 5 |
| Claude API | MVP (Booking Agent) | Phase 6 |
| Stripe Payments | POST-MVP | Growth |
| Email Notifications | POST-MVP | Growth |
