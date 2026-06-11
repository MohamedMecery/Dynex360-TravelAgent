-- ============================================================================
-- TravelOS Migration 046_scheduled_automations_framework
-- Sprint 8D — Scheduled automation framework (templates only, no workflows)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE scheduled_automation_run_status AS ENUM (
        'pending',
        'running',
        'completed',
        'failed',
        'skipped'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS scheduled_automation_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key    VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_automation_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_key    VARCHAR(100) NOT NULL REFERENCES scheduled_automation_templates(template_key),
    status          scheduled_automation_run_status NOT NULL DEFAULT 'pending',
    scheduled_for   TIMESTAMPTZ NOT NULL,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    last_error      TEXT,
    payload         JSONB NOT NULL DEFAULT '{}',
    idempotency_key VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_scheduled_automation_runs_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_automation_runs_tenant
    ON scheduled_automation_runs(tenant_id, status, scheduled_for DESC);

INSERT INTO scheduled_automation_templates (template_key, description, is_active)
VALUES
    ('quotation.expiring_soon', 'Framework placeholder — quotation expiry reminder', false),
    ('booking.departure_reminder', 'Framework placeholder — pre-departure reminder', false),
    ('booking.return_reminder', 'Framework placeholder — post-return follow-up', false),
    ('customer.follow_up_due', 'Framework placeholder — customer follow-up due', false)
ON CONFLICT (template_key) DO NOTHING;

ALTER TABLE scheduled_automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_automation_templates_staff_read ON scheduled_automation_templates
    FOR SELECT TO authenticated
    USING (public.is_crm_staff_user());

CREATE POLICY scheduled_automation_runs_staff_read ON scheduled_automation_runs
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

REVOKE INSERT, UPDATE, DELETE ON scheduled_automation_templates FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON scheduled_automation_runs FROM authenticated, anon;

COMMENT ON TABLE scheduled_automation_templates IS
    'Sprint 8D — automation template registry (inactive until future sprint enables workflows).';
