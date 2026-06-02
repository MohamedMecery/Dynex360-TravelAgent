-- ============================================================================
-- TravelOS Migration 006_rls_policies
-- Row Level Security: helper functions, RLS enablement, and policies.
--
-- JWT claims are expected under app_metadata (injected via a Supabase
-- custom access token hook): app_metadata.tenant_id, app_metadata.role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (read JWT claims)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
        NULLIF(auth.jwt() ->> 'tenant_id', '')
    )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
    SELECT COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
        NULLIF(auth.jwt() ->> 'user_role', '')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
    SELECT public.current_user_role() = 'super_admin';
$$;

-- ----------------------------------------------------------------------------
-- tenants: members see their own tenant; super_admin sees all
-- ----------------------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON tenants
    FOR SELECT USING (id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY tenants_modify ON tenants
    FOR ALL USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- Global reference tables: read for any authenticated user; write super_admin
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles', 'permissions', 'role_permissions', 'countries', 'cities'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

        EXECUTE format($f$
            CREATE POLICY %1$s_read ON %1$I
            FOR SELECT USING (auth.uid() IS NOT NULL);
        $f$, t);

        EXECUTE format($f$
            CREATE POLICY %1$s_admin_write ON %1$I
            FOR ALL USING (public.is_super_admin())
            WITH CHECK (public.is_super_admin());
        $f$, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Tenant-scoped tables: full isolation by tenant_id (or super_admin)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'tenant_settings', 'users', 'user_roles', 'destinations',
        'customers', 'customer_contacts', 'customer_addresses', 'travelers',
        'packages', 'package_days', 'package_day_activities',
        'package_pricing', 'package_media',
        'bookings', 'booking_items', 'booking_travelers',
        'booking_status_history', 'booking_notes', 'booking_documents',
        'invoices', 'payments', 'payment_transactions', 'notifications'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

        EXECUTE format($f$
            CREATE POLICY %1$s_tenant_isolation ON %1$I
            FOR ALL
            USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
            WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
        $f$, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- audit_logs: read within tenant; INSERT only; no UPDATE/DELETE
-- ----------------------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT WITH CHECK (true);
