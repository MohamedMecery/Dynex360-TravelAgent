-- ============================================================================
-- TravelOS Migration 026_crm_core_tables
-- CRM Phase 7A: leads, opportunities, activities
-- ============================================================================

-- ----------------------------------------------------------------------------
-- leads
-- ----------------------------------------------------------------------------
CREATE TABLE leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_number             TEXT NOT NULL,
    full_name               VARCHAR(200) NOT NULL,
    mobile                  VARCHAR(50),
    whatsapp                VARCHAR(50),
    email                   VARCHAR(255),
    preferred_contact_channel preferred_contact_channel NOT NULL DEFAULT 'whatsapp',
    source                  lead_source NOT NULL,
    destination_id          UUID REFERENCES destinations(id) ON DELETE SET NULL,
    destination_text        VARCHAR(255),
    expected_budget         DECIMAL(12, 2),
    currency                CHAR(3) NOT NULL DEFAULT 'USD',
    travel_date             DATE,
    pax_count               INTEGER NOT NULL DEFAULT 1,
    notes                   TEXT,
    owner_id                UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    status                  lead_status NOT NULL DEFAULT 'new',
    customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
    last_contacted_at       TIMESTAMPTZ,
    last_whatsapp_at        TIMESTAMPTZ,
    lost_reason             TEXT,
    deleted_at              TIMESTAMPTZ,
    created_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_leads_tenant_number UNIQUE (tenant_id, lead_number),
    CONSTRAINT chk_leads_pax_count CHECK (pax_count > 0)
);

CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_tenant_owner ON leads(tenant_id, owner_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_tenant_source ON leads(tenant_id, source);
CREATE INDEX idx_leads_tenant_created ON leads(tenant_id, created_at DESC);
CREATE INDEX idx_leads_tenant_last_contacted ON leads(tenant_id, last_contacted_at DESC NULLS LAST);
CREATE UNIQUE INDEX idx_leads_tenant_email_unique ON leads(tenant_id, email)
    WHERE deleted_at IS NULL AND email IS NOT NULL;

-- ----------------------------------------------------------------------------
-- opportunities (no package_id — sales object only)
-- ----------------------------------------------------------------------------
CREATE TABLE opportunities (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    opportunity_number      TEXT NOT NULL,
    lead_id                 UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
    destination_id          UUID REFERENCES destinations(id) ON DELETE SET NULL,
    destination_text        VARCHAR(255),
    expected_budget         DECIMAL(12, 2),
    estimated_revenue       DECIMAL(12, 2),
    currency                CHAR(3) NOT NULL DEFAULT 'USD',
    expected_travel_date    DATE,
    pax_count               INTEGER NOT NULL DEFAULT 1,
    probability             SMALLINT,
    expected_close_date     DATE,
    stage                   opportunity_stage NOT NULL DEFAULT 'discovery',
    owner_id                UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    notes                   TEXT,
    deleted_at              TIMESTAMPTZ,
    created_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_opportunities_tenant_number UNIQUE (tenant_id, opportunity_number),
    CONSTRAINT chk_opportunities_pax_count CHECK (pax_count > 0),
    CONSTRAINT chk_opportunities_probability CHECK (
        probability IS NULL OR (probability >= 0 AND probability <= 100)
    )
);

CREATE INDEX idx_opportunities_tenant_stage ON opportunities(tenant_id, stage)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_tenant_owner ON opportunities(tenant_id, owner_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX idx_opportunities_customer_id ON opportunities(customer_id);

-- ----------------------------------------------------------------------------
-- activities
-- ----------------------------------------------------------------------------
CREATE TABLE activities (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    activity_type           activity_type NOT NULL,
    subject                 VARCHAR(255) NOT NULL,
    description             TEXT,
    due_date                TIMESTAMPTZ,
    assigned_to             UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    related_lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
    related_opportunity_id  UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    related_customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
    status                  activity_status NOT NULL DEFAULT 'open',
    completed_at            TIMESTAMPTZ,
    channel_meta            JSONB NOT NULL DEFAULT '{}',
    deleted_at              TIMESTAMPTZ,
    created_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_activities_related CHECK (
        num_nonnulls(related_lead_id, related_opportunity_id, related_customer_id) >= 1
    )
);

CREATE INDEX idx_activities_tenant_assigned ON activities(tenant_id, assigned_to)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_tenant_due ON activities(tenant_id, due_date)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_related_lead ON activities(related_lead_id);
CREATE INDEX idx_activities_related_opportunity ON activities(related_opportunity_id);
CREATE INDEX idx_activities_related_customer ON activities(related_customer_id);
