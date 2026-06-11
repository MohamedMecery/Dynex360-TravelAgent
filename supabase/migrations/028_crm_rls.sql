-- ============================================================================
-- TravelOS Migration 028_crm_rls
-- CRM owner-scoped RLS (not legacy tenant-only)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Permission helpers (SECURITY DEFINER — uses user_roles + permissions)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_crm_permission(p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin()
        OR EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            JOIN public.role_permissions rp ON rp.role_id = r.id
            JOIN public.permissions p ON p.id = rp.permission_id
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.current_tenant_id()
              AND p.module = 'crm'
              AND p.action = p_action
        );
$$;

CREATE OR REPLACE FUNCTION public.crm_can_read_row(
    p_owner_id UUID,
    p_read_all_action TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin()
        OR public.has_crm_permission(p_read_all_action)
        OR (p_owner_id IS NOT NULL AND p_owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.crm_can_write_row(
    p_owner_id UUID,
    p_write_action TEXT,
    p_write_all_action TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin()
        OR public.has_crm_permission(p_write_all_action)
        OR (
            public.has_crm_permission(p_write_action)
            AND p_owner_id IS NOT NULL
            AND p_owner_id = auth.uid()
        );
$$;

CREATE OR REPLACE FUNCTION public.crm_can_read_activity(p_assigned_to UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin()
        OR public.has_crm_permission('activities.read_all')
        OR (p_assigned_to IS NOT NULL AND p_assigned_to = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.crm_can_write_activity(p_assigned_to UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin()
        OR public.has_crm_permission('activities.write_all')
        OR (
            public.has_crm_permission('activities.write')
            AND p_assigned_to IS NOT NULL
            AND p_assigned_to = auth.uid()
        );
$$;

REVOKE ALL ON FUNCTION public.has_crm_permission(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_can_read_row(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_can_write_row(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_can_read_activity(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_can_write_activity(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_crm_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_read_row(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_write_row(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_read_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_write_activity(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- leads
-- ----------------------------------------------------------------------------
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_select ON leads
    FOR SELECT
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_read_row(owner_id, 'leads.read_all')
    );

CREATE POLICY leads_insert ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND (
            public.is_super_admin()
            OR public.has_crm_permission('leads.write')
            OR public.has_crm_permission('leads.write_all')
        )
    );

CREATE POLICY leads_update ON leads
    FOR UPDATE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_write_row(owner_id, 'leads.write', 'leads.write_all')
    )
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        OR public.is_super_admin()
    );

CREATE POLICY leads_delete ON leads
    FOR DELETE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_write_row(owner_id, 'leads.write', 'leads.write_all')
    );

-- ----------------------------------------------------------------------------
-- opportunities
-- ----------------------------------------------------------------------------
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY opportunities_select ON opportunities
    FOR SELECT
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_read_row(owner_id, 'opportunities.read_all')
    );

CREATE POLICY opportunities_insert ON opportunities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND (
            public.is_super_admin()
            OR public.has_crm_permission('opportunities.write')
            OR public.has_crm_permission('opportunities.write_all')
        )
    );

CREATE POLICY opportunities_update ON opportunities
    FOR UPDATE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_write_row(owner_id, 'opportunities.write', 'opportunities.write_all')
    )
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        OR public.is_super_admin()
    );

CREATE POLICY opportunities_delete ON opportunities
    FOR DELETE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_write_row(owner_id, 'opportunities.write', 'opportunities.write_all')
    );

-- ----------------------------------------------------------------------------
-- activities
-- ----------------------------------------------------------------------------
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY activities_select ON activities
    FOR SELECT
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_read_activity(assigned_to)
    );

CREATE POLICY activities_insert ON activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND (
            public.is_super_admin()
            OR public.has_crm_permission('activities.write')
            OR public.has_crm_permission('activities.write_all')
        )
    );

CREATE POLICY activities_update ON activities
    FOR UPDATE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_write_activity(assigned_to)
    )
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        OR public.is_super_admin()
    );

CREATE POLICY activities_delete ON activities
    FOR DELETE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_write_activity(assigned_to)
    );
