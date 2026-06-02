-- ============================================================================
-- TravelOS Migration 008_seed_reference
-- Seed system roles, permissions, and role->permission grants.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------
INSERT INTO roles (name, description, is_system) VALUES
    ('super_admin',     'Platform administrator across all tenants', true),
    ('tenant_admin',    'Full administrator within a tenant',        true),
    ('sales_agent',     'Manages customers, travelers and bookings', true),
    ('finance_officer', 'Manages invoices and payments',             true)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Permissions ({module}.{action})
-- ----------------------------------------------------------------------------
INSERT INTO permissions (module, action, description)
SELECT m.module, a.action, m.module || ' ' || a.action
FROM (VALUES
        ('customers'), ('travelers'), ('destinations'), ('packages'),
        ('bookings'), ('invoices'), ('payments'), ('users'), ('settings')
     ) AS m(module)
CROSS JOIN (VALUES ('create'), ('read'), ('update'), ('delete')) AS a(action)
ON CONFLICT (module, action) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Grants: tenant_admin -> all permissions
-- ----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'tenant_admin'
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Grants: super_admin -> all permissions (platform-wide via RLS)
-- ----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Grants: sales_agent
--   customers/travelers/bookings: create, read, update
--   packages/destinations: read
-- ----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON (
        (p.module IN ('customers', 'travelers', 'bookings') AND p.action IN ('create', 'read', 'update'))
     OR (p.module IN ('packages', 'destinations') AND p.action = 'read')
    )
WHERE r.name = 'sales_agent'
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Grants: finance_officer
--   invoices/payments: create, read, update, delete
--   bookings/customers: read
-- ----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON (
        (p.module IN ('invoices', 'payments') AND p.action IN ('create', 'read', 'update', 'delete'))
     OR (p.module IN ('bookings', 'customers') AND p.action = 'read')
    )
WHERE r.name = 'finance_officer'
ON CONFLICT DO NOTHING;
