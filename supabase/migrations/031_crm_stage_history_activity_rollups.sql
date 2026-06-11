-- ============================================================================
-- TravelOS Migration 031_crm_stage_history_activity_rollups
-- Opportunity stage history + activity_count / last_activity_at rollups
-- ============================================================================

-- ----------------------------------------------------------------------------
-- opportunity_stage_history
-- ----------------------------------------------------------------------------
CREATE TABLE opportunity_stage_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    from_stage      opportunity_stage,
    to_stage        opportunity_stage NOT NULL,
    changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opp_stage_history_opp ON opportunity_stage_history(opportunity_id, changed_at DESC);
CREATE INDEX idx_opp_stage_history_tenant ON opportunity_stage_history(tenant_id, changed_at DESC);

-- ----------------------------------------------------------------------------
-- Activity rollups on leads, opportunities, customers
-- ----------------------------------------------------------------------------
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS activity_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE opportunities
    ADD COLUMN IF NOT EXISTS activity_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS activity_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- Record opportunity stage transitions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_opportunity_stage_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.opportunity_stage_history (
            tenant_id,
            opportunity_id,
            from_stage,
            to_stage,
            changed_by,
            changed_at
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            NULL,
            NEW.stage,
            COALESCE(NEW.updated_by, NEW.created_by),
            COALESCE(NEW.created_at, now())
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
        INSERT INTO public.opportunity_stage_history (
            tenant_id,
            opportunity_id,
            from_stage,
            to_stage,
            changed_by,
            changed_at
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            OLD.stage,
            NEW.stage,
            COALESCE(NEW.updated_by, auth.uid()),
            now()
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunities_stage_history ON public.opportunities;
CREATE TRIGGER trg_opportunities_stage_history
    AFTER INSERT OR UPDATE OF stage ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.record_opportunity_stage_history();

-- ----------------------------------------------------------------------------
-- Sync activity_count / last_activity_at for a related entity
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_activity_rollups(
    p_tenant_id UUID,
    p_lead_id UUID DEFAULT NULL,
    p_opportunity_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
    v_last TIMESTAMPTZ;
BEGIN
    IF p_lead_id IS NOT NULL THEN
        SELECT count(*)::INTEGER, max(COALESCE(completed_at, created_at))
        INTO v_count, v_last
        FROM public.activities
        WHERE tenant_id = p_tenant_id
          AND related_lead_id = p_lead_id
          AND deleted_at IS NULL;

        UPDATE public.leads
        SET activity_count = COALESCE(v_count, 0),
            last_activity_at = v_last,
            updated_at = now()
        WHERE id = p_lead_id AND tenant_id = p_tenant_id AND deleted_at IS NULL;
    END IF;

    IF p_opportunity_id IS NOT NULL THEN
        SELECT count(*)::INTEGER, max(COALESCE(completed_at, created_at))
        INTO v_count, v_last
        FROM public.activities
        WHERE tenant_id = p_tenant_id
          AND related_opportunity_id = p_opportunity_id
          AND deleted_at IS NULL;

        UPDATE public.opportunities
        SET activity_count = COALESCE(v_count, 0),
            last_activity_at = v_last,
            updated_at = now()
        WHERE id = p_opportunity_id AND tenant_id = p_tenant_id AND deleted_at IS NULL;
    END IF;

    IF p_customer_id IS NOT NULL THEN
        SELECT count(*)::INTEGER, max(COALESCE(completed_at, created_at))
        INTO v_count, v_last
        FROM public.activities
        WHERE tenant_id = p_tenant_id
          AND related_customer_id = p_customer_id
          AND deleted_at IS NULL;

        UPDATE public.customers
        SET activity_count = COALESCE(v_count, 0),
            last_activity_at = v_last,
            updated_at = now()
        WHERE id = p_customer_id AND tenant_id = p_tenant_id AND deleted_at IS NULL;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_activity_rollups_from_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant UUID;
    v_lead UUID;
    v_opp UUID;
    v_customer UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_tenant := OLD.tenant_id;
        v_lead := OLD.related_lead_id;
        v_opp := OLD.related_opportunity_id;
        v_customer := OLD.related_customer_id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_tenant := NEW.tenant_id;
        IF OLD.related_lead_id IS DISTINCT FROM NEW.related_lead_id THEN
            PERFORM public.recalc_activity_rollups(OLD.tenant_id, p_lead_id := OLD.related_lead_id);
        END IF;
        IF OLD.related_opportunity_id IS DISTINCT FROM NEW.related_opportunity_id THEN
            PERFORM public.recalc_activity_rollups(
                OLD.tenant_id,
                p_opportunity_id := OLD.related_opportunity_id
            );
        END IF;
        IF OLD.related_customer_id IS DISTINCT FROM NEW.related_customer_id THEN
            PERFORM public.recalc_activity_rollups(
                OLD.tenant_id,
                p_customer_id := OLD.related_customer_id
            );
        END IF;
        v_lead := NEW.related_lead_id;
        v_opp := NEW.related_opportunity_id;
        v_customer := NEW.related_customer_id;
    ELSE
        v_tenant := NEW.tenant_id;
        v_lead := NEW.related_lead_id;
        v_opp := NEW.related_opportunity_id;
        v_customer := NEW.related_customer_id;
    END IF;

    PERFORM public.recalc_activity_rollups(
        v_tenant,
        p_lead_id := v_lead,
        p_opportunity_id := v_opp,
        p_customer_id := v_customer
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activities_rollups ON public.activities;
CREATE TRIGGER trg_activities_rollups
    AFTER INSERT OR UPDATE OR DELETE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_activity_rollups_from_activity();

-- Backfill rollups from existing activities
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT tenant_id, related_lead_id AS lead_id
        FROM activities
        WHERE related_lead_id IS NOT NULL AND deleted_at IS NULL
    LOOP
        PERFORM recalc_activity_rollups(r.tenant_id, p_lead_id := r.lead_id);
    END LOOP;

    FOR r IN
        SELECT DISTINCT tenant_id, related_opportunity_id AS opp_id
        FROM activities
        WHERE related_opportunity_id IS NOT NULL AND deleted_at IS NULL
    LOOP
        PERFORM recalc_activity_rollups(r.tenant_id, p_opportunity_id := r.opp_id);
    END LOOP;

    FOR r IN
        SELECT DISTINCT tenant_id, related_customer_id AS customer_id
        FROM activities
        WHERE related_customer_id IS NOT NULL AND deleted_at IS NULL
    LOOP
        PERFORM recalc_activity_rollups(r.tenant_id, p_customer_id := r.customer_id);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- RLS: opportunity_stage_history (read via parent opportunity)
-- ----------------------------------------------------------------------------
ALTER TABLE opportunity_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY opportunity_stage_history_select ON opportunity_stage_history
    FOR SELECT
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND EXISTS (
            SELECT 1
            FROM public.opportunities o
            WHERE o.id = opportunity_stage_history.opportunity_id
              AND o.tenant_id = opportunity_stage_history.tenant_id
              AND o.deleted_at IS NULL
              AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
        )
    );

-- Inserts only via SECURITY DEFINER trigger (no direct client insert policy)
