-- ============================================================================
-- TravelOS Migration 065_fix_access_token_hook
-- Fix: custom_access_token_hook raised "could not determine polymorphic type"
-- at runtime because to_jsonb() was called with untyped string literals
-- ('staff' / 'customer'), which made EVERY login fail with HTTP 500 once the
-- 039 version of the hook was active. Literals are now cast to text.
-- Also restores the staff account_status claim (injected by the 020 hook,
-- dropped unintentionally in 039) used by the JWT/DB consistency check in
-- src/lib/auth/validate-active-account.ts.
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
    user_status     text;
    portal_customer uuid;
    portal_status   text;
BEGIN
    original_claims := event->'claims';
    new_claims      := original_claims;

    -- Staff role (CRM users)
    SELECT r.name, ur.tenant_id, u.status::text
    INTO user_role, user_tenant, user_status
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id = (event->>'user_id')::uuid
    LIMIT 1;

    IF user_tenant IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,tenant_id}',
            to_jsonb(user_tenant::text),
            true
        );
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,user_type}',
            to_jsonb('staff'::text),
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

    IF user_status IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,account_status}',
            to_jsonb(user_status),
            true
        );
    END IF;

    -- Portal customer (only when not staff) — inject customer_id only, NOT tenant_id,
    -- so existing tenant_isolation policies do not grant full tenant access.
    IF user_role IS NULL THEN
        SELECT pa.customer_id, pa.status::text
        INTO portal_customer, portal_status
        FROM public.customer_portal_accounts pa
        WHERE pa.auth_user_id = (event->>'user_id')::uuid
        LIMIT 1;

        IF portal_customer IS NOT NULL THEN
            new_claims := jsonb_set(
                new_claims,
                '{app_metadata,customer_id}',
                to_jsonb(portal_customer::text),
                true
            );
            new_claims := jsonb_set(
                new_claims,
                '{app_metadata,user_type}',
                to_jsonb('customer'::text),
                true
            );
            new_claims := jsonb_set(
                new_claims,
                '{app_metadata,portal_status}',
                to_jsonb(portal_status),
                true
            );
        END IF;
    END IF;

    RETURN jsonb_set(event, '{claims}', new_claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
