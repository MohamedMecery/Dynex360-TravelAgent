-- ============================================================================
-- TravelOS Migration 061_ai_ops_recommendations
-- Sprint 9D-B — Operations next-best-action recommendations
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE ai_ops_recommendation_status AS ENUM (
        'open',
        'dismissed',
        'completed',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ai_ops_recommendation_priority AS ENUM (
        'critical',
        'high',
        'normal',
        'low'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ai_ops_recommendations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type             ai_ops_entity_type NOT NULL DEFAULT 'booking',
    entity_id               UUID NOT NULL,
    recommendation_code     TEXT NOT NULL,
    priority                ai_ops_recommendation_priority NOT NULL DEFAULT 'normal',
    title                   TEXT NOT NULL,
    description             TEXT NOT NULL,
    action_type             TEXT NOT NULL,
    action_payload          JSONB NOT NULL DEFAULT '{}',
    status                  ai_ops_recommendation_status NOT NULL DEFAULT 'open',
    source_event_id         UUID REFERENCES domain_events(id) ON DELETE SET NULL,
    expires_at              TIMESTAMPTZ,
    dismissed_at            TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    dismissed_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    rule_version            TEXT NOT NULL DEFAULT 'v1.0.0',
    idempotency_key         TEXT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_ops_recommendations_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_ops_recommendations_tenant_status
    ON ai_ops_recommendations(tenant_id, status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_ops_recommendations_entity
    ON ai_ops_recommendations(tenant_id, entity_type, entity_id, status);

CREATE TABLE IF NOT EXISTS ai_ops_recommendation_feedback (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recommendation_id       UUID NOT NULL REFERENCES ai_ops_recommendations(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action                  TEXT NOT NULL,
    reason                  TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_ops_recommendation_feedback_rec
    ON ai_ops_recommendation_feedback(recommendation_id, created_at DESC);
