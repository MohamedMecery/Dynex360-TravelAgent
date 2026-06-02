-- ============================================================================
-- TravelOS Migration 001_core
-- Tenancy + Authentication/RBAC foundation
-- Tables: tenants, tenant_settings, users, roles, permissions,
--         role_permissions, user_roles
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enum types
-- ----------------------------------------------------------------------------
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'inactive');
CREATE TYPE user_status   AS ENUM ('active', 'inactive', 'pending');

-- ----------------------------------------------------------------------------
-- tenants (Core / tenancy root)
-- ----------------------------------------------------------------------------
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    status      tenant_status NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenants_slug UNIQUE (slug)
);

CREATE INDEX idx_tenants_status ON tenants(status);

-- ----------------------------------------------------------------------------
-- tenant_settings (Support)
-- ----------------------------------------------------------------------------
CREATE TABLE tenant_settings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    default_currency CHAR(3) NOT NULL DEFAULT 'USD',
    timezone         VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale           VARCHAR(10) NOT NULL DEFAULT 'en',
    settings         JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_settings_tenant UNIQUE (tenant_id)
);

-- ----------------------------------------------------------------------------
-- users (Core) - id equals Supabase auth.users.id
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id          UUID PRIMARY KEY,
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255),
    status      user_status NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_status    ON users(status);

-- ----------------------------------------------------------------------------
-- roles (Lookup / global)
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_roles_name UNIQUE (name)
);

-- ----------------------------------------------------------------------------
-- permissions (Lookup / global)
-- ----------------------------------------------------------------------------
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module      VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_permissions_module_action UNIQUE (module, action)
);

-- ----------------------------------------------------------------------------
-- role_permissions (Junction / global)
-- ----------------------------------------------------------------------------
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ----------------------------------------------------------------------------
-- user_roles (Junction / tenant-scoped)
-- ----------------------------------------------------------------------------
CREATE TABLE user_roles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_roles_user_tenant UNIQUE (user_id, tenant_id)
);

CREATE INDEX idx_user_roles_user_id   ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id   ON user_roles(role_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);
