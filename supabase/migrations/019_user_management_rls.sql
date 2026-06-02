-- ============================================================================
-- TravelOS Migration 019_user_management_rls
-- Role-based RLS for users / user_roles + session revocation helper.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers (DB-backed role checks — do not trust JWT or user_metadata)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_user_admin()
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
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.auth_user_tenant_id()
              AND r.name = 'tenant_admin'
        );
$$;

REVOKE ALL ON FUNCTION public.auth_user_tenant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_tenant_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant_user_admin() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Revoke all Auth sessions for a user (service_role only via RPC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_auth_sessions_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role'
       AND current_user IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'revoke_auth_sessions_for_user requires service_role';
    END IF;

    DELETE FROM auth.sessions WHERE user_id = p_user_id;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'auth'
          AND table_name = 'refresh_tokens'
    ) THEN
        EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id = $1' USING p_user_id;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_auth_sessions_for_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_auth_sessions_for_user(UUID) TO service_role;

-- ----------------------------------------------------------------------------
-- users: replace blanket tenant_isolation policy
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_tenant_isolation ON public.users;

CREATE POLICY users_select ON public.users
    FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR id = auth.uid()
        OR tenant_id = public.current_tenant_id()
    );

CREATE POLICY users_insert ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.is_tenant_user_admin()
            AND tenant_id = public.auth_user_tenant_id()
            AND tenant_id = public.current_tenant_id()
        )
    );

CREATE POLICY users_update ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            public.is_tenant_user_admin()
            AND tenant_id = public.auth_user_tenant_id()
            AND tenant_id = public.current_tenant_id()
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.is_tenant_user_admin()
            AND tenant_id = public.auth_user_tenant_id()
            AND tenant_id = public.current_tenant_id()
        )
    );

CREATE POLICY users_delete ON public.users
    FOR DELETE
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            public.is_tenant_user_admin()
            AND tenant_id = public.auth_user_tenant_id()
            AND tenant_id = public.current_tenant_id()
        )
    );

-- ----------------------------------------------------------------------------
-- user_roles: replace blanket tenant_isolation policy
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS user_roles_tenant_isolation ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR tenant_id = public.current_tenant_id()
    );

CREATE POLICY user_roles_insert ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.is_tenant_user_admin()
            AND tenant_id = public.auth_user_tenant_id()
            AND tenant_id = public.current_tenant_id()
        )
    );

CREATE POLICY user_roles_update ON public.user_roles
    FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            public.is_tenant_user_admin()
            AND tenant_id = public.auth_user_tenant_id()
            AND tenant_id = public.current_tenant_id()
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.is_tenant_user_admin()
            AND tenant_id = public.auth_user_tenant_id()
            AND tenant_id = public.current_tenant_id()
        )
    );

CREATE POLICY user_roles_delete ON public.user_roles
    FOR DELETE
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            public.is_tenant_user_admin()
            AND tenant_id = public.auth_user_tenant_id()
            AND tenant_id = public.current_tenant_id()
        )
    );
