-- ============================================================================
-- TravelOS Migration 045_event_dispatch_jobs
-- Sprint 8D — PostgreSQL-native async dispatch queue (Option B-lite)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE event_dispatch_job_type AS ENUM ('dispatch.notification', 'dispatch.email');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE event_dispatch_job_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'dead_letter'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS event_dispatch_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain_event_id     UUID NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
    job_type            event_dispatch_job_type NOT NULL,
    status              event_dispatch_job_status NOT NULL DEFAULT 'pending',
    idempotency_key     VARCHAR(255) NOT NULL,
    retry_count         INT NOT NULL DEFAULT 0,
    max_retries         INT NOT NULL DEFAULT 5,
    last_error          TEXT,
    next_run_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at           TIMESTAMPTZ,
    locked_by           TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_event_dispatch_jobs_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_event_dispatch_jobs_poll
    ON event_dispatch_jobs(status, next_run_at, created_at)
    WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_event_dispatch_jobs_tenant
    ON event_dispatch_jobs(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_dispatch_jobs_event
    ON event_dispatch_jobs(domain_event_id);

-- Append-only for clients; worker uses SECURITY DEFINER RPCs
REVOKE INSERT, UPDATE, DELETE ON event_dispatch_jobs FROM authenticated, anon;

ALTER TABLE event_dispatch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_dispatch_jobs_staff_select ON event_dispatch_jobs
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

-- ----------------------------------------------------------------------------
-- Enqueue jobs (service role / server only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_event_dispatch_job(
    p_tenant_id UUID,
    p_domain_event_id UUID,
    p_job_type event_dispatch_job_type,
    p_idempotency_key TEXT,
    p_max_retries INT DEFAULT 5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.event_dispatch_jobs (
        tenant_id,
        domain_event_id,
        job_type,
        idempotency_key,
        max_retries
    )
    VALUES (
        p_tenant_id,
        p_domain_event_id,
        p_job_type,
        p_idempotency_key,
        COALESCE(p_max_retries, 5)
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
        SELECT id INTO v_id
        FROM public.event_dispatch_jobs
        WHERE idempotency_key = p_idempotency_key;
    END IF;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_event_dispatch_job(UUID, UUID, event_dispatch_job_type, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_event_dispatch_job(UUID, UUID, event_dispatch_job_type, TEXT, INT) TO service_role;

-- ----------------------------------------------------------------------------
-- Claim jobs for worker (FOR UPDATE SKIP LOCKED)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_event_dispatch_jobs(
    p_worker_id TEXT,
    p_batch_size INT DEFAULT 20
)
RETURNS SETOF event_dispatch_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.event_dispatch_jobs AS j
    SET
        status = 'processing',
        locked_at = now(),
        locked_by = p_worker_id,
        started_at = COALESCE(j.started_at, now()),
        updated_at = now()
    WHERE j.id IN (
        SELECT sub.id
        FROM public.event_dispatch_jobs AS sub
        WHERE sub.status IN ('pending', 'failed')
          AND sub.retry_count < sub.max_retries
          AND sub.next_run_at <= now()
        ORDER BY sub.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(1, LEAST(p_batch_size, 100))
    )
    RETURNING j.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_event_dispatch_jobs(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_event_dispatch_jobs(TEXT, INT) TO service_role;

-- ----------------------------------------------------------------------------
-- Complete / fail job
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_event_dispatch_job(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.event_dispatch_jobs
    SET
        status = 'completed',
        completed_at = now(),
        locked_at = NULL,
        locked_by = NULL,
        last_error = NULL,
        updated_at = now()
    WHERE id = p_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_event_dispatch_job(
    p_job_id UUID,
    p_error TEXT,
    p_retry_delay_seconds INT DEFAULT NULL
)
RETURNS event_dispatch_job_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job public.event_dispatch_jobs;
    v_new_retry INT;
    v_status event_dispatch_job_status;
    v_delay INT;
BEGIN
    SELECT * INTO v_job FROM public.event_dispatch_jobs WHERE id = p_job_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN 'failed';
    END IF;

    v_new_retry := v_job.retry_count + 1;

    IF v_new_retry >= v_job.max_retries THEN
        v_status := 'dead_letter';
        UPDATE public.event_dispatch_jobs
        SET
            status = v_status,
            retry_count = v_new_retry,
            last_error = LEFT(p_error, 2000),
            locked_at = NULL,
            locked_by = NULL,
            updated_at = now()
        WHERE id = p_job_id;
    ELSE
        v_status := 'failed';
        v_delay := COALESCE(
            p_retry_delay_seconds,
            LEAST(3600, (POWER(2, v_new_retry) * 30)::INT)
        );
        UPDATE public.event_dispatch_jobs
        SET
            status = v_status,
            retry_count = v_new_retry,
            last_error = LEFT(p_error, 2000),
            next_run_at = now() + (v_delay || ' seconds')::INTERVAL,
            locked_at = NULL,
            locked_by = NULL,
            updated_at = now()
        WHERE id = p_job_id;
    END IF;

    RETURN v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_event_dispatch_job(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_event_dispatch_job(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.fail_event_dispatch_job(UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fail_event_dispatch_job(UUID, TEXT, INT) TO service_role;

COMMENT ON TABLE event_dispatch_jobs IS
    'Sprint 8D — async dispatch queue for notification and email projection (PostgreSQL-native).';
