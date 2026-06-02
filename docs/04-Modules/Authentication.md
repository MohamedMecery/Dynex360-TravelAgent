# Authentication Module

**Version:** 1.0 — MVP  
**Module ID:** AUTH

---

## Purpose

Provide secure user authentication and session management via Supabase Auth. All platform access requires a valid JWT with tenant_id and role claims.

## Business Processes

- User login with email/password
- Password reset via email
- Session management (persist, refresh, expire)
- Logout

See [BusinessFlows.md](../02-Business/BusinessFlows.md) — Section 6.

## User Stories

| ID | Story |
|----|-------|
| US-AUTH-001 | Login with email and password |
| US-AUTH-002 | Reset password via email |
| US-AUTH-003 | Session persistence across refreshes |
| US-AUTH-004 | Logout |
| US-AUTH-005 | Redirect on session expiry |
| US-AUTH-006 | Super Admin platform login |

## Business Rules

- Password minimum 8 characters (Supabase default)
- JWT includes custom claims: `tenant_id`, `role`
- Super Admin has `tenant_id = null` in JWT
- Failed login attempts logged (Supabase built-in)

## Database Tables

| Table | Usage |
|-------|-------|
| users | Profile synced from auth.users on signup |
| tenants | Tenant context for JWT claim |

Supabase `auth.users` is the source of truth for credentials.

## API Endpoints

Handled by Supabase Auth SDK (not custom REST):

| Action | Method | Supabase Method |
|--------|--------|-----------------|
| Login | POST | `signInWithPassword` |
| Logout | POST | `signOut` |
| Reset password | POST | `resetPasswordForEmail` |
| Update password | POST | `updateUser` |
| Get session | GET | `getSession` |

Custom endpoint for profile sync:

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auth/me | Returns current user profile + role |
| POST | /api/auth/sync | Syncs auth.users → public.users on first login |

## Permissions

All authenticated users can access auth endpoints. No RBAC restriction on login/logout.

## UI Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | /login | Email + password form |
| Forgot Password | /forgot-password | Email input for reset link |
| Reset Password | /reset-password | New password form (from email link) |

## Validation Rules

| Field | Rule |
|-------|------|
| email | Required, valid email format |
| password | Required, min 8 characters |

## Error Handling

| Error | Code | Message |
|-------|------|---------|
| Invalid credentials | 401 | Invalid email or password |
| Session expired | 401 | Your session has expired. Please log in again. |
| Email not confirmed | 403 | Please confirm your email before logging in |

## Security Rules

- HTTPS only
- JWT stored in httpOnly cookie or secure localStorage via Supabase client
- CSRF protection via Supabase SDK
- Rate limiting on login (Supabase built-in)
