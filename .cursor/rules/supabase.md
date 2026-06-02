# Supabase & PostgreSQL Standards

- Migrations in database/migrations/ with sequential numbering
- All tenant tables must have tenant_id and RLS policies
- Use soft delete (deleted_at) — filter with .is('deleted_at', null)
- Triggers handle: updated_at, audit_logs, booking calculations, payment status
- Never use service role key in client-side code
- Test RLS policies with different role JWTs before deploying
