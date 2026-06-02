-- ============================================================================
-- TravelOS Migration 015_rls_ai
-- RLS policies for Phase 5 AI / knowledge / support tables + AI permissions seed
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Standard tenant isolation (full CRUD within tenant)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'ai_agents', 'ai_sessions', 'ai_conversations', 'ai_messages',
        'ai_feedback', 'knowledge_documents', 'knowledge_chunks',
        'support_tickets', 'support_ticket_messages'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

        EXECUTE format($f$
            CREATE POLICY %1$s_tenant_isolation ON %1$I
            FOR ALL
            TO authenticated
            USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
            WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
        $f$, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- ai_logs: insert within tenant; read tenant_admin + super_admin only
-- ----------------------------------------------------------------------------
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_logs_select ON ai_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            tenant_id = public.current_tenant_id()
            AND public.current_user_role() IN ('tenant_admin', 'super_admin')
        )
    );

CREATE POLICY ai_logs_insert ON ai_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ----------------------------------------------------------------------------
-- AI permissions seed (idempotent)
-- ----------------------------------------------------------------------------
INSERT INTO permissions (module, action, description) VALUES
    ('ai', 'knowledge.use', 'Use Knowledge Agent'),
    ('ai', 'booking.use',   'Use Booking Agent'),
    ('ai', 'support.use',   'Use Support Agent'),
    ('ai', 'read',          'View AI conversations'),
    ('ai', 'logs.read',     'View AI audit logs'),
    ('knowledge', 'manage', 'Manage knowledge documents')
ON CONFLICT (module, action) DO NOTHING;

-- tenant_admin + super_admin: all AI permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module IN ('ai', 'knowledge')
WHERE r.name IN ('tenant_admin', 'super_admin')
ON CONFLICT DO NOTHING;

-- sales_agent: knowledge, booking, support use + read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'ai' AND p.action IN ('knowledge.use', 'booking.use', 'support.use', 'read'))
)
WHERE r.name = 'sales_agent'
ON CONFLICT DO NOTHING;

-- finance_officer: knowledge + support (no booking agent)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'ai' AND p.action IN ('knowledge.use', 'support.use', 'read'))
)
WHERE r.name = 'finance_officer'
ON CONFLICT DO NOTHING;
