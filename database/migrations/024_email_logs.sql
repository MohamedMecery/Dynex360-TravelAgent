-- ============================================================================
-- TravelOS Migration 024_email_logs
-- Transactional email delivery audit trail (EmailService only)
-- ============================================================================

CREATE TYPE email_delivery_status AS ENUM ('sent', 'failed', 'skipped');

CREATE TABLE email_delivery_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email_type    VARCHAR(50) NOT NULL,
    recipient     VARCHAR(255) NOT NULL,
    status        email_delivery_status NOT NULL,
    error_message TEXT,
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_delivery_logs_tenant_id
    ON email_delivery_logs(tenant_id);

CREATE INDEX idx_email_delivery_logs_tenant_sent
    ON email_delivery_logs(tenant_id, sent_at DESC);

CREATE INDEX idx_email_delivery_logs_type
    ON email_delivery_logs(tenant_id, email_type);

ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_delivery_logs_tenant_isolation ON email_delivery_logs
    FOR ALL
    TO authenticated
    USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
