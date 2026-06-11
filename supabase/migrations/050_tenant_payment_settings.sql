-- ============================================================================
-- TravelOS Migration 050_tenant_payment_settings
-- Sprint 9A — Per-tenant payment configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_payment_settings (
    tenant_id                  UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    payments_enabled           BOOLEAN NOT NULL DEFAULT false,
    default_provider           payment_provider NOT NULL DEFAULT 'paymob',
    deposit_percent            DECIMAL(5,2) NOT NULL DEFAULT 30.00
        CHECK (deposit_percent > 0 AND deposit_percent <= 100),
    booking_automation_mode    booking_automation_mode NOT NULL DEFAULT 'auto_on_deposit',
    confirm_on_deposit         BOOLEAN NOT NULL DEFAULT false,
    paymob_integration_id      VARCHAR(100),
    paymob_iframe_id           VARCHAR(100),
    currency_default           VARCHAR(3) NOT NULL DEFAULT 'EGP',
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_payment_settings_staff_select ON tenant_payment_settings
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

REVOKE INSERT, UPDATE, DELETE ON tenant_payment_settings FROM authenticated, anon;

-- Seed settings row for existing tenants (disabled by default)
INSERT INTO tenant_payment_settings (tenant_id)
SELECT t.id FROM tenants t
ON CONFLICT (tenant_id) DO NOTHING;
