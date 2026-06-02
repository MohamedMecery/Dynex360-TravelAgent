# WP-4B Validation — Password Recovery & Onboarding

## Automated checks

| Command | Expected |
|---------|----------|
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm run build` | Exit 0 |

## Manual QA matrix

### Scenario A — Forgot password → reset → login

| Step | Action | Expected |
|------|--------|----------|
| A1 | Open `/forgot-password`, enter active user email | Generic success message (no enumeration) |
| A2 | Open reset link from email (Inbucket/SMTP) | Lands on `/reset-password` with session |
| A3 | Set password (8+ chars, matching confirm) | Success → `/login?reason=password_reset` |
| A4 | Login with new password | Dashboard access |

### Scenario B — Expired reset link

| Step | Action | Expected |
|------|--------|----------|
| B1 | Use expired or second-use link | Redirect `/login?reason=link_expired` or invalid session on reset page |

### Scenario C — Invalid reset token

| Step | Action | Expected |
|------|--------|----------|
| C1 | Open `/reset-password` without session | “Invalid or expired” + link to forgot password |

### Scenario D — Pending invited user onboarding

| Step | Action | Expected |
|------|--------|----------|
| D1 | Tenant admin invites user | `pending` in users list; email or onboarding link shown |
| D2 | Open onboarding link | `/onboarding` with session |
| D3 | Set password + submit | `active` in DB; redirect login with success message |
| D4 | Login | Full tenant access per role |
| D5 | Before D3, try `/customers` | Blocked (RLS + middleware → onboarding or login) |

### Scenario E — Inactive user

| Step | Action | Expected |
|------|--------|----------|
| E1 | Deactivated user tries login | `auth.accountInactive` error |
| E2 | Inactive user completes forgot/reset | Password may update; login still blocked; status stays `inactive` |

### Scenario F — Session expiration

| Step | Action | Expected |
|------|--------|----------|
| F1 | Expire session (clear cookies or wait for JWT expiry + refresh failure) | Redirect `/login?reason=expired` |
| F2 | Message EN/AR | Exact copy per PRD (`auth.sessionExpired`) |

## Security verification (post-implementation)

| # | Control | Status |
|---|---------|--------|
| 1 | Reset token single-use (Supabase) | Relies on Supabase; second use → invalid |
| 2 | Expired links rejected | Callback + reset page |
| 3 | Pending cannot bypass onboarding | RLS + middleware + API |
| 4 | Inactive cannot activate via onboarding | API `ACCOUNT_INACTIVE` |
| 5 | JWT `account_status` vs DB | WP-4A + refresh on new login after activate |
| 6 | No email enumeration | Forgot always shows success |
| 7 | No privilege escalation | Activation only `pending` → `active`, no role change |
