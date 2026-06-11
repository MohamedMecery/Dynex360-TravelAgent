-- ============================================================================
-- TravelOS Migration 054_whatsapp_rls
-- Sprint 9B — RLS and CRM permissions for WhatsApp
-- ============================================================================

ALTER TABLE tenant_whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_communication_preferences ENABLE ROW LEVEL SECURITY;

-- tenant_whatsapp_settings: staff read; writes service role only
CREATE POLICY tenant_whatsapp_settings_staff_select ON tenant_whatsapp_settings
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

REVOKE INSERT, UPDATE, DELETE ON tenant_whatsapp_settings FROM authenticated, anon;

-- whatsapp_templates: staff manage within tenant
CREATE POLICY whatsapp_templates_staff_select ON whatsapp_templates
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY whatsapp_templates_staff_insert ON whatsapp_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY whatsapp_templates_staff_update ON whatsapp_templates
    FOR UPDATE TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    )
    WITH CHECK (
        tenant_id = public.current_tenant_id() OR public.is_super_admin()
    );

CREATE POLICY whatsapp_templates_staff_delete ON whatsapp_templates
    FOR DELETE TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

-- whatsapp_messages: staff read tenant; portal read own customer outbound only
CREATE POLICY whatsapp_messages_staff_select ON whatsapp_messages
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY whatsapp_messages_portal_select ON whatsapp_messages
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    );

REVOKE INSERT, UPDATE, DELETE ON whatsapp_messages FROM authenticated, anon;

-- customer_communication_preferences: staff + portal (own customer)
CREATE POLICY customer_comm_prefs_staff_all ON customer_communication_preferences
    FOR ALL TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    )
    WITH CHECK (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY customer_comm_prefs_portal_select ON customer_communication_preferences
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    );

CREATE POLICY customer_comm_prefs_portal_update ON customer_communication_preferences
    FOR UPDATE TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    )
    WITH CHECK (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    );

CREATE POLICY customer_comm_prefs_portal_insert ON customer_communication_preferences
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    );

-- Permissions
INSERT INTO permissions (module, action, description) VALUES
    ('crm', 'whatsapp.templates.manage', 'Manage WhatsApp templates'),
    ('crm', 'whatsapp.messages.send', 'Send template WhatsApp messages from CRM'),
    ('crm', 'whatsapp.messages.read', 'View WhatsApp message history')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('tenant_admin', 'super_admin')
  AND p.module = 'crm'
  AND p.action LIKE 'whatsapp.%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'crm' AND p.action IN (
    'whatsapp.messages.send',
    'whatsapp.messages.read'
)
WHERE r.name = 'sales_agent'
ON CONFLICT DO NOTHING;
