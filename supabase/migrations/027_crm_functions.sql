-- ============================================================================
-- TravelOS Migration 027_crm_functions
-- CRM document numbers, contact timestamps, audit triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Lead number: LD-YYYY-######
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_lead_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    IF NEW.lead_number IS NOT NULL AND NEW.lead_number <> '' THEN
        RETURN NEW;
    END IF;

    SELECT count(*) + 1
    INTO v_seq
    FROM public.leads
    WHERE tenant_id = NEW.tenant_id
      AND date_part('year', created_at) = date_part('year', now());

    NEW.lead_number := 'LD-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_number
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_lead_number();

-- ----------------------------------------------------------------------------
-- Opportunity number: OP-YYYY-######
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_opportunity_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    IF NEW.opportunity_number IS NOT NULL AND NEW.opportunity_number <> '' THEN
        RETURN NEW;
    END IF;

    SELECT count(*) + 1
    INTO v_seq
    FROM public.opportunities
    WHERE tenant_id = NEW.tenant_id
      AND date_part('year', created_at) = date_part('year', now());

    NEW.opportunity_number := 'OP-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_opportunities_number
    BEFORE INSERT ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_opportunity_number();

-- ----------------------------------------------------------------------------
-- Update lead contact timestamps from activities
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_activity_contact_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_at TIMESTAMPTZ;
BEGIN
    IF TG_OP NOT IN ('INSERT', 'UPDATE') THEN
        RETURN NEW;
    END IF;

    IF NEW.activity_type NOT IN ('call', 'whatsapp', 'email', 'meeting') THEN
        RETURN NEW;
    END IF;

    v_at := COALESCE(NEW.completed_at, NEW.created_at, now());

    IF NEW.related_lead_id IS NOT NULL THEN
        UPDATE public.leads
        SET
            last_contacted_at = v_at,
            last_whatsapp_at = CASE
                WHEN NEW.activity_type = 'whatsapp' THEN v_at
                ELSE last_whatsapp_at
            END,
            updated_at = now()
        WHERE id = NEW.related_lead_id
          AND tenant_id = NEW.tenant_id
          AND deleted_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activities_contact_timestamps
    AFTER INSERT OR UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_activity_contact_timestamps();

-- ----------------------------------------------------------------------------
-- updated_at on CRM tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['leads', 'opportunities', 'activities']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$I;
             CREATE TRIGGER trg_%1$s_updated_at
             BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
            t
        );
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Audit user columns
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['leads', 'opportunities', 'activities']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%1$s_audit_user ON %1$I;
             CREATE TRIGGER trg_%1$s_audit_user
             BEFORE INSERT OR UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION public.set_audit_user();',
            t
        );
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Audit log on CRM tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['leads', 'opportunities', 'activities']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%1$s_audit ON %1$I;
             CREATE TRIGGER trg_%1$s_audit
             AFTER INSERT OR UPDATE OR DELETE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION public.log_audit();',
            t
        );
    END LOOP;
END $$;
