-- ============================================================================
-- TravelOS Migration 042_customer_notifications
-- Sprint 8C — Customer notifications, delivery log, staff inbox extensions
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE notification_delivery_channel AS ENUM ('in_app', 'email');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_delivery_status AS ENUM ('pending', 'sent', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_recipient_type AS ENUM ('staff_user', 'customer', 'email_address');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- customer_notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    portal_account_id   UUID REFERENCES customer_portal_accounts(id) ON DELETE SET NULL,
    domain_event_id     UUID REFERENCES domain_events(id) ON DELETE SET NULL,
    type                VARCHAR(100) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    message             TEXT,
    entity_type         VARCHAR(50),
    entity_id           UUID,
    action_url          TEXT,
    is_read             BOOLEAN NOT NULL DEFAULT false,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer
    ON customer_notifications(customer_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_portal
    ON customer_notifications(portal_account_id, created_at DESC)
    WHERE portal_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_notifications_event
    ON customer_notifications(domain_event_id)
    WHERE domain_event_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- notification_deliveries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain_event_id     UUID NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
    channel             notification_delivery_channel NOT NULL,
    recipient_type      notification_recipient_type NOT NULL,
    recipient_id        TEXT NOT NULL,
    status              notification_delivery_status NOT NULL DEFAULT 'pending',
    provider_id         TEXT,
    error_message       TEXT,
    attempted_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_notification_delivery UNIQUE (domain_event_id, channel, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_tenant
    ON notification_deliveries(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_event
    ON notification_deliveries(domain_event_id);

-- ----------------------------------------------------------------------------
-- Extend staff notifications
-- ----------------------------------------------------------------------------
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS domain_event_id UUID REFERENCES domain_events(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS action_url TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_domain_event
    ON notifications(domain_event_id)
    WHERE domain_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
    ON notifications(user_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- Link email logs to domain events
-- ----------------------------------------------------------------------------
ALTER TABLE email_delivery_logs
    ADD COLUMN IF NOT EXISTS domain_event_id UUID REFERENCES domain_events(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- RLS: customer_notifications
-- ----------------------------------------------------------------------------
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_notifications_portal ON customer_notifications
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    );

CREATE POLICY customer_notifications_portal_update ON customer_notifications
    FOR UPDATE TO authenticated
    USING (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    )
    WITH CHECK (
        public.is_portal_user()
        AND customer_id = public.portal_customer_id()
        AND tenant_id = public.portal_tenant_id()
    );

CREATE POLICY customer_notifications_staff ON customer_notifications
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

-- ----------------------------------------------------------------------------
-- RLS: notification_deliveries (staff admin read; writes via service role)
-- ----------------------------------------------------------------------------
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_deliveries_staff_select ON notification_deliveries
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

-- ----------------------------------------------------------------------------
-- RLS: staff notifications — user-scoped inbox (replace tenant-wide ALL)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;

CREATE POLICY notifications_select_own ON notifications
    FOR SELECT TO authenticated
    USING (
        public.is_crm_staff_user()
        AND user_id = auth.uid()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE TO authenticated
    USING (
        public.is_crm_staff_user()
        AND user_id = auth.uid()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    )
    WITH CHECK (
        user_id = auth.uid()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );
