-- ============================================================================
-- TravelOS Migration 005_supporting
-- Cross-cutting support tables
-- Tables: notifications, audit_logs
-- ============================================================================

CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- ----------------------------------------------------------------------------
-- notifications (Support) - in-app notifications per user
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    message     TEXT,
    entity_type VARCHAR(50),
    entity_id   UUID,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_tenant_id    ON notifications(tenant_id);
CREATE INDEX idx_notifications_user_id      ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread  ON notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- audit_logs (Audit) - append-only change trail
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action     audit_action NOT NULL,
    table_name VARCHAR(63) NOT NULL,
    record_id  UUID,
    old_data   JSONB,
    new_data   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_id  ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_record     ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
