-- ============================================================================
-- TravelOS CRM — Full installation validation (post 025-029)
-- Run after crm_sprint1_validation.sql
-- ============================================================================

DO $$
DECLARE
    v_policies INT;
    v_funcs INT;
BEGIN
    -- RLS policies on CRM tables
    SELECT count(*) INTO v_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('leads', 'opportunities', 'activities');

    IF v_policies < 12 THEN
        RAISE EXCEPTION 'FAIL: expected at least 12 RLS policies on CRM tables, found %', v_policies;
    END IF;

    -- CRM helper functions
    SELECT count(*) INTO v_funcs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'has_crm_permission',
          'crm_can_read_row',
          'crm_can_write_row',
          'crm_can_read_activity',
          'crm_can_write_activity',
          'generate_lead_number',
          'generate_opportunity_number',
          'sync_activity_contact_timestamps'
      );

    IF v_funcs < 8 THEN
        RAISE EXCEPTION 'FAIL: missing CRM functions (found % of 8)', v_funcs;
    END IF;

    -- Triggers
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leads_number'
    ) THEN
        RAISE EXCEPTION 'FAIL: trg_leads_number missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_activities_contact_timestamps'
    ) THEN
        RAISE EXCEPTION 'FAIL: trg_activities_contact_timestamps missing';
    END IF;

    RAISE NOTICE 'PASS: validate_crm_installation — RLS, functions, triggers OK';
END $$;
