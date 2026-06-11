-- ============================================================================
-- TravelOS Migration 049_payment_ledger_link
-- Sprint 9A — Link finance ledger to gateway layer
-- ============================================================================

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payment_order_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS payment_attempt_id UUID REFERENCES payment_attempts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source payment_ledger_source NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS provider payment_provider;

CREATE INDEX IF NOT EXISTS idx_payments_payment_order
    ON payments(payment_order_id)
    WHERE payment_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_payment_attempt
    ON payments(payment_attempt_id)
    WHERE payment_attempt_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_attempt
    ON payments(payment_attempt_id)
    WHERE payment_attempt_id IS NOT NULL AND deleted_at IS NULL;
