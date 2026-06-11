-- ============================================================================
-- TravelOS Migration 041_domain_events
-- Sprint 8C — Canonical domain events (Option B-lite)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE domain_actor_type AS ENUM ('staff', 'customer', 'system');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS domain_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type              VARCHAR(100) NOT NULL,
    aggregate_type          VARCHAR(50) NOT NULL,
    aggregate_id            UUID NOT NULL,
    customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
    actor_type              domain_actor_type NOT NULL DEFAULT 'system',
    actor_user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
    actor_portal_account_id UUID REFERENCES customer_portal_accounts(id) ON DELETE SET NULL,
    payload                 JSONB NOT NULL DEFAULT '{}',
    idempotency_key         VARCHAR(255) NOT NULL,
    occurred_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_domain_events_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_domain_events_tenant_occurred
    ON domain_events(tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_events_tenant_customer
    ON domain_events(tenant_id, customer_id, occurred_at DESC)
    WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_domain_events_tenant_type
    ON domain_events(tenant_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate
    ON domain_events(aggregate_type, aggregate_id);

-- Append-only: no UPDATE/DELETE for authenticated roles
REVOKE UPDATE, DELETE ON domain_events FROM authenticated, anon;

ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY domain_events_staff_select ON domain_events
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY domain_events_portal_select ON domain_events
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    );

-- Server-side emit (service role only)
CREATE OR REPLACE FUNCTION public.emit_domain_event(
    p_tenant_id UUID,
    p_event_type TEXT,
    p_aggregate_type TEXT,
    p_aggregate_id UUID,
    p_customer_id UUID,
    p_actor_type domain_actor_type,
    p_actor_user_id UUID,
    p_actor_customer_id UUID,
    p_actor_portal_account_id UUID,
    p_payload JSONB,
    p_idempotency_key TEXT,
    p_occurred_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.domain_events (
        tenant_id,
        event_type,
        aggregate_type,
        aggregate_id,
        customer_id,
        actor_type,
        actor_user_id,
        actor_customer_id,
        actor_portal_account_id,
        payload,
        idempotency_key,
        occurred_at
    )
    VALUES (
        p_tenant_id,
        p_event_type,
        p_aggregate_type,
        p_aggregate_id,
        p_customer_id,
        p_actor_type,
        p_actor_user_id,
        p_actor_customer_id,
        p_actor_portal_account_id,
        COALESCE(p_payload, '{}'::jsonb),
        p_idempotency_key,
        COALESCE(p_occurred_at, now())
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        SELECT id INTO v_id
        FROM public.domain_events
        WHERE idempotency_key = p_idempotency_key;
    END IF;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_domain_event(UUID, TEXT, TEXT, UUID, UUID, domain_actor_type, UUID, UUID, UUID, JSONB, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_domain_event(UUID, TEXT, TEXT, UUID, UUID, domain_actor_type, UUID, UUID, UUID, JSONB, TEXT, TIMESTAMPTZ) TO service_role;
