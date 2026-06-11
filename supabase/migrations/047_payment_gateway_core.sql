-- ============================================================================
-- TravelOS Migration 047_payment_gateway_core
-- Sprint 9A — Payment gateway core (orders, attempts, provider events)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE payment_provider AS ENUM ('paymob', 'stripe');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_order_type AS ENUM (
        'quotation_deposit',
        'quotation_full',
        'booking_balance',
        'invoice_pay'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_order_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_attempt_status AS ENUM (
        'created',
        'redirected',
        'authorized',
        'captured',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_ledger_source AS ENUM ('manual', 'gateway');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_automation_mode AS ENUM (
        'auto_on_full',
        'auto_on_deposit',
        'manual_after_payment'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- payment_orders — business checkout intent
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    quotation_id      UUID REFERENCES quotations(id) ON DELETE RESTRICT,
    booking_id        UUID REFERENCES bookings(id) ON DELETE RESTRICT,
    invoice_id        UUID REFERENCES invoices(id) ON DELETE SET NULL,
    order_type        payment_order_type NOT NULL,
    amount            DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency          VARCHAR(3) NOT NULL DEFAULT 'EGP',
    status            payment_order_status NOT NULL DEFAULT 'pending',
    provider          payment_provider NOT NULL DEFAULT 'paymob',
    idempotency_key   VARCHAR(255) NOT NULL,
    policy_snapshot   JSONB NOT NULL DEFAULT '{}',
    expires_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payment_orders_idempotency UNIQUE (idempotency_key),
    CONSTRAINT chk_payment_orders_target CHECK (
        quotation_id IS NOT NULL OR booking_id IS NOT NULL OR invoice_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_tenant_status
    ON payment_orders(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_customer
    ON payment_orders(tenant_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_quotation
    ON payment_orders(quotation_id)
    WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_booking
    ON payment_orders(booking_id)
    WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_open_quotation
    ON payment_orders(quotation_id)
    WHERE quotation_id IS NOT NULL
      AND status IN ('pending', 'processing');

-- ----------------------------------------------------------------------------
-- payment_attempts — provider session / charge
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_order_id    UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    provider            payment_provider NOT NULL,
    provider_reference  VARCHAR(255) NOT NULL,
    status              payment_attempt_status NOT NULL DEFAULT 'created',
    amount              DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'EGP',
    failure_code        VARCHAR(100),
    failure_message     TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    captured_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payment_attempts_provider_ref UNIQUE (provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order
    ON payment_attempts(payment_order_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- payment_provider_events — immutable webhook audit
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_provider_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID REFERENCES tenants(id) ON DELETE SET NULL,
    provider            payment_provider NOT NULL,
    provider_event_id   VARCHAR(255) NOT NULL,
    event_type          VARCHAR(100) NOT NULL,
    payload             JSONB NOT NULL DEFAULT '{}',
    signature_valid     BOOLEAN NOT NULL DEFAULT false,
    processing_result   VARCHAR(50),
    processed_at        TIMESTAMPTZ,
    idempotency_key     VARCHAR(255) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payment_provider_events_idempotency UNIQUE (idempotency_key),
    CONSTRAINT uq_payment_provider_events_provider_event UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_provider_events_created
    ON payment_provider_events(created_at DESC);
