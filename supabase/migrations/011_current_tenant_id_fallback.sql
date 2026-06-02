-- Fallback tenant (and role) from public.users when JWT app_metadata is missing
-- (e.g. custom access token hook not enabled or session issued before hook).

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid,
        NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid,
        (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
        NULLIF(auth.jwt() ->> 'user_role', ''),
        (
            SELECT r.name
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            LIMIT 1
        )
    );
$$;
