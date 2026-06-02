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
