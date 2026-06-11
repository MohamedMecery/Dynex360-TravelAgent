-- ============================================================================
-- TravelOS Migration 040_customer_portal_transactions
-- Sprint 8B — Customer self-service transactions (accept/reject, audit, documents)
-- Idempotent where noted; reverse: see DOWN section at end (manual)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Audit extensions for portal customer actors
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE audit_actor_type AS ENUM ('staff', 'customer');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS actor_type audit_actor_type NOT NULL DEFAULT 'staff',
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS portal_account_id UUID REFERENCES customer_portal_accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS event_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_audit_logs_customer_id ON audit_logs(customer_id)
    WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_name ON audit_logs(event_name)
    WHERE event_name IS NOT NULL;

-- Prevent FK failures when portal auth.uid() is not in public.users
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_tenant UUID;
    v_record UUID;
    v_user_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_old := to_jsonb(OLD); v_record := OLD.id; v_tenant := OLD.tenant_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_record := NEW.id; v_tenant := NEW.tenant_id;
    ELSE
        v_new := to_jsonb(NEW); v_record := NEW.id; v_tenant := NEW.tenant_id;
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = v_user_id
    ) THEN
        v_user_id := NULL;
    END IF;

    INSERT INTO audit_logs (
        tenant_id, user_id, action, table_name, record_id, old_data, new_data, actor_type
    )
    VALUES (
        v_tenant, v_user_id, TG_OP::audit_action, TG_TABLE_NAME, v_record, v_old, v_new, 'staff'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Explicit customer portal audit (API-layer after service-role mutations)
CREATE OR REPLACE FUNCTION public.log_portal_customer_audit(
    p_tenant_id UUID,
    p_customer_id UUID,
    p_portal_account_id UUID,
    p_table_name TEXT,
    p_record_id UUID,
    p_event_name TEXT,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        actor_type,
        customer_id,
        portal_account_id,
        event_name
    )
    VALUES (
        p_tenant_id,
        NULL,
        'UPDATE',
        p_table_name,
        p_record_id,
        p_old_data,
        p_new_data,
        'customer',
        p_customer_id,
        p_portal_account_id,
        p_event_name
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_portal_customer_audit(UUID, UUID, UUID, TEXT, UUID, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_portal_customer_audit(UUID, UUID, UUID, TEXT, UUID, TEXT, JSONB, JSONB) TO service_role;

-- ----------------------------------------------------------------------------
-- booking_documents portal read policy
-- ----------------------------------------------------------------------------
CREATE POLICY booking_documents_portal_select ON booking_documents
    FOR SELECT TO authenticated
    USING (
        public.is_portal_user()
        AND tenant_id = public.portal_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.bookings b
            WHERE b.id = booking_documents.booking_id
              AND b.customer_id = public.portal_customer_id()
              AND b.deleted_at IS NULL
        )
    );

-- ============================================================================
-- DOWN (manual rollback reference — not auto-applied)
-- DROP POLICY booking_documents_portal_select ON booking_documents;
-- DROP FUNCTION log_portal_customer_audit;
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS event_name, ...;
-- ============================================================================
