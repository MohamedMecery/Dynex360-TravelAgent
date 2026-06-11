-- ============================================================================
-- TravelOS Migration 055_notification_delivery_whatsapp
-- Sprint 9B — Extend delivery channel + dispatch job type for WhatsApp
-- ============================================================================

ALTER TYPE notification_delivery_channel ADD VALUE IF NOT EXISTS 'whatsapp';

ALTER TYPE event_dispatch_job_type ADD VALUE IF NOT EXISTS 'dispatch.whatsapp';

ALTER TYPE notification_recipient_type ADD VALUE IF NOT EXISTS 'phone_number';

-- Link notification_deliveries to whatsapp_messages after messages table exists
ALTER TABLE whatsapp_messages
    ADD CONSTRAINT fk_whatsapp_messages_notification_delivery
    FOREIGN KEY (notification_delivery_id)
    REFERENCES notification_deliveries(id)
    ON DELETE SET NULL;

COMMENT ON TYPE notification_delivery_channel IS
    'Sprint 8C/9B — in_app, email, whatsapp (push deferred).';
