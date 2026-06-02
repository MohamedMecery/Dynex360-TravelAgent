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
