-- ============================================================================
-- TravelOS Migration 009_auth_hook
-- Custom Access Token Hook: inject tenant_id + role into JWT app_metadata.
--
-- After applying this migration, enable the hook in Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token → Postgres function
--   Function: public.custom_access_token_hook
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    original_claims jsonb;
    new_claims      jsonb;
    user_role       text;
    user_tenant     uuid;
BEGIN
    original_claims := event->'claims';
    new_claims      := original_claims;

    SELECT r.name, ur.tenant_id
    INTO user_role, user_tenant
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (event->>'user_id')::uuid
    LIMIT 1;

    IF user_tenant IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,tenant_id}',
            to_jsonb(user_tenant::text),
            true
        );
    END IF;

    IF user_role IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,role}',
            to_jsonb(user_role),
            true
        );
    END IF;

    RETURN jsonb_set(event, '{claims}', new_claims);
END;
$$;

-- Required grants for Supabase Auth to invoke the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;
GRANT SELECT ON TABLE public.roles TO supabase_auth_admin;
