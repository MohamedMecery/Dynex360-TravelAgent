-- ============================================================================
-- TravelOS Migration 048_payment_gateway_rls
-- Sprint 9A — Gateway RLS (portal read own; staff read tenant)
-- ============================================================================

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_provider_events ENABLE ROW LEVEL SECURITY;

-- Portal: read own payment orders
CREATE POLICY payment_orders_portal_select ON payment_orders
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    );

CREATE POLICY payment_attempts_portal_select ON payment_attempts
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND tenant_id = public.portal_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.payment_orders po
            WHERE po.id = payment_attempts.payment_order_id
              AND po.customer_id = public.portal_customer_id()
        )
    );

-- Staff: read tenant payment orders and attempts
CREATE POLICY payment_orders_staff_select ON payment_orders
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY payment_attempts_staff_select ON payment_attempts
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

-- No client INSERT/UPDATE/DELETE on gateway tables (API service role only)
REVOKE INSERT, UPDATE, DELETE ON payment_orders FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON payment_attempts FROM authenticated, anon;
REVOKE ALL ON payment_provider_events FROM authenticated, anon;
