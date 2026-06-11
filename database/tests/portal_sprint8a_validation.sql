-- ============================================================================
-- TravelOS Sprint 8A — Customer Portal RLS validation
-- Run after migration 039_customer_portal.sql
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_portal_accounts'
    ) THEN
        RAISE EXCEPTION '039_customer_portal migration not applied';
    END IF;
END $$;

-- Helper presence
SELECT
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'is_portal_user'
    ) THEN 'PASS' ELSE 'FAIL' END AS is_portal_user_fn,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'portal_customer_id'
    ) THEN 'PASS' ELSE 'FAIL' END AS portal_customer_id_fn,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'link_customer_portal_account'
    ) THEN 'PASS' ELSE 'FAIL' END AS link_fn;

-- Portal RLS policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%portal%'
ORDER BY tablename, policyname;
