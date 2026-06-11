-- ============================================================================
-- TravelOS Migration 053_whatsapp_preferences
-- Sprint 9B — Customer communication preferences (WhatsApp opt-in, quiet hours)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_communication_preferences (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id             UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    preferred_language      whatsapp_template_language NOT NULL DEFAULT 'en',
    whatsapp_opt_in_at      TIMESTAMPTZ,
    whatsapp_opt_out_at     TIMESTAMPTZ,
    quiet_hours_start       TIME,
    quiet_hours_end         TIME,
    quiet_hours_timezone    VARCHAR(64) NOT NULL DEFAULT 'Africa/Cairo',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_customer_comm_prefs UNIQUE (tenant_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_comm_prefs_customer
    ON customer_communication_preferences(customer_id);

COMMENT ON TABLE customer_communication_preferences IS
    'Sprint 9B — per-customer channel preferences; portal and CRM may update own tenant rows.';
