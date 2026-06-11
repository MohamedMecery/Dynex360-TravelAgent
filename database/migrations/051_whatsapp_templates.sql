-- ============================================================================
-- TravelOS Migration 051_whatsapp_templates
-- Sprint 9B — WhatsApp template registry (Meta Cloud API, template-only)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE whatsapp_template_language AS ENUM ('en', 'ar');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE whatsapp_meta_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE whatsapp_provider AS ENUM ('meta_cloud', 'twilio');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenant_whatsapp_settings (
    tenant_id                   UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    whatsapp_enabled            BOOLEAN NOT NULL DEFAULT false,
    default_provider            whatsapp_provider NOT NULL DEFAULT 'meta_cloud',
    meta_phone_number_id        VARCHAR(64),
    meta_waba_id                VARCHAR(64),
    meta_access_token_secret    TEXT,
    webhook_verify_token        VARCHAR(128),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    internal_name           VARCHAR(100) NOT NULL,
    meta_template_name      VARCHAR(255) NOT NULL,
    language                whatsapp_template_language NOT NULL,
    category                VARCHAR(50) NOT NULL DEFAULT 'UTILITY',
    meta_status             whatsapp_meta_approval_status NOT NULL DEFAULT 'pending',
    body_preview            TEXT,
    variable_count          INT NOT NULL DEFAULT 0
        CHECK (variable_count >= 0 AND variable_count <= 10),
    event_type              VARCHAR(100),
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_whatsapp_templates_tenant_name_lang
        UNIQUE (tenant_id, internal_name, language)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_event
    ON whatsapp_templates(tenant_id, event_type, language)
    WHERE is_active = true AND meta_status = 'approved';

INSERT INTO tenant_whatsapp_settings (tenant_id)
SELECT t.id FROM tenants t
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE whatsapp_templates IS
    'Sprint 9B — tenant-scoped Meta template registry; only approved templates may send.';

COMMENT ON TABLE tenant_whatsapp_settings IS
    'Sprint 9B — per-tenant WhatsApp provider credentials (server-only writes).';
