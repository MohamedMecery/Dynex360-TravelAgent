-- TravelOS: Packages Schema
-- Version: 1.0 MVP

CREATE TYPE package_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE pricing_tier AS ENUM ('adult', 'child', 'infant');

-- Packages
-- Requires: destinations (see geography.sql)
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_days INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
    status package_status NOT NULL DEFAULT 'draft',
    cover_image_url TEXT,
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packages_tenant_id ON packages(tenant_id);
CREATE INDEX idx_packages_status ON packages(tenant_id, status);
CREATE INDEX idx_packages_destination_id ON packages(destination_id);

-- Package Days (day-by-day plan)
CREATE TABLE package_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number > 0),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(package_id, day_number)
);

CREATE INDEX idx_package_days_package_id ON package_days(package_id);
CREATE INDEX idx_package_days_tenant_id ON package_days(tenant_id);

-- Package Day Activities (activities within a day)
CREATE TABLE package_day_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_day_id UUID NOT NULL REFERENCES package_days(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_pda_time CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

CREATE INDEX idx_package_day_activities_day_id ON package_day_activities(package_day_id);
CREATE INDEX idx_package_day_activities_tenant_id ON package_day_activities(tenant_id);

-- Package Pricing
CREATE TABLE package_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier pricing_tier NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(package_id, tier)
);

CREATE INDEX idx_package_pricing_package_id ON package_pricing(package_id);

-- Package Media
CREATE TABLE package_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_package_media_package_id ON package_media(package_id);
