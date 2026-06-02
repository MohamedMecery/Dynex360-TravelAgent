# TravelOS

Travel Management SaaS Platform — multi-tenant system for travel agencies, tour operators, and DMCs.

## Stack

- **Frontend:** Next.js 15, Refine 4, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, RLS, Storage)
- **AI:** Booking Agent with RAG knowledge base
- **Deploy:** Vercel + GitHub Actions

## MVP Modules

Authentication, Customers, Packages, Bookings, Payments

## Quick Start (local development)

**On your machine:** Next.js runs at `http://localhost:3000`  
**Database & auth:** Supabase (cloud recommended on Windows without Docker)

### 1. Install and configure

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

Edit `.env.local`:

- **Option A — Supabase Cloud (recommended):** project URL, anon key, service role key from [supabase.com/dashboard](https://supabase.com/dashboard) → Settings → API
- **Option B — Supabase local:** requires Docker Desktop, then `npx supabase start` and keys from `npx supabase status`

### 2. Database

```bash
# Cloud: link once, then push migrations
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push

# Local: start Docker, then
npx supabase start
npm run db:push
```

In Supabase Dashboard → **Authentication → Hooks**, enable **Custom Access Token** → function `public.custom_access_token_hook`.

### 3. First admin user

```bash
npm run admin:create
```

Default email: `eng.m.mecery@gmail.com` — override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars.

### 4. Run the app

```bash
npm run dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/login | Sign in |
| http://localhost:3000/dashboard | Admin dashboard (after login) |

See [docs/05-Development/Deployment.md](docs/05-Development/Deployment.md) for production deploy (Vercel).

## Project Structure

```
docs/               Product, business, architecture, module specs
database/           Schema DDL and Supabase migrations
src/                Next.js application
  app/              Pages and API routes
  components/       UI components and layout
  providers/        Refine configuration
  lib/              Supabase clients and utilities
  types/            TypeScript interfaces
ai/                 AI agents, prompts, RAG knowledge base
mcp/                MCP server configuration examples
.cursor/rules/      Cursor AI coding rules
```

## Documentation

| Document | Path |
|----------|------|
| PRD | [docs/01-Product/PRD.md](docs/01-Product/PRD.md) |
| API Spec | [docs/03-Architecture/API.md](docs/03-Architecture/API.md) |
| Database Design | [docs/03-Architecture/DatabaseDesign.md](docs/03-Architecture/DatabaseDesign.md) |
| RBAC | [docs/03-Architecture/RBAC.md](docs/03-Architecture/RBAC.md) |
| Deployment | [docs/05-Development/Deployment.md](docs/05-Development/Deployment.md) |
| Roadmap | [docs/01-Product/Roadmap.md](docs/01-Product/Roadmap.md) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Sync and apply Supabase migrations |
| `npm run admin:create` | Create tenant admin user (service role required) |

## License

Proprietary — Dynex360
