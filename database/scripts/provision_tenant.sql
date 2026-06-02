-- ============================================================================
-- TravelOS: Provision First Tenant + Admin User
-- Run AFTER migrations 001-010 and AFTER creating the auth user in Supabase.
--
-- Steps:
--   1. Create user in Supabase Dashboard → Authentication → Users
--   2. Copy the user's UUID
--   3. Replace placeholders below and run in SQL Editor (service role)
-- ============================================================================

-- Replace these placeholders:
--   :auth_user_id  → UUID from auth.users
--   :admin_email   → admin email address

DO $$
DECLARE
    v_tenant_id  UUID := gen_random_uuid();
    v_user_id    UUID := '00000000-0000-0000-0000-000000000001'; -- auth.users.id from Dashboard
    v_email      TEXT := 'eng.m.mecery@gmail.com';
    v_role_id    UUID;
BEGIN
    -- 1. Create tenant
    INSERT INTO tenants (id, name, slug, status)
    VALUES (v_tenant_id, 'Demo Travel Agency', 'demo-agency', 'active');

    -- 2. Tenant settings
    INSERT INTO tenant_settings (tenant_id, default_currency, timezone, locale)
    VALUES (v_tenant_id, 'USD', 'UTC', 'en');

    -- 3. Link public.users profile (must match auth.users.id)
    INSERT INTO users (id, tenant_id, email, full_name, status)
    VALUES (v_user_id, v_tenant_id, v_email, 'Agency Admin', 'active')
    ON CONFLICT (id) DO UPDATE
        SET tenant_id = v_tenant_id, email = v_email, status = 'active';

    -- 4. Assign tenant_admin role
    SELECT id INTO v_role_id FROM roles WHERE name = 'tenant_admin';

    INSERT INTO user_roles (user_id, role_id, tenant_id)
    VALUES (v_user_id, v_role_id, v_tenant_id)
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role_id = v_role_id;

    RAISE NOTICE 'Tenant provisioned: % (slug: demo-agency)', v_tenant_id;
END $$;
