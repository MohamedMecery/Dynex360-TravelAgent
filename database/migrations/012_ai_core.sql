-- ============================================================================
-- TravelOS Migration 012_ai_core
-- AI platform core tables: agents, sessions, conversations, messages, logs, feedback
-- ============================================================================

CREATE TYPE ai_agent_key AS ENUM ('knowledge', 'booking', 'support');
CREATE TYPE ai_message_role AS ENUM ('user', 'assistant', 'system', 'tool');
CREATE TYPE ai_feedback_rating AS ENUM ('helpful', 'not_helpful');

-- ----------------------------------------------------------------------------
-- ai_agents — per-tenant agent enablement and config
-- ----------------------------------------------------------------------------
CREATE TABLE ai_agents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_key   ai_agent_key NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT true,
    config      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_agents_tenant_key UNIQUE (tenant_id, agent_key)
);

CREATE INDEX idx_ai_agents_tenant_id ON ai_agents(tenant_id);

-- ----------------------------------------------------------------------------
-- ai_sessions — browser / device session binding
-- ----------------------------------------------------------------------------
CREATE TABLE ai_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_key  TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_sessions_tenant_id ON ai_sessions(tenant_id);
CREATE INDEX idx_ai_sessions_user_id   ON ai_sessions(user_id);

-- ----------------------------------------------------------------------------
-- ai_conversations — conversation thread header
-- ----------------------------------------------------------------------------
CREATE TABLE ai_conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES ai_sessions(id) ON DELETE SET NULL,
    agent_key   ai_agent_key NOT NULL,
    title       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_tenant_id ON ai_conversations(tenant_id);
CREATE INDEX idx_ai_conversations_user_id   ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_session   ON ai_conversations(session_id);

-- ----------------------------------------------------------------------------
-- ai_messages — user / assistant / tool payloads
-- ----------------------------------------------------------------------------
CREATE TABLE ai_messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role             ai_message_role NOT NULL,
    content          TEXT NOT NULL,
    metadata         JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_tenant_id       ON ai_messages(tenant_id);
CREATE INDEX idx_ai_messages_created_at      ON ai_messages(conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- ai_logs — tool calls, retrieval, latency, errors (audit)
-- ----------------------------------------------------------------------------
CREATE TABLE ai_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id  UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type       TEXT NOT NULL,
    payload          JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_logs_tenant_id       ON ai_logs(tenant_id);
CREATE INDEX idx_ai_logs_conversation_id ON ai_logs(conversation_id);
CREATE INDEX idx_ai_logs_created_at      ON ai_logs(tenant_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- ai_feedback — thumbs up/down on assistant messages
-- ----------------------------------------------------------------------------
CREATE TABLE ai_feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_id  UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      ai_feedback_rating NOT NULL,
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_feedback_user_message UNIQUE (user_id, message_id)
);

CREATE INDEX idx_ai_feedback_message_id ON ai_feedback(message_id);
CREATE INDEX idx_ai_feedback_tenant_id  ON ai_feedback(tenant_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_ai_agents_updated_at
    BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ai_sessions_updated_at
    BEFORE UPDATE ON ai_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
