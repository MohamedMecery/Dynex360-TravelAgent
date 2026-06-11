-- ============================================================================
-- TravelOS Migration 063_ai_ops_rls_permissions
-- Sprint 9D — RLS + ai.operations.* permissions
-- ============================================================================

ALTER TABLE ai_ops_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ops_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ops_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ops_recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ops_insight_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_ops_snapshots_staff_select ON ai_ops_snapshots
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY ai_ops_score_history_staff_select ON ai_ops_score_history
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY ai_ops_recommendations_staff_select ON ai_ops_recommendations
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY ai_ops_recommendations_staff_update ON ai_ops_recommendations
    FOR UPDATE TO authenticated
    USING (
        public.is_crm_staff_user()
        AND tenant_id = public.current_tenant_id()
    )
    WITH CHECK (
        public.is_crm_staff_user()
        AND tenant_id = public.current_tenant_id()
    );

CREATE POLICY ai_ops_recommendation_feedback_staff_insert ON ai_ops_recommendation_feedback
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_crm_staff_user()
        AND tenant_id = public.current_tenant_id()
    );

CREATE POLICY ai_ops_recommendation_feedback_staff_select ON ai_ops_recommendation_feedback
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY ai_ops_insight_cache_staff_select ON ai_ops_insight_cache
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

REVOKE INSERT, UPDATE, DELETE ON ai_ops_snapshots FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON ai_ops_score_history FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON ai_ops_recommendations FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON ai_ops_insight_cache FROM authenticated, anon;

INSERT INTO permissions (module, action, description) VALUES
    ('ai', 'operations.use', 'Use Operations Assistant chat (explanation only)'),
    ('ai', 'operations.read', 'View operations scores and recommendations'),
    ('ai', 'operations.insights.read', 'View operations manager insights dashboard'),
    ('ai', 'operations.manage', 'Configure operations AI rule weights')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'ai' AND p.action IN (
    'operations.use', 'operations.read', 'operations.insights.read', 'operations.manage'
)
WHERE r.name IN ('super_admin', 'tenant_admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'ai' AND p.action IN ('operations.use', 'operations.read')
WHERE r.name = 'sales_agent'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'ai' AND p.action IN ('operations.use', 'operations.read')
WHERE r.name = 'sales_agent'
ON CONFLICT DO NOTHING;

INSERT INTO ai_agents (tenant_id, agent_key, enabled, config)
SELECT t.id, 'operations'::ai_agent_key, true, '{"monthly_token_budget": 500000}'::jsonb
FROM tenants t
ON CONFLICT (tenant_id, agent_key) DO NOTHING;
