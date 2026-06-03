# E2E CI Setup (GitHub Actions)

**Last updated:** 2026-06-03  
**Workflow:** `.github/workflows/e2e.yml` (push to `main`, `workflow_dispatch`)  
**Related:** [Testing.md](./Testing.md) · [Production-Deploy-Checklist.md](./Production-Deploy-Checklist.md)

---

## Important: separate Supabase for CI

Use a **dedicated Supabase project** for E2E CI — not your production pilot database.

| Project | Purpose |
|---------|---------|
| **E2E / CI** | GitHub Actions runs `db:push` + seed via `e2e:ci-prep` on every E2E run |
| **Pilot / Production** | Vercel app + real agency data ([Production-Deploy-Checklist.md](./Production-Deploy-Checklist.md)) |

Sharing one project causes seed/admin sync to overwrite or pollute pilot data.

---

## 1. Prepare the E2E Supabase project

| Step | Action |
|------|--------|
| 1 | Create a Supabase cloud project (e.g. `travelos-e2e`) |
| 2 | Locally, point `.env.local` at that project **or** use env vars only in GitHub |
| 3 | Apply migrations: `npm run db:push` (migrations **001–022**) |
| 4 | Enable **Custom Access Token** hook (migration `009`) in **Authentication → Hooks** |
| 5 | Choose a stable admin email/password for E2E (not a real user’s personal password in docs) |

---

## 2. GitHub repository secrets

**GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**

### Required

| Secret | Value |
|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key (legacy name; still supported) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **CI only**; never in Vercel `NEXT_PUBLIC_*` |
| `E2E_ADMIN_EMAIL` | Tenant admin email used by Playwright login |
| `E2E_ADMIN_PASSWORD` | Password for that admin |

`e2e:ci-prep` runs before tests: provisions admin (`create-admin-user.mjs`) and seeds demo data (`DEMO-BK-005`, knowledge docs).

### Optional

| Secret | Value | Effect |
|--------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key | Preferred over anon key when set |
| `ANTHROPIC_API_KEY` | Claude API key | Used when live AI tests run |
| `E2E_RUN_AI_API` | `1` | Enables live Knowledge/Booking/Support chat tests in `ai-agents.spec.ts` |

If `E2E_RUN_AI_API` is unset, AI chat API tests are skipped (UI smoke still runs).

---

## 3. Verify CI

1. Push to `main`, or run **Actions → E2E Tests → Run workflow**.
2. Job **e2e** should:
   - Install deps + Chromium
   - Run `globalSetup` → `npm run e2e:ci-prep` (migrations assumed already on project; prep syncs admin + seed)
   - Run `npm run test:e2e`
3. On failure: download artifact **playwright-report** from the workflow run.

---

## 4. Local parity with CI

```bash
cp e2e/.env.example .env.e2e.local
# Edit E2E_ADMIN_* to match admin:create on your E2E Supabase project

npm run db:push
npm run e2e:ci-prep    # same as CI globalSetup
npm run test:e2e
```

Single spec:

```bash
npm run test:e2e -- e2e/invoice-snapshot.spec.ts
```

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `DEMO-BK-005 not found` | Seed not run | `npm run e2e:ci-prep` or check `SUPABASE_SERVICE_ROLE_KEY` in CI |
| Login fails in `auth.setup` | Wrong `E2E_ADMIN_*` | Match secrets to `admin:create` tenant admin |
| `[e2e-ci-prep] Missing required environment` | Secret missing in GitHub | Add all required secrets (§2) |
| Invoice test fails on Issue | Migration **022** not applied | `npm run db:push` on E2E project |
| AI tests timeout | `E2E_RUN_AI_API=1` without `ANTHROPIC_API_KEY` | Add key or unset `E2E_RUN_AI_API` |

---

## Sign-off (CI ready)

| Check | Done |
|-------|:----:|
| Dedicated E2E Supabase project created | ☐ |
| Migrations 001–022 applied | ☐ |
| All required GitHub secrets set | ☐ |
| E2E workflow green on `main` | ☐ |
