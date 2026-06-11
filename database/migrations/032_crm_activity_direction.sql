-- ============================================================================
-- TravelOS Migration 032_crm_activity_direction
-- incoming / outgoing for call, whatsapp, email
-- ============================================================================

CREATE TYPE activity_direction AS ENUM ('incoming', 'outgoing');

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS direction activity_direction;

-- Backfill directional activities (default outgoing for legacy rows)
UPDATE activities
SET direction = 'outgoing'
WHERE activity_type IN ('call', 'whatsapp', 'email')
  AND direction IS NULL
  AND deleted_at IS NULL;

ALTER TABLE activities
    ADD CONSTRAINT chk_activities_direction CHECK (
        (
            activity_type IN ('call', 'whatsapp', 'email')
            AND direction IS NOT NULL
        )
        OR (
            activity_type IN ('meeting', 'task')
            AND direction IS NULL
        )
    );
