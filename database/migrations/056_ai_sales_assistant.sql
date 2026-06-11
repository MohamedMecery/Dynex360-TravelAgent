-- ============================================================================
-- TravelOS Migration 056_ai_sales_assistant
-- Sprint 9C-A — AI Sales Assistant core tables + dispatch job type
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE ai_sales_entity_type AS ENUM ('lead', 'opportunity', 'customer');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ai_sales_priority_tier AS ENUM ('hot', 'warm', 'cold');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE ai_agent_key ADD VALUE IF NOT EXISTS 'sales';

ALTER TYPE event_dispatch_job_type ADD VALUE IF NOT EXISTS 'dispatch.ai_score';

-- ----------------------------------------------------------------------------
-- ai_sales_snapshots — latest deterministic scores per entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_sales_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type         ai_sales_entity_type NOT NULL,
    entity_id           UUID NOT NULL,
    health_score        SMALLINT,
    priority_score      SMALLINT,
    win_probability     SMALLINT,
    priority_tier       ai_sales_priority_tier,
    confidence          NUMERIC(4, 3) NOT NULL DEFAULT 0,
    risk_indicators     JSONB NOT NULL DEFAULT '[]',
    score_breakdown     JSONB NOT NULL DEFAULT '{}',
    rule_version        TEXT NOT NULL DEFAULT 'v1.0.0',
    inputs_hash         TEXT NOT NULL,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_sales_snapshots_entity UNIQUE (tenant_id, entity_type, entity_id),
    CONSTRAINT chk_ai_sales_snapshots_health CHECK (
        health_score IS NULL OR (health_score >= 0 AND health_score <= 100)
    ),
    CONSTRAINT chk_ai_sales_snapshots_priority CHECK (
        priority_score IS NULL OR (priority_score >= 0 AND priority_score <= 100)
    ),
    CONSTRAINT chk_ai_sales_snapshots_win_prob CHECK (
        win_probability IS NULL OR (win_probability >= 0 AND win_probability <= 100)
    ),
    CONSTRAINT chk_ai_sales_snapshots_confidence CHECK (
        confidence >= 0 AND confidence <= 1
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_sales_snapshots_tenant_tier
    ON ai_sales_snapshots(tenant_id, priority_tier, priority_score DESC NULLS LAST)
    WHERE entity_type = 'lead';

CREATE INDEX IF NOT EXISTS idx_ai_sales_snapshots_tenant_health
    ON ai_sales_snapshots(tenant_id, health_score ASC NULLS LAST)
    WHERE entity_type = 'opportunity';

CREATE INDEX IF NOT EXISTS idx_ai_sales_snapshots_tenant_computed
    ON ai_sales_snapshots(tenant_id, computed_at DESC);

-- ----------------------------------------------------------------------------
-- ai_sales_score_history — append-only audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_sales_score_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_id         UUID REFERENCES ai_sales_snapshots(id) ON DELETE SET NULL,
    entity_type         ai_sales_entity_type NOT NULL,
    entity_id           UUID NOT NULL,
    health_score        SMALLINT,
    priority_score      SMALLINT,
    win_probability     SMALLINT,
    priority_tier       ai_sales_priority_tier,
    confidence          NUMERIC(4, 3) NOT NULL DEFAULT 0,
    risk_indicators     JSONB NOT NULL DEFAULT '[]',
    score_breakdown     JSONB NOT NULL DEFAULT '{}',
    rule_version        TEXT NOT NULL DEFAULT 'v1.0.0',
    inputs_hash         TEXT NOT NULL,
    trigger_event_id    UUID REFERENCES domain_events(id) ON DELETE SET NULL,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_sales_score_history_entity
    ON ai_sales_score_history(tenant_id, entity_type, entity_id, computed_at DESC);

COMMENT ON TABLE ai_sales_snapshots IS
    'Sprint 9C — deterministic sales scores (L1). AI is not source of truth.';

COMMENT ON TABLE ai_sales_score_history IS
    'Sprint 9C — append-only score audit for reproducibility.';
