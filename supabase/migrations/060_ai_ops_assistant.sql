-- ============================================================================
-- TravelOS Migration 060_ai_ops_assistant
-- Sprint 9D-A — AI Operations Assistant core tables + dispatch job type
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE ai_ops_entity_type AS ENUM ('booking');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ai_ops_operational_status AS ENUM (
        'healthy',
        'attention_required',
        'at_risk',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE ai_agent_key ADD VALUE IF NOT EXISTS 'operations';

ALTER TYPE event_dispatch_job_type ADD VALUE IF NOT EXISTS 'dispatch.ai_ops_score';

CREATE TABLE IF NOT EXISTS ai_ops_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type             ai_ops_entity_type NOT NULL DEFAULT 'booking',
    entity_id               UUID NOT NULL,
    health_score            SMALLINT,
    risk_score              SMALLINT,
    readiness_score         SMALLINT,
    operational_status      ai_ops_operational_status,
    confidence              NUMERIC(4, 3) NOT NULL DEFAULT 0,
    risk_indicators         JSONB NOT NULL DEFAULT '[]',
    readiness_checklist     JSONB NOT NULL DEFAULT '[]',
    score_breakdown         JSONB NOT NULL DEFAULT '{}',
    rule_version            TEXT NOT NULL DEFAULT 'v1.0.0',
    inputs_hash             TEXT NOT NULL,
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_ops_snapshots_entity UNIQUE (tenant_id, entity_type, entity_id),
    CONSTRAINT chk_ai_ops_snapshots_health CHECK (
        health_score IS NULL OR (health_score >= 0 AND health_score <= 100)
    ),
    CONSTRAINT chk_ai_ops_snapshots_risk CHECK (
        risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)
    ),
    CONSTRAINT chk_ai_ops_snapshots_readiness CHECK (
        readiness_score IS NULL OR (readiness_score >= 0 AND readiness_score <= 100)
    ),
    CONSTRAINT chk_ai_ops_snapshots_confidence CHECK (
        confidence >= 0 AND confidence <= 1
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_ops_snapshots_tenant_status
    ON ai_ops_snapshots(tenant_id, operational_status, health_score ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_ai_ops_snapshots_tenant_computed
    ON ai_ops_snapshots(tenant_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS ai_ops_score_history (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id             UUID REFERENCES ai_ops_snapshots(id) ON DELETE SET NULL,
    entity_type             ai_ops_entity_type NOT NULL,
    entity_id               UUID NOT NULL,
    health_score            SMALLINT,
    risk_score              SMALLINT,
    readiness_score         SMALLINT,
    operational_status      ai_ops_operational_status,
    confidence              NUMERIC(4, 3) NOT NULL DEFAULT 0,
    risk_indicators         JSONB NOT NULL DEFAULT '[]',
    readiness_checklist     JSONB NOT NULL DEFAULT '[]',
    score_breakdown         JSONB NOT NULL DEFAULT '{}',
    rule_version            TEXT NOT NULL DEFAULT 'v1.0.0',
    inputs_hash             TEXT NOT NULL,
    trigger_event_id        UUID REFERENCES domain_events(id) ON DELETE SET NULL,
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_ops_score_history_entity
    ON ai_ops_score_history(tenant_id, entity_type, entity_id, computed_at DESC);

COMMENT ON TABLE ai_ops_snapshots IS
    'Sprint 9D — deterministic operations scores (L1). AI is not source of truth.';
