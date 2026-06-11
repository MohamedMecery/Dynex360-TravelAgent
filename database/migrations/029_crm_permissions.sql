-- ============================================================================
-- TravelOS Migration 029_crm_permissions
-- CRM Phase 7A permission seed (idempotent)
-- Module: crm | Actions: leads.*, opportunities.*, activities.*, dashboard.read
-- ============================================================================

INSERT INTO permissions (module, action, description) VALUES
    ('crm', 'leads.read',              'Read own leads'),
    ('crm', 'leads.read_all',          'Read all tenant leads'),
    ('crm', 'leads.write',             'Create and update own leads'),
    ('crm', 'leads.write_all',         'Manage all tenant leads'),
    ('crm', 'opportunities.read',      'Read own opportunities'),
    ('crm', 'opportunities.read_all',  'Read all tenant opportunities'),
    ('crm', 'opportunities.write',     'Create and update own opportunities'),
    ('crm', 'opportunities.write_all', 'Manage all tenant opportunities'),
    ('crm', 'activities.read',         'Read own assigned activities'),
    ('crm', 'activities.read_all',     'Read all tenant activities'),
    ('crm', 'activities.write',        'Create and update own activities'),
    ('crm', 'activities.write_all',    'Manage all tenant activities'),
    ('crm', 'dashboard.read',          'View CRM dashboard')
ON CONFLICT (module, action) DO NOTHING;

-- super_admin + tenant_admin: full CRM access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'tenant_admin')
  AND p.module = 'crm'
ON CONFLICT DO NOTHING;

-- sales_agent: own read/write + dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'crm'
    AND p.action IN (
        'leads.read',
        'leads.write',
        'opportunities.read',
        'opportunities.write',
        'activities.read',
        'activities.write',
        'dashboard.read'
    )
WHERE r.name = 'sales_agent'
ON CONFLICT DO NOTHING;

-- finance_officer: read_all + dashboard (no writes)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'crm'
    AND p.action IN (
        'leads.read_all',
        'opportunities.read_all',
        'activities.read_all',
        'dashboard.read'
    )
WHERE r.name = 'finance_officer'
ON CONFLICT DO NOTHING;
