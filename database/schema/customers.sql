-- TravelOS: Customers Schema
-- Version: 1.0 MVP

CREATE TYPE customer_type AS ENUM ('individual', 'corporate');
CREATE TYPE address_type AS ENUM ('billing', 'mailing', 'other');

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type customer_type NOT NULL DEFAULT 'individual',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(255),
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_name ON customers(tenant_id, last_name, first_name);
CREATE UNIQUE INDEX idx_customers_email_unique
    ON customers(tenant_id, email)
    WHERE deleted_at IS NULL AND email IS NOT NULL;

-- Customer Contacts
CREATE TABLE customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX idx_customer_contacts_tenant_id ON customer_contacts(tenant_id);

-- Customer Addresses (country/city normalized to geography FKs)
-- Requires: countries, cities (see geography.sql)
CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type address_type NOT NULL DEFAULT 'billing',
    street VARCHAR(255),
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
    postal_code VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_tenant_id ON customer_addresses(tenant_id);
CREATE INDEX idx_customer_addresses_country_id ON customer_addresses(country_id);
CREATE INDEX idx_customer_addresses_city_id ON customer_addresses(city_id);
