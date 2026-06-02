# TravelOS Coding Standards

**Version:** 1.0 — MVP

---

## Language & Framework

- **TypeScript** strict mode, no `any`
- **Next.js 15** App Router
- **Refine 4** for admin CRUD
- **Tailwind CSS** for styling
- **Supabase** for backend

## File Organization

```
src/app/{module}/page.tsx          # List
src/app/{module}/create/page.tsx   # Create
src/app/{module}/edit/[id]/page.tsx # Edit
src/app/{module}/show/[id]/page.tsx # Show
src/components/ui/                  # Reusable UI primitives
src/components/layout/              # App shell
src/providers/                      # Refine configuration
src/lib/                            # Utilities and clients
src/types/                          # TypeScript interfaces
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `auth-provider.ts` |
| Components | PascalCase | `CustomerListPage` |
| Functions | camelCase | `formatCurrency` |
| Constants | UPPER_SNAKE | `ROLE_PERMISSIONS` |
| DB tables | snake_case | `booking_items` |
| API routes | kebab-case | `/api/booking-agent` |

## Git Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Branch naming: `feature/module-name`, `fix/issue-description`
- PR required for merge to main

## Code Quality

- ESLint + Next.js config
- TypeScript strict checks in CI
- No console.log in production code (use structured logging POST-MVP)
- Components under 200 lines; extract if larger

## Database

- All schema changes via migrations
- Reference DDL in `database/schema/` for documentation
- Apply migrations in order: 001 → 004

## Documentation

- Update module spec when changing API behavior
- Update API.md when adding endpoints
- Tag POST-MVP features clearly
