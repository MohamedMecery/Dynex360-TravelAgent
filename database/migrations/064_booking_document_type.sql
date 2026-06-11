-- ============================================================================
-- TravelOS Migration 064_booking_document_type
-- Sprint 9D — Semantic document types for operations readiness checks
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE booking_document_type AS ENUM (
        'other',
        'passport',
        'visa',
        'voucher',
        'insurance',
        'ticket',
        'hotel_confirmation',
        'itinerary'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE booking_documents
    ADD COLUMN IF NOT EXISTS document_type booking_document_type NOT NULL DEFAULT 'other';

CREATE INDEX IF NOT EXISTS idx_booking_documents_tenant_type
    ON booking_documents(tenant_id, booking_id, document_type);

COMMENT ON COLUMN booking_documents.document_type IS
    'Sprint 9D — semantic type for operations readiness; default other for legacy rows.';
