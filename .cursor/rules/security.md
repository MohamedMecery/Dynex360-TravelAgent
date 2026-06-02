# Security Standards

- Enforce RBAC at UI (Refine access control), API (middleware), and DB (RLS) layers
- JWT must include tenant_id and role claims
- Validate all user input with Zod before database operations
- Log all mutations via audit_logs trigger
- Never expose internal IDs in error messages to end users
- HTTPS only in production (enforced by Vercel)
- Rate limit AI agent endpoints (20 req/min per user)
