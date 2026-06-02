# TravelOS Deployment Guide

**Version:** 1.0 — MVP

---

## Prerequisites

- Node.js 20+
- Supabase account (free tier sufficient for MVP)
- Vercel account
- GitHub repository

---

## Environment Setup

### 1. Supabase Project

1. Create project at [supabase.com](https://supabase.com)
2. Link and apply migrations:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npm run db:push
   ```
   Or apply manually in SQL Editor (in order):
   - `database/migrations/001_core.sql` through `010_seed_geography.sql`

3. Enable the **Custom Access Token** hook:
   - Dashboard → Authentication → Hooks → Custom Access Token
   - Postgres function: `public.custom_access_token_hook`

4. Bootstrap your first tenant:
   - Run `npm run admin:create` (creates auth user + tenant), **or**
   - Create an auth user in Dashboard → Authentication → Users and run `database/scripts/provision_tenant.sql`

5. (Optional) Load demo business data for KPI and workflow testing:
   ```bash
   npm run db:seed
   ```
   See [SeedData.md](./SeedData.md).

6. Copy project URL and anon key

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Vercel Deployment

### Initial Setup

1. Push repository to GitHub
2. Import project in Vercel dashboard
3. Set environment variables (same as `.env.local`)
4. Deploy

### Automatic Deployments

- **Production:** merge to `main` branch
- **Preview:** every pull request

GitHub Actions CI must pass before merge (see `.github/workflows/ci.yml`).

---

## Branch Strategy

| Branch | Purpose | Deploys To |
|--------|---------|-----------|
| main | Production-ready code | Production |
| develop | Integration branch | Staging |
| feature/* | Feature development | Preview |
| fix/* | Bug fixes | Preview |

---

## Database Migrations

Always apply migrations to staging before production:

```bash
# Staging
npx supabase link --project-ref STAGING_REF
npx supabase db push

# Production (after verification)
npx supabase link --project-ref PRODUCTION_REF
npx supabase db push
```

---

## Monitoring (MVP)

| Service | Purpose |
|---------|---------|
| Vercel Analytics | Page views, Web Vitals |
| Supabase Dashboard | Database metrics, auth logs |
| GitHub Actions | CI/CD status |

POST-MVP: Sentry for error tracking, Datadog for APM.

---

## Backup Strategy

- Supabase automated daily backups (included in all plans)
- Point-in-time recovery available on Pro plan
- Export schema via `pg_dump` for offline backup

---

## Rollback Procedure

1. Revert commit on `main`
2. Vercel auto-deploys previous version
3. If migration issue: restore Supabase backup via dashboard

---

## Health Checks

- Frontend: Vercel deployment status
- Database: Supabase project health dashboard
- API: `GET /api/auth/me` returns 401 when unauthenticated (expected)
