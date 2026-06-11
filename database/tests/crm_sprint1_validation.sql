-- ============================================================================
-- TravelOS CRM Sprint 1 — Database validation (run after migrations 025-029)
-- Usage: Supabase SQL Editor or psql against staging/production after migrate
-- ============================================================================

DO $$
DECLARE
    v_count INT;
    v_col   TEXT;
BEGIN
    -- Tables exist
    PERFORM 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'leads';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: table leads missing';
    END IF;

    PERFORM 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'opportunities';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: table opportunities missing';
    END IF;

    PERFORM 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activities';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: table activities missing';
    END IF;

    -- No package_id on opportunities (frozen architecture)
    SELECT column_name INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'opportunities'
      AND column_name = 'package_id';

    IF v_col IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: opportunities.package_id must not exist';
    END IF;

    -- RLS enabled
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'leads' AND relnamespace = 'public'::regnamespace) THEN
        RAISE EXCEPTION 'FAIL: RLS not enabled on leads';
    END IF;

    -- CRM permissions seeded (7A = 13)
    SELECT count(*) INTO v_count
    FROM permissions
    WHERE module = 'crm';

    IF v_count < 13 THEN
        RAISE EXCEPTION 'FAIL: expected at least 13 crm permissions, got %', v_count;
    END IF;

    -- sales_agent has leads.write, not leads.read_all
    IF NOT EXISTS (
        SELECT 1
        FROM roles r
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = 'sales_agent'
          AND p.module = 'crm'
          AND p.action = 'leads.write'
    ) THEN
        RAISE EXCEPTION 'FAIL: sales_agent missing crm.leads.write';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM roles r
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = 'sales_agent'
          AND p.module = 'crm'
          AND p.action = 'leads.read_all'
    ) THEN
        RAISE EXCEPTION 'FAIL: sales_agent must not have leads.read_all';
    END IF;

    -- finance_officer read_all, no write
    IF NOT EXISTS (
        SELECT 1
        FROM roles r
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = 'finance_officer'
          AND p.module = 'crm'
          AND p.action = 'leads.read_all'
    ) THEN
        RAISE EXCEPTION 'FAIL: finance_officer missing crm.leads.read_all';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM roles r
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = 'finance_officer'
          AND p.module = 'crm'
          AND p.action = 'leads.write'
    ) THEN
        RAISE EXCEPTION 'FAIL: finance_officer must not have leads.write';
    END IF;

    -- Helper functions
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'has_crm_permission'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'FAIL: has_crm_permission() missing';
    END IF;

    RAISE NOTICE 'PASS: CRM Sprint 1 schema, RLS, and permission seed validation';
END $$;
