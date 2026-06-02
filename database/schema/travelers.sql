-- TravelOS: Travelers Schema
-- Version: 2.0 Expanded MVP
-- Reusable traveler profiles, tenant-scoped, optionally linked to a customer.

CREATE TYPE traveler_gender AS ENUM ('male', 'female', 'other', 'unspecified');

CREATE TABLE travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender traveler_gender NOT NULL DEFAULT 'unspecified',
    nationality_country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
    passport_number VARCHAR(50),
    passport_expiry DATE,
    email VARCHAR(255),
    phone VARCHAR(50),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_travelers_passport_expiry
        CHECK (passport_expiry IS NULL OR date_of_birth IS NULL OR passport_expiry > date_of_birth)
);

CREATE INDEX idx_travelers_tenant_id ON travelers(tenant_id);
CREATE INDEX idx_travelers_customer_id ON travelers(customer_id);
CREATE INDEX idx_travelers_nationality ON travelers(nationality_country_id);
CREATE INDEX idx_travelers_name ON travelers(tenant_id, last_name, first_name);
