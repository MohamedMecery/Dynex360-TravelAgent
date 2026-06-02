# Database Context

PostgreSQL + Supabase schema for TravelOS MVP (v2.1 expanded).

## Schema Files (reference DDL)

| File | Tables |
|------|--------|
| database/schema/tenants.sql | tenants, tenant_settings, users, roles, permissions, role_permissions, user_roles |
| database/schema/geography.sql | countries, cities, destinations |
| database/schema/customers.sql | customers, customer_contacts, customer_addresses |
| database/schema/travelers.sql | travelers |
| database/schema/packages.sql | packages, package_days, package_day_activities, package_pricing, package_media |
| database/schema/bookings.sql | bookings, booking_items, booking_travelers, booking_status_history, booking_notes, booking_documents |
| database/schema/invoices.sql | invoices |
| database/schema/payments.sql | payments, payment_transactions |
| database/schema/audit.sql | audit_logs, notifications |

**Total:** 30 tables

## Migrations (apply in order)

| # | File | Purpose |
|---|------|---------|
| 001 | 001_core.sql | Tenancy + users + RBAC |
| 002 | 002_master_data.sql | Countries, cities, destinations |
| 003 | 003_customers_packages.sql | Customers, travelers, packages |
| 004 | 004_bookings_finance.sql | Bookings, invoices, payments |
| 005 | 005_supporting.sql | Notifications, audit_logs |
| 006 | 006_rls_policies.sql | RLS helper functions + policies |
| 007 | 007_functions_triggers.sql | Business triggers |
| 008 | 008_seed_reference.sql | Roles + permissions seed |
| 009 | 009_auth_hook.sql | JWT custom access token hook |
| 010 | 010_seed_geography.sql | Countries + cities seed |

Canonical source: `database/migrations/`  
Supabase CLI mirror: `supabase/migrations/` (run `npm run db:sync` after editing canonical files)

## Bootstrap

1. Apply migrations 001–010
2. Enable auth hook: Authentication → Hooks → Custom Access Token → `public.custom_access_token_hook`
3. Create auth user in Supabase Dashboard
4. Run `database/scripts/provision_tenant.sql` (replace user UUID + email)

## Documentation

- docs/03-Architecture/DomainModel.md
- docs/03-Architecture/ERD.md
- docs/03-Architecture/DatabaseDesign.md
- docs/03-Architecture/RBAC.md

## Design Principles

- UUID primary keys
- tenant_id on all tenant-scoped tables
- Soft delete (deleted_at) on business entities
- Audit columns (created_by, updated_by, created_at, updated_at)
- Row Level Security for tenant isolation
- JWT claims: app_metadata.tenant_id, app_metadata.role (via auth hook)
