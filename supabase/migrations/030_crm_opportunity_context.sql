-- ============================================================================
-- TravelOS Migration 030_crm_opportunity_context
-- Preserve lead context on opportunities; CRM custom bookings (no package_id on opportunities)
-- ============================================================================

-- Lead context copied at convert time (not package_id)
ALTER TABLE opportunities
    ADD COLUMN IF NOT EXISTS lead_source lead_source,
    ADD COLUMN IF NOT EXISTS preferred_contact_channel preferred_contact_channel,
    ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

-- Bookings: package-based OR custom line-item drafts from opportunities
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;

ALTER TABLE bookings
    ALTER COLUMN package_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_opportunity_id ON bookings(opportunity_id);

COMMENT ON COLUMN opportunities.lead_source IS 'Copied from lead at conversion; frozen spec has no package_id on opportunities';
COMMENT ON COLUMN bookings.package_id IS 'NULL for custom CRM drafts; package-based bookings set package_id';
