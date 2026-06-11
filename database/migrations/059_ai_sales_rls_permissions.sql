-- ============================================================================
-- TravelOS Migration 059_ai_sales_rls_permissions
-- Sprint 9C — RLS policies + ai.sales.* permissions
-- ============================================================================

ALTER TABLE ai_sales_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sales_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sales_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sales_recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sales_insight_cache ENABLE ROW LEVEL SECURITY;

-- Snapshots: staff read tenant-scoped (respect CRM row visibility via join in API)
CREATE POLICY ai_sales_snapshots_staff_select ON ai_sales_snapshots
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY ai_sales_score_history_staff_select ON ai_sales_score_history
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY ai_sales_recommendations_staff_select ON ai_sales_recommendations
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY ai_sales_recommendations_staff_update ON ai_sales_recommendations
    FOR UPDATE TO authenticated
    USING (
        public.is_crm_staff_user()
        AND tenant_id = public.current_tenant_id()
    )
    WITH CHECK (
        public.is_crm_staff_user()
        AND tenant_id = public.current_tenant_id()
    );

CREATE POLICY ai_sales_recommendation_feedback_staff_insert ON ai_sales_recommendation_feedback
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_crm_staff_user()
        AND tenant_id = public.current_tenant_id()
    );

CREATE POLICY ai_sales_recommendation_feedback_staff_select ON ai_sales_recommendation_feedback
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY ai_sales_insight_cache_staff_select ON ai_sales_insight_cache
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

-- Worker writes via service role (bypasses RLS)
REVOKE INSERT, UPDATE, DELETE ON ai_sales_snapshots FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON ai_sales_score_history FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON ai_sales_recommendations FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON ai_sales_insight_cache FROM authenticated, anon;

-- ----------------------------------------------------------------------------
-- Permissions: ai.sales.*
-- ----------------------------------------------------------------------------
INSERT INTO permissions (module, action, description) VALUES
    ('ai', 'sales.use', 'Use Sales Assistant chat (explanation only)'),
    ('ai', 'sales.read', 'View sales scores and recommendations'),
    ('ai', 'sales.insights.read', 'View sales manager insights dashboard'),
    ('ai', 'sales.manage', 'Configure sales AI rule weights')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'ai' AND p.action IN (
    'sales.use', 'sales.read', 'sales.insights.read', 'sales.manage'
)
WHERE r.name IN ('super_admin', 'tenant_admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'ai' AND p.action IN ('sales.use', 'sales.read')
WHERE r.name = 'sales_agent'
ON CONFLICT DO NOTHING;

-- Seed sales agent enablement for existing tenants
INSERT INTO ai_agents (tenant_id, agent_key, enabled, config)
SELECT t.id, 'sales'::ai_agent_key, true, '{"monthly_token_budget": 500000}'::jsonb
FROM tenants t
ON CONFLICT (tenant_id, agent_key) DO NOTHING;
