-- ============================================================================
-- TravelOS Migration 014_support
-- Support Agent case management: tickets and messages
-- ============================================================================

CREATE TYPE support_ticket_status AS ENUM (
    'open', 'pending', 'escalated', 'resolved', 'closed'
);

CREATE TYPE support_ticket_priority AS ENUM (
    'low', 'medium', 'high', 'urgent'
);

CREATE TYPE support_message_author_type AS ENUM (
    'user', 'customer', 'agent', 'system'
);

-- ----------------------------------------------------------------------------
-- support_tickets
-- ----------------------------------------------------------------------------
CREATE TABLE support_tickets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_number     TEXT NOT NULL,
    status            support_ticket_status NOT NULL DEFAULT 'open',
    priority          support_ticket_priority NOT NULL DEFAULT 'medium',
    customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
    booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
    assigned_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    subject           TEXT NOT NULL,
    deleted_at        TIMESTAMPTZ,
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_support_tickets_tenant_number UNIQUE (tenant_id, ticket_number)
);

CREATE INDEX idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_status     ON support_tickets(tenant_id, status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_support_tickets_customer     ON support_tickets(customer_id);
CREATE INDEX idx_support_tickets_booking      ON support_tickets(booking_id);
CREATE INDEX idx_support_tickets_assigned     ON support_tickets(assigned_user_id);

-- ----------------------------------------------------------------------------
-- support_ticket_messages
-- ----------------------------------------------------------------------------
CREATE TABLE support_ticket_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_type     support_message_author_type NOT NULL,
    author_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_tenant_id ON support_ticket_messages(tenant_id);

CREATE TRIGGER trg_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
