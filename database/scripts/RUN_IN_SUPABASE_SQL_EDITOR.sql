-- TravelOS: run this entire file in Supabase Dashboard → SQL Editor → Run
-- Project: ndomcfohwnvbyufnrxek
-- Order: 001_core.sql, 002_master_data.sql, 003_customers_packages.sql, 004_bookings_finance.sql, 005_supporting.sql, 006_rls_policies.sql, 007_functions_triggers.sql, 008_seed_reference.sql, 009_auth_hook.sql, 010_seed_geography.sql


-- ========== 001_core.sql ==========

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


-- ========== 002_master_data.sql ==========

-- ============================================================================
-- TravelOS Migration 002_master_data
-- Geography reference layer
-- Tables: countries (global), cities (global), destinations (tenant-scoped)
-- ============================================================================

CREATE TYPE destination_status AS ENUM ('active', 'inactive');

-- ----------------------------------------------------------------------------
-- countries (Lookup / global) - no tenant_id, no soft delete
-- ----------------------------------------------------------------------------
CREATE TABLE countries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iso2          CHAR(2) NOT NULL,
    iso3          CHAR(3),
    name          VARCHAR(100) NOT NULL,
    phone_code    VARCHAR(10),
    currency_code CHAR(3),
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_countries_iso2 UNIQUE (iso2),
    CONSTRAINT uq_countries_iso3 UNIQUE (iso3)
);

CREATE INDEX idx_countries_name ON countries(name);

-- ----------------------------------------------------------------------------
-- cities (Lookup / global) - no tenant_id, no soft delete
-- ----------------------------------------------------------------------------
CREATE TABLE cities (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id   UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name         VARCHAR(150) NOT NULL,
    state_region VARCHAR(150),
    latitude     DECIMAL(9,6),
    longitude    DECIMAL(9,6),
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cities_country_name_region UNIQUE (country_id, name, state_region)
);

CREATE INDEX idx_cities_country_id   ON cities(country_id);
CREATE INDEX idx_cities_country_name ON cities(country_id, name);

-- ----------------------------------------------------------------------------
-- destinations (Lookup / tenant-scoped, soft delete, audited)
-- ----------------------------------------------------------------------------
CREATE TABLE destinations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    country_id  UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    city_id     UUID REFERENCES cities(id) ON DELETE SET NULL,
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(200) NOT NULL,
    description TEXT,
    status      destination_status NOT NULL DEFAULT 'active',
    deleted_at  TIMESTAMPTZ,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_destinations_tenant_id  ON destinations(tenant_id);
CREATE INDEX idx_destinations_country_id ON destinations(country_id);
CREATE INDEX idx_destinations_city_id    ON destinations(city_id);
CREATE INDEX idx_destinations_status     ON destinations(tenant_id, status);
CREATE UNIQUE INDEX uq_destinations_tenant_slug
    ON destinations(tenant_id, slug) WHERE deleted_at IS NULL;


-- ========== 003_customers_packages.sql ==========

-- ============================================================================
-- TravelOS Migration 003_customers_packages
-- Sales context: customers, travelers, packages and package planning
-- Tables: customers, customer_contacts, customer_addresses, travelers,
--         packages, package_days, package_day_activities,
--         package_pricing, package_media
-- ============================================================================

CREATE TYPE customer_type   AS ENUM ('individual', 'corporate');
CREATE TYPE address_type    AS ENUM ('billing', 'mailing', 'other');
CREATE TYPE traveler_gender AS ENUM ('male', 'female', 'other', 'unspecified');
CREATE TYPE package_status  AS ENUM ('draft', 'published', 'archived');
CREATE TYPE pricing_tier    AS ENUM ('adult', 'child', 'infant');

-- ----------------------------------------------------------------------------
-- customers (Core)
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type         customer_type NOT NULL DEFAULT 'individual',
    first_name   VARCHAR(100),
    last_name    VARCHAR(100),
    company_name VARCHAR(255),
    email        VARCHAR(255),
    phone        VARCHAR(50),
    notes        TEXT,
    deleted_at   TIMESTAMPTZ,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_customers_name CHECK (
        (type = 'corporate' AND company_name IS NOT NULL) OR
        (type = 'individual' AND last_name IS NOT NULL)
    )
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_name      ON customers(tenant_id, last_name, first_name);
CREATE UNIQUE INDEX uq_customers_tenant_email
    ON customers(tenant_id, email) WHERE deleted_at IS NULL AND email IS NOT NULL;

-- ----------------------------------------------------------------------------
-- customer_contacts (Support)
-- ----------------------------------------------------------------------------
CREATE TABLE customer_contacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(50),
    role        VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX idx_customer_contacts_tenant_id   ON customer_contacts(tenant_id);

-- ----------------------------------------------------------------------------
-- customer_addresses (Support) - country/city normalized to FK
-- ----------------------------------------------------------------------------
CREATE TABLE customer_addresses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type        address_type NOT NULL DEFAULT 'billing',
    street      VARCHAR(255),
    city_id     UUID REFERENCES cities(id) ON DELETE SET NULL,
    country_id  UUID REFERENCES countries(id) ON DELETE SET NULL,
    postal_code VARCHAR(20),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_tenant_id   ON customer_addresses(tenant_id);
CREATE INDEX idx_customer_addresses_country_id  ON customer_addresses(country_id);
CREATE INDEX idx_customer_addresses_city_id     ON customer_addresses(city_id);

-- ----------------------------------------------------------------------------
-- travelers (Core) - reusable traveler profiles
-- ----------------------------------------------------------------------------
CREATE TABLE travelers (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id            UUID REFERENCES customers(id) ON DELETE SET NULL,
    first_name             VARCHAR(100) NOT NULL,
    last_name              VARCHAR(100) NOT NULL,
    date_of_birth          DATE,
    gender                 traveler_gender NOT NULL DEFAULT 'unspecified',
    nationality_country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
    passport_number        VARCHAR(50),
    passport_expiry        DATE,
    email                  VARCHAR(255),
    phone                  VARCHAR(50),
    deleted_at             TIMESTAMPTZ,
    created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by             UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_travelers_passport_expiry CHECK (
        passport_expiry IS NULL OR date_of_birth IS NULL OR passport_expiry > date_of_birth
    )
);

CREATE INDEX idx_travelers_tenant_id   ON travelers(tenant_id);
CREATE INDEX idx_travelers_customer_id ON travelers(customer_id);
CREATE INDEX idx_travelers_nationality ON travelers(nationality_country_id);
CREATE INDEX idx_travelers_name        ON travelers(tenant_id, last_name, first_name);

-- ----------------------------------------------------------------------------
-- packages (Core)
-- ----------------------------------------------------------------------------
CREATE TABLE packages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    destination_id  UUID REFERENCES destinations(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    duration_days   INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
    status          package_status NOT NULL DEFAULT 'draft',
    cover_image_url TEXT,
    deleted_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packages_tenant_id      ON packages(tenant_id);
CREATE INDEX idx_packages_status         ON packages(tenant_id, status);
CREATE INDEX idx_packages_destination_id ON packages(destination_id);

-- ----------------------------------------------------------------------------
-- package_days (Transaction) - day-by-day plan
-- ----------------------------------------------------------------------------
CREATE TABLE package_days (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id  UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    day_number  INTEGER NOT NULL CHECK (day_number > 0),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_package_days_package_day UNIQUE (package_id, day_number)
);

CREATE INDEX idx_package_days_package_id ON package_days(package_id);
CREATE INDEX idx_package_days_tenant_id  ON package_days(tenant_id);

-- ----------------------------------------------------------------------------
-- package_day_activities (Transaction) - activities within a day
-- ----------------------------------------------------------------------------
CREATE TABLE package_day_activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_day_id  UUID NOT NULL REFERENCES package_days(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    start_time      TIME,
    end_time        TIME,
    location        VARCHAR(255),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_pda_time CHECK (
        end_time IS NULL OR start_time IS NULL OR end_time >= start_time
    )
);

CREATE INDEX idx_package_day_activities_day_id    ON package_day_activities(package_day_id);
CREATE INDEX idx_package_day_activities_tenant_id ON package_day_activities(tenant_id);

-- ----------------------------------------------------------------------------
-- package_pricing (Transaction)
-- ----------------------------------------------------------------------------
CREATE TABLE package_pricing (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier       pricing_tier NOT NULL,
    amount     DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    currency   CHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_package_pricing_package_tier UNIQUE (package_id, tier)
);

CREATE INDEX idx_package_pricing_package_id ON package_pricing(package_id);

-- ----------------------------------------------------------------------------
-- package_media (Support)
-- ----------------------------------------------------------------------------
CREATE TABLE package_media (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_url   TEXT NOT NULL,
    file_type  VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_package_media_package_id ON package_media(package_id);


-- ========== 004_bookings_finance.sql ==========

-- ============================================================================
-- TravelOS Migration 004_bookings_finance
-- Operations + Finance context
-- Tables: bookings, booking_items, booking_travelers, booking_status_history,
--         booking_notes, booking_documents, invoices, payments,
--         payment_transactions
-- ============================================================================

CREATE TYPE booking_status   AS ENUM ('draft', 'confirmed', 'completed', 'cancelled');
CREATE TYPE payment_status   AS ENUM ('unpaid', 'partial', 'paid');
CREATE TYPE invoice_status   AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'cancelled', 'void');
CREATE TYPE payment_method   AS ENUM ('cash', 'bank_transfer', 'card', 'other');
CREATE TYPE transaction_type AS ENUM ('payment', 'refund', 'adjustment');

-- ----------------------------------------------------------------------------
-- bookings (Core / transaction hub)
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference_number VARCHAR(50) NOT NULL,
    customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    package_id       UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    status           booking_status NOT NULL DEFAULT 'draft',
    payment_status   payment_status NOT NULL DEFAULT 'unpaid',
    total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency         CHAR(3) NOT NULL DEFAULT 'USD',
    travel_date      DATE,
    notes            TEXT,
    deleted_at       TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bookings_tenant_reference UNIQUE (tenant_id, reference_number)
);

CREATE INDEX idx_bookings_tenant_id   ON bookings(tenant_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_package_id  ON bookings(package_id);
CREATE INDEX idx_bookings_status      ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_travel_date ON bookings(tenant_id, travel_date);

-- ----------------------------------------------------------------------------
-- booking_items (Transaction)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price  DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);

-- ----------------------------------------------------------------------------
-- booking_travelers (Junction) -> travelers
-- ----------------------------------------------------------------------------
CREATE TABLE booking_travelers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    traveler_id UUID NOT NULL REFERENCES travelers(id) ON DELETE RESTRICT,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_lead     BOOLEAN NOT NULL DEFAULT false,
    price_tier  pricing_tier NOT NULL DEFAULT 'adult',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_booking_travelers_booking_traveler UNIQUE (booking_id, traveler_id)
);

CREATE INDEX idx_booking_travelers_booking_id  ON booking_travelers(booking_id);
CREATE INDEX idx_booking_travelers_traveler_id ON booking_travelers(traveler_id);
CREATE UNIQUE INDEX uq_booking_travelers_lead
    ON booking_travelers(booking_id) WHERE is_lead = true;

-- ----------------------------------------------------------------------------
-- booking_status_history (Transaction / ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_status booking_status,
    to_status   booking_status NOT NULL,
    changed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_status_history_booking_id ON booking_status_history(booking_id);

-- ----------------------------------------------------------------------------
-- booking_notes (Support)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_notes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    note       TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_notes_booking_id ON booking_notes(booking_id);
CREATE INDEX idx_booking_notes_tenant_id  ON booking_notes(tenant_id);

-- ----------------------------------------------------------------------------
-- booking_documents (Support)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_url    TEXT NOT NULL,
    file_name   VARCHAR(255),
    file_type   VARCHAR(50),
    file_size   BIGINT CHECK (file_size IS NULL OR file_size >= 0),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_documents_booking_id ON booking_documents(booking_id);
CREATE INDEX idx_booking_documents_tenant_id  ON booking_documents(tenant_id);

-- ----------------------------------------------------------------------------
-- invoices (Transaction) - 1 booking -> N invoices
-- ----------------------------------------------------------------------------
CREATE TABLE invoices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    status         invoice_status NOT NULL DEFAULT 'draft',
    issue_date     DATE,
    due_date       DATE,
    subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount     DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency       CHAR(3) NOT NULL DEFAULT 'USD',
    notes          TEXT,
    deleted_at     TIMESTAMPTZ,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_invoices_tenant_number UNIQUE (tenant_id, invoice_number),
    CONSTRAINT chk_invoices_total CHECK (total_amount = subtotal + tax_amount),
    CONSTRAINT chk_invoices_due_date CHECK (
        due_date IS NULL OR issue_date IS NULL OR due_date >= issue_date
    )
);

CREATE INDEX idx_invoices_tenant_id  ON invoices(tenant_id);
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_invoices_status     ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_due_date   ON invoices(tenant_id, due_date);

-- ----------------------------------------------------------------------------
-- payments (Transaction) - invoice_id optional, booking_id required
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    invoice_id       UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount           DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    method           payment_method NOT NULL,
    reference_number VARCHAR(100),
    payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    notes            TEXT,
    deleted_at       TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_tenant_id    ON payments(tenant_id);
CREATE INDEX idx_payments_booking_id   ON payments(booking_id);
CREATE INDEX idx_payments_invoice_id   ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(tenant_id, payment_date);

-- ----------------------------------------------------------------------------
-- payment_transactions (Transaction / ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE payment_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id       UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL DEFAULT 'payment',
    amount           DECIMAL(12,2) NOT NULL,
    metadata         JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_payment_id ON payment_transactions(payment_id);


-- ========== 005_supporting.sql ==========

-- ============================================================================
-- TravelOS Migration 005_supporting
-- Cross-cutting support tables
-- Tables: notifications, audit_logs
-- ============================================================================

CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- ----------------------------------------------------------------------------
-- notifications (Support) - in-app notifications per user
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    message     TEXT,
    entity_type VARCHAR(50),
    entity_id   UUID,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_tenant_id    ON notifications(tenant_id);
CREATE INDEX idx_notifications_user_id      ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread  ON notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- audit_logs (Audit) - append-only change trail
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action     audit_action NOT NULL,
    table_name VARCHAR(63) NOT NULL,
    record_id  UUID,
    old_data   JSONB,
    new_data   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_id  ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_record     ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);


-- ========== 006_rls_policies.sql ==========

-- ============================================================================
-- TravelOS Migration 006_rls_policies
-- Row Level Security: helper functions, RLS enablement, and policies.
--
-- JWT claims are expected under app_metadata (injected via a Supabase
-- custom access token hook): app_metadata.tenant_id, app_metadata.role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (read JWT claims)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
        NULLIF(auth.jwt() ->> 'tenant_id', '')
    )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
    SELECT COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
        NULLIF(auth.jwt() ->> 'user_role', '')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
    SELECT public.current_user_role() = 'super_admin';
$$;

-- ----------------------------------------------------------------------------
-- tenants: members see their own tenant; super_admin sees all
-- ----------------------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON tenants
    FOR SELECT USING (id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY tenants_modify ON tenants
    FOR ALL USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- Global reference tables: read for any authenticated user; write super_admin
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles', 'permissions', 'role_permissions', 'countries', 'cities'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

        EXECUTE format($f$
            CREATE POLICY %1$s_read ON %1$I
            FOR SELECT USING (auth.uid() IS NOT NULL);
        $f$, t);

        EXECUTE format($f$
            CREATE POLICY %1$s_admin_write ON %1$I
            FOR ALL USING (public.is_super_admin())
            WITH CHECK (public.is_super_admin());
        $f$, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Tenant-scoped tables: full isolation by tenant_id (or super_admin)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'tenant_settings', 'users', 'user_roles', 'destinations',
        'customers', 'customer_contacts', 'customer_addresses', 'travelers',
        'packages', 'package_days', 'package_day_activities',
        'package_pricing', 'package_media',
        'bookings', 'booking_items', 'booking_travelers',
        'booking_status_history', 'booking_notes', 'booking_documents',
        'invoices', 'payments', 'payment_transactions', 'notifications'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

        EXECUTE format($f$
            CREATE POLICY %1$s_tenant_isolation ON %1$I
            FOR ALL
            USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
            WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
        $f$, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- audit_logs: read within tenant; INSERT only; no UPDATE/DELETE
-- ----------------------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT WITH CHECK (true);


-- ========== 007_functions_triggers.sql ==========

-- ============================================================================
-- TravelOS Migration 007_functions_triggers
-- Business logic functions and triggers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. updated_at maintenance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'tenants', 'tenant_settings', 'users', 'countries', 'cities',
        'destinations', 'customers', 'customer_contacts', 'customer_addresses',
        'travelers', 'packages', 'package_days', 'package_day_activities',
        'package_pricing', 'bookings', 'booking_items', 'booking_travelers',
        'booking_notes', 'booking_documents', 'invoices', 'payments'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Audit logging
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_tenant UUID;
    v_record UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_old := to_jsonb(OLD); v_record := OLD.id; v_tenant := OLD.tenant_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_record := NEW.id; v_tenant := NEW.tenant_id;
    ELSE
        v_new := to_jsonb(NEW); v_record := NEW.id; v_tenant := NEW.tenant_id;
    END IF;

    INSERT INTO audit_logs (tenant_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_tenant, auth.uid(), TG_OP::audit_action, TG_TABLE_NAME, v_record, v_old, v_new);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'destinations', 'customers', 'travelers', 'packages',
        'bookings', 'invoices', 'payments'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION public.log_audit();', t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Booking reference number (BK-YYYY-######)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
        SELECT count(*) + 1 INTO v_seq
        FROM bookings
        WHERE tenant_id = NEW.tenant_id
          AND date_part('year', created_at) = date_part('year', now());

        NEW.reference_number := 'BK-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_reference BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION public.generate_booking_reference();

-- ----------------------------------------------------------------------------
-- 4. Invoice number (INV-YYYY-######)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        SELECT count(*) + 1 INTO v_seq
        FROM invoices
        WHERE tenant_id = NEW.tenant_id
          AND date_part('year', created_at) = date_part('year', now());

        NEW.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoices_number BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

-- ----------------------------------------------------------------------------
-- 5. Booking item total + booking total recalculation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calc_booking_item_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.total_price := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_items_total BEFORE INSERT OR UPDATE ON booking_items
    FOR EACH ROW EXECUTE FUNCTION public.calc_booking_item_total();

CREATE OR REPLACE FUNCTION public.recalc_booking_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_booking UUID;
BEGIN
    v_booking := COALESCE(NEW.booking_id, OLD.booking_id);

    UPDATE bookings
    SET total_amount = COALESCE(
            (SELECT sum(total_price) FROM booking_items WHERE booking_id = v_booking), 0),
        updated_at = now()
    WHERE id = v_booking;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_booking_items_recalc AFTER INSERT OR UPDATE OR DELETE ON booking_items
    FOR EACH ROW EXECUTE FUNCTION public.recalc_booking_total();

-- ----------------------------------------------------------------------------
-- 6. Booking status history
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_booking_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO booking_status_history (booking_id, tenant_id, from_status, to_status, changed_by)
        VALUES (NEW.id, NEW.tenant_id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_status_history AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION public.track_booking_status();

-- ----------------------------------------------------------------------------
-- 7. Overpayment guard (per booking)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_overpayment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_total NUMERIC;
    v_paid  NUMERIC;
BEGIN
    SELECT total_amount INTO v_total FROM bookings WHERE id = NEW.booking_id;

    SELECT COALESCE(sum(amount), 0) INTO v_paid
    FROM payments
    WHERE booking_id = NEW.booking_id
      AND deleted_at IS NULL
      AND id <> NEW.id;

    IF v_total > 0 AND (v_paid + NEW.amount) > v_total THEN
        RAISE EXCEPTION 'Payment % exceeds remaining balance (total %, already paid %)',
            NEW.amount, v_total, v_paid;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_overpayment BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION public.prevent_overpayment();

-- ----------------------------------------------------------------------------
-- 8. Payment -> booking & invoice status recalculation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_booking UUID;
    v_invoice UUID;
    v_total   NUMERIC;
    v_paid    NUMERIC;
BEGIN
    v_booking := COALESCE(NEW.booking_id, OLD.booking_id);
    v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Booking payment_status
    SELECT total_amount INTO v_total FROM bookings WHERE id = v_booking;
    SELECT COALESCE(sum(amount), 0) INTO v_paid
    FROM payments WHERE booking_id = v_booking AND deleted_at IS NULL;

    UPDATE bookings
    SET payment_status = CASE
            WHEN v_paid <= 0 THEN 'unpaid'::payment_status
            WHEN v_paid < v_total THEN 'partial'::payment_status
            ELSE 'paid'::payment_status
        END,
        updated_at = now()
    WHERE id = v_booking;

    -- Invoice status (only when payment is linked to an invoice)
    IF v_invoice IS NOT NULL THEN
        SELECT total_amount INTO v_total FROM invoices WHERE id = v_invoice;
        SELECT COALESCE(sum(amount), 0) INTO v_paid
        FROM payments WHERE invoice_id = v_invoice AND deleted_at IS NULL;

        UPDATE invoices
        SET status = CASE
                WHEN v_paid <= 0 THEN status
                WHEN v_paid < v_total THEN 'partially_paid'::invoice_status
                ELSE 'paid'::invoice_status
            END,
            updated_at = now()
        WHERE id = v_invoice AND status NOT IN ('cancelled', 'void');
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_payments_status AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION public.update_payment_status();


-- ========== 008_seed_reference.sql ==========

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


-- ========== 009_auth_hook.sql ==========

-- ============================================================================
-- TravelOS Migration 009_auth_hook
-- Custom Access Token Hook: inject tenant_id + role into JWT app_metadata.
--
-- After applying this migration, enable the hook in Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token → Postgres function
--   Function: public.custom_access_token_hook
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    original_claims jsonb;
    new_claims      jsonb;
    user_role       text;
    user_tenant     uuid;
BEGIN
    original_claims := event->'claims';
    new_claims      := original_claims;

    SELECT r.name, ur.tenant_id
    INTO user_role, user_tenant
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (event->>'user_id')::uuid
    LIMIT 1;

    IF user_tenant IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,tenant_id}',
            to_jsonb(user_tenant::text),
            true
        );
    END IF;

    IF user_role IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,role}',
            to_jsonb(user_role),
            true
        );
    END IF;

    RETURN jsonb_set(event, '{claims}', new_claims);
END;
$$;

-- Required grants for Supabase Auth to invoke the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;
GRANT SELECT ON TABLE public.roles TO supabase_auth_admin;


-- ========== 010_seed_geography.sql ==========

-- ============================================================================
-- TravelOS Migration 010_seed_geography
-- Seed global countries and major cities for MVP.
-- Idempotent: safe to re-run (ON CONFLICT).
-- ============================================================================

INSERT INTO countries (iso2, iso3, name, phone_code, currency_code) VALUES
    ('US', 'USA', 'United States',       '+1',   'USD'),
    ('GB', 'GBR', 'United Kingdom',      '+44',  'GBP'),
    ('FR', 'FRA', 'France',              '+33',  'EUR'),
    ('DE', 'DEU', 'Germany',             '+49',  'EUR'),
    ('IT', 'ITA', 'Italy',               '+39',  'EUR'),
    ('ES', 'ESP', 'Spain',               '+34',  'EUR'),
    ('AE', 'ARE', 'United Arab Emirates','+971', 'AED'),
    ('SA', 'SAU', 'Saudi Arabia',        '+966', 'SAR'),
    ('TR', 'TUR', 'Turkey',              '+90',  'TRY'),
    ('EG', 'EGY', 'Egypt',               '+20',  'EGP'),
    ('TH', 'THA', 'Thailand',            '+66',  'THB'),
    ('JP', 'JPN', 'Japan',               '+81',  'JPY'),
    ('AU', 'AUS', 'Australia',           '+61',  'AUD'),
    ('CA', 'CAN', 'Canada',              '+1',   'CAD'),
    ('IN', 'IND', 'India',               '+91',  'INR'),
    ('MY', 'MYS', 'Malaysia',            '+60',  'MYR'),
    ('SG', 'SGP', 'Singapore',           '+65',  'SGD'),
    ('QA', 'QAT', 'Qatar',               '+974', 'QAR'),
    ('JO', 'JOR', 'Jordan',              '+962', 'JOD'),
    ('MA', 'MAR', 'Morocco',             '+212', 'MAD')
ON CONFLICT (iso2) DO NOTHING;

-- Cities (resolved by country iso2)
INSERT INTO cities (country_id, name, state_region) VALUES
    ((SELECT id FROM countries WHERE iso2 = 'US'), 'New York',      'New York'),
    ((SELECT id FROM countries WHERE iso2 = 'US'), 'Los Angeles',   'California'),
    ((SELECT id FROM countries WHERE iso2 = 'US'), 'Miami',         'Florida'),
    ((SELECT id FROM countries WHERE iso2 = 'GB'), 'London',        'England'),
    ((SELECT id FROM countries WHERE iso2 = 'GB'), 'Edinburgh',     'Scotland'),
    ((SELECT id FROM countries WHERE iso2 = 'FR'), 'Paris',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'FR'), 'Nice',          NULL),
    ((SELECT id FROM countries WHERE iso2 = 'DE'), 'Berlin',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'DE'), 'Munich',        'Bavaria'),
    ((SELECT id FROM countries WHERE iso2 = 'IT'), 'Rome',          'Lazio'),
    ((SELECT id FROM countries WHERE iso2 = 'IT'), 'Milan',         'Lombardy'),
    ((SELECT id FROM countries WHERE iso2 = 'ES'), 'Barcelona',     'Catalonia'),
    ((SELECT id FROM countries WHERE iso2 = 'ES'), 'Madrid',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'AE'), 'Dubai',         'Dubai'),
    ((SELECT id FROM countries WHERE iso2 = 'AE'), 'Abu Dhabi',     'Abu Dhabi'),
    ((SELECT id FROM countries WHERE iso2 = 'SA'), 'Riyadh',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'SA'), 'Jeddah',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'TR'), 'Istanbul',      NULL),
    ((SELECT id FROM countries WHERE iso2 = 'TR'), 'Antalya',       NULL),
    ((SELECT id FROM countries WHERE iso2 = 'EG'), 'Cairo',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'EG'), 'Luxor',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'TH'), 'Bangkok',       NULL),
    ((SELECT id FROM countries WHERE iso2 = 'TH'), 'Phuket',        NULL),
    ((SELECT id FROM countries WHERE iso2 = 'JP'), 'Tokyo',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'JP'), 'Osaka',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'AU'), 'Sydney',        'New South Wales'),
    ((SELECT id FROM countries WHERE iso2 = 'AU'), 'Melbourne',     'Victoria'),
    ((SELECT id FROM countries WHERE iso2 = 'CA'), 'Toronto',       'Ontario'),
    ((SELECT id FROM countries WHERE iso2 = 'CA'), 'Vancouver',     'British Columbia'),
    ((SELECT id FROM countries WHERE iso2 = 'IN'), 'Mumbai',        'Maharashtra'),
    ((SELECT id FROM countries WHERE iso2 = 'IN'), 'Delhi',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'MY'), 'Kuala Lumpur',  NULL),
    ((SELECT id FROM countries WHERE iso2 = 'SG'), 'Singapore',     NULL),
    ((SELECT id FROM countries WHERE iso2 = 'QA'), 'Doha',          NULL),
    ((SELECT id FROM countries WHERE iso2 = 'JO'), 'Amman',         NULL),
    ((SELECT id FROM countries WHERE iso2 = 'MA'), 'Marrakech',     NULL),
    ((SELECT id FROM countries WHERE iso2 = 'MA'), 'Casablanca',    NULL)
ON CONFLICT (country_id, name, state_region) DO NOTHING;

