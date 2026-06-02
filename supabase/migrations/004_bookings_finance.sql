-- ============================================================================
-- TravelOS Migration 004_bookings_finance
-- Operations + Finance context
-- Tables: bookings, booking_items, booking_travelers, booking_status_history,
--         booking_notes, booking_documents, invoices, payments,
--         payment_transactions
-- ============================================================================

CREATE TYPE booking_status   AS ENUM ('draft', 'confirmed', 'completed', 'cancelled');
CREATE TYPE payment_status   AS ENUM ('unpaid', 'partial', 'paid');
CREATE TYPE invoice_status   AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'cancelled', 'void');
CREATE TYPE payment_method   AS ENUM ('cash', 'bank_transfer', 'card', 'other');
CREATE TYPE transaction_type AS ENUM ('payment', 'refund', 'adjustment');

-- ----------------------------------------------------------------------------
-- bookings (Core / transaction hub)
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference_number VARCHAR(50) NOT NULL,
    customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    package_id       UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    status           booking_status NOT NULL DEFAULT 'draft',
    payment_status   payment_status NOT NULL DEFAULT 'unpaid',
    total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency         CHAR(3) NOT NULL DEFAULT 'USD',
    travel_date      DATE,
    notes            TEXT,
    deleted_at       TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bookings_tenant_reference UNIQUE (tenant_id, reference_number)
);

CREATE INDEX idx_bookings_tenant_id   ON bookings(tenant_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_package_id  ON bookings(package_id);
CREATE INDEX idx_bookings_status      ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_travel_date ON bookings(tenant_id, travel_date);

-- ----------------------------------------------------------------------------
-- booking_items (Transaction)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price  DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id);

-- ----------------------------------------------------------------------------
-- booking_travelers (Junction) -> travelers
-- ----------------------------------------------------------------------------
CREATE TABLE booking_travelers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    traveler_id UUID NOT NULL REFERENCES travelers(id) ON DELETE RESTRICT,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_lead     BOOLEAN NOT NULL DEFAULT false,
    price_tier  pricing_tier NOT NULL DEFAULT 'adult',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_booking_travelers_booking_traveler UNIQUE (booking_id, traveler_id)
);

CREATE INDEX idx_booking_travelers_booking_id  ON booking_travelers(booking_id);
CREATE INDEX idx_booking_travelers_traveler_id ON booking_travelers(traveler_id);
CREATE UNIQUE INDEX uq_booking_travelers_lead
    ON booking_travelers(booking_id) WHERE is_lead = true;

-- ----------------------------------------------------------------------------
-- booking_status_history (Transaction / ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    from_status booking_status,
    to_status   booking_status NOT NULL,
    changed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_status_history_booking_id ON booking_status_history(booking_id);

-- ----------------------------------------------------------------------------
-- booking_notes (Support)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_notes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    note       TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_notes_booking_id ON booking_notes(booking_id);
CREATE INDEX idx_booking_notes_tenant_id  ON booking_notes(tenant_id);

-- ----------------------------------------------------------------------------
-- booking_documents (Support)
-- ----------------------------------------------------------------------------
CREATE TABLE booking_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_url    TEXT NOT NULL,
    file_name   VARCHAR(255),
    file_type   VARCHAR(50),
    file_size   BIGINT CHECK (file_size IS NULL OR file_size >= 0),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_documents_booking_id ON booking_documents(booking_id);
CREATE INDEX idx_booking_documents_tenant_id  ON booking_documents(tenant_id);

-- ----------------------------------------------------------------------------
-- invoices (Transaction) - 1 booking -> N invoices
-- ----------------------------------------------------------------------------
CREATE TABLE invoices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    status         invoice_status NOT NULL DEFAULT 'draft',
    issue_date     DATE,
    due_date       DATE,
    subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount     DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency       CHAR(3) NOT NULL DEFAULT 'USD',
    notes          TEXT,
    deleted_at     TIMESTAMPTZ,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_invoices_tenant_number UNIQUE (tenant_id, invoice_number),
    CONSTRAINT chk_invoices_total CHECK (total_amount = subtotal + tax_amount),
    CONSTRAINT chk_invoices_due_date CHECK (
        due_date IS NULL OR issue_date IS NULL OR due_date >= issue_date
    )
);

CREATE INDEX idx_invoices_tenant_id  ON invoices(tenant_id);
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_invoices_status     ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_due_date   ON invoices(tenant_id, due_date);

-- ----------------------------------------------------------------------------
-- payments (Transaction) - invoice_id optional, booking_id required
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    invoice_id       UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount           DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    method           payment_method NOT NULL,
    reference_number VARCHAR(100),
    payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    notes            TEXT,
    deleted_at       TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_tenant_id    ON payments(tenant_id);
CREATE INDEX idx_payments_booking_id   ON payments(booking_id);
CREATE INDEX idx_payments_invoice_id   ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(tenant_id, payment_date);

-- ----------------------------------------------------------------------------
-- payment_transactions (Transaction / ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE payment_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id       UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL DEFAULT 'payment',
    amount           DECIMAL(12,2) NOT NULL,
    metadata         JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_payment_id ON payment_transactions(payment_id);
