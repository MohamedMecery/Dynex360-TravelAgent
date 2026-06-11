-- ============================================================================
-- TravelOS Migration 052_whatsapp_messages
-- Sprint 9B — Outbound WhatsApp message log (template-only, no inbound chat)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE whatsapp_message_status AS ENUM (
        'pending',
        'sent',
        'delivered',
        'read',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE whatsapp_message_direction AS ENUM ('outbound');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id                 UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    domain_event_id             UUID REFERENCES domain_events(id) ON DELETE SET NULL,
    notification_delivery_id    UUID,
    template_id                 UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    direction                   whatsapp_message_direction NOT NULL DEFAULT 'outbound',
    to_phone_e164               VARCHAR(20) NOT NULL,
    template_name               VARCHAR(255) NOT NULL,
    language                    whatsapp_template_language NOT NULL,
    template_variables          JSONB NOT NULL DEFAULT '[]'::jsonb,
    provider                    whatsapp_provider NOT NULL DEFAULT 'meta_cloud',
    provider_message_id         TEXT,
    status                      whatsapp_message_status NOT NULL DEFAULT 'pending',
    error_message               TEXT,
    quotation_id                UUID REFERENCES quotations(id) ON DELETE SET NULL,
    booking_id                  UUID REFERENCES bookings(id) ON DELETE SET NULL,
    initiated_by_user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_at                     TIMESTAMPTZ,
    delivered_at                TIMESTAMPTZ,
    read_at                     TIMESTAMPTZ,
    failed_at                   TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer
    ON whatsapp_messages(tenant_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_quotation
    ON whatsapp_messages(quotation_id, created_at DESC)
    WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_booking
    ON whatsapp_messages(booking_id, created_at DESC)
    WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_provider_id
    ON whatsapp_messages(tenant_id, provider_message_id)
    WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_domain_event
    ON whatsapp_messages(domain_event_id)
    WHERE domain_event_id IS NOT NULL;

COMMENT ON TABLE whatsapp_messages IS
    'Sprint 9B — outbound template message audit trail; status updated via Meta webhooks.';
