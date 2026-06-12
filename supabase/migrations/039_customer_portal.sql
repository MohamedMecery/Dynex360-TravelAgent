-- ============================================================================
-- TravelOS Migration 039_customer_portal
-- Sprint 8A — Customer Portal Foundation
-- Portal identity, JWT hook extension, read-only RLS for customers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Portal account status
-- ----------------------------------------------------------------------------
CREATE TYPE portal_account_status AS ENUM ('active', 'inactive');

-- ----------------------------------------------------------------------------
-- customer_portal_accounts — links auth.users to customers (separate from staff)
-- ----------------------------------------------------------------------------
CREATE TABLE customer_portal_accounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE,
    customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL,
    status       portal_account_status NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_portal_accounts_tenant_email
        UNIQUE (tenant_id, email),
    CONSTRAINT uq_portal_accounts_customer
        UNIQUE (customer_id)
);

CREATE INDEX idx_portal_accounts_auth_user ON customer_portal_accounts(auth_user_id);
CREATE INDEX idx_portal_accounts_tenant    ON customer_portal_accounts(tenant_id);
CREATE INDEX idx_portal_accounts_customer  ON customer_portal_accounts(customer_id);

-- ----------------------------------------------------------------------------
-- Portal JWT / RLS helper functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_crm_staff_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_portal_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.customer_portal_accounts pa
        WHERE pa.auth_user_id = auth.uid()
          AND pa.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.portal_customer_id()
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT pa.customer_id
    FROM public.customer_portal_accounts pa
    WHERE pa.auth_user_id = auth.uid()
      AND pa.status = 'active'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.portal_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT pa.tenant_id
    FROM public.customer_portal_accounts pa
    WHERE pa.auth_user_id = auth.uid()
      AND pa.status = 'active'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.portal_visible_quotation_statuses()
RETURNS quotation_status[]
LANGUAGE sql IMMUTABLE
AS $$
    SELECT ARRAY[
        'sent'::quotation_status,
        'viewed'::quotation_status,
        'accepted'::quotation_status,
        'rejected'::quotation_status,
        'expired'::quotation_status,
        'converted_to_booking'::quotation_status
    ];
$$;

GRANT EXECUTE ON FUNCTION public.is_crm_staff_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_tenant_id() TO authenticated;

-- ----------------------------------------------------------------------------
-- Extend custom_access_token_hook for portal users (no staff role injection)
-- ----------------------------------------------------------------------------
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
    portal_customer uuid;
    portal_status   text;
BEGIN
    original_claims := event->'claims';
    new_claims      := original_claims;

    -- Staff role (CRM users)
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

-- ----------------------------------------------------------------------------
-- customer_portal_accounts RLS
-- ----------------------------------------------------------------------------
ALTER TABLE customer_portal_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_accounts_select_own ON customer_portal_accounts
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY portal_accounts_staff_all ON customer_portal_accounts
    FOR ALL TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
    )
    WITH CHECK (
        public.is_crm_staff_user()
        AND (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
    );

-- ----------------------------------------------------------------------------
-- Portal read policies (OR'd with existing staff policies)
-- ----------------------------------------------------------------------------
CREATE POLICY customers_portal_select ON customers
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
        AND deleted_at IS NULL
    );

CREATE POLICY quotations_portal_select ON quotations
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
        AND deleted_at IS NULL
        AND status = ANY(public.portal_visible_quotation_statuses())
    );

CREATE POLICY quotation_items_portal_select ON quotation_items
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND tenant_id = public.portal_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.quotations q
            WHERE q.id = quotation_items.quotation_id
              AND q.customer_id = public.portal_customer_id()
              AND q.deleted_at IS NULL
              AND q.status = ANY(public.portal_visible_quotation_statuses())
        )
    );

CREATE POLICY bookings_portal_select ON bookings
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
        AND deleted_at IS NULL
    );

CREATE POLICY booking_items_portal_select ON booking_items
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND tenant_id = public.portal_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.bookings b
            WHERE b.id = booking_items.booking_id
              AND b.customer_id = public.portal_customer_id()
              AND b.deleted_at IS NULL
        )
    );

CREATE POLICY booking_travelers_portal_select ON booking_travelers
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND tenant_id = public.portal_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.bookings b
            WHERE b.id = booking_travelers.booking_id
              AND b.customer_id = public.portal_customer_id()
              AND b.deleted_at IS NULL
        )
    );

CREATE POLICY booking_status_history_portal_select ON booking_status_history
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND tenant_id = public.portal_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.bookings b
            WHERE b.id = booking_status_history.booking_id
              AND b.customer_id = public.portal_customer_id()
              AND b.deleted_at IS NULL
        )
    );

CREATE POLICY travelers_portal_select ON travelers
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND tenant_id = public.portal_tenant_id()
        AND (
            customer_id = public.portal_customer_id()
            OR EXISTS (
                SELECT 1
                FROM public.booking_travelers bt
                JOIN public.bookings b ON b.id = bt.booking_id
                WHERE bt.traveler_id = travelers.id
                  AND b.customer_id = public.portal_customer_id()
                  AND b.deleted_at IS NULL
            )
        )
    );

CREATE POLICY packages_portal_select ON packages
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND tenant_id = public.portal_tenant_id()
        AND (
            EXISTS (
                SELECT 1
                FROM public.bookings b
                WHERE b.package_id = packages.id
                  AND b.customer_id = public.portal_customer_id()
                  AND b.deleted_at IS NULL
            )
            OR EXISTS (
                SELECT 1
                FROM public.quotation_items qi
                JOIN public.quotations q ON q.id = qi.quotation_id
                WHERE qi.package_id = packages.id
                  AND q.customer_id = public.portal_customer_id()
                  AND q.deleted_at IS NULL
                  AND q.status = ANY(public.portal_visible_quotation_statuses())
            )
        )
    );

CREATE POLICY destinations_portal_select ON destinations
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND EXISTS (
            SELECT 1
            FROM public.packages p
            WHERE p.destination_id = destinations.id
              AND p.tenant_id = public.portal_tenant_id()
        )
    );

-- ----------------------------------------------------------------------------
-- Staff-only provisioning helper (service role / migration scripts)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_customer_portal_account(
    p_auth_user_id UUID,
    p_customer_id UUID,
    p_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_account_id UUID;
BEGIN
    SELECT c.tenant_id INTO v_tenant_id
    FROM public.customers c
    WHERE c.id = p_customer_id
      AND c.deleted_at IS NULL;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Customer not found or deleted';
    END IF;

    INSERT INTO public.customer_portal_accounts (
        auth_user_id, customer_id, tenant_id, email
    )
    VALUES (p_auth_user_id, p_customer_id, v_tenant_id, lower(trim(p_email)))
    ON CONFLICT (customer_id) DO UPDATE
        SET auth_user_id = EXCLUDED.auth_user_id,
            email = EXCLUDED.email,
            status = 'active',
            updated_at = now()
    RETURNING id INTO v_account_id;

    RETURN v_account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_customer_portal_account(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_customer_portal_account(UUID, UUID, TEXT) TO service_role;
