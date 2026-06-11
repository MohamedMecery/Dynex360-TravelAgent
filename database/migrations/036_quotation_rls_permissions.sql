-- ============================================================================
-- TravelOS Migration 036_quotation_rls_permissions
-- Quotation RLS, permissions seed, Customer 360 timeline events
-- ============================================================================

-- ----------------------------------------------------------------------------
-- quotations RLS
-- ----------------------------------------------------------------------------
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotations_select ON quotations
    FOR SELECT
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_read_row(owner_id, 'quotations.read_all')
    );

CREATE POLICY quotations_insert ON quotations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND (
            public.is_super_admin()
            OR public.has_crm_permission('quotations.write')
            OR public.has_crm_permission('quotations.write_all')
        )
    );

CREATE POLICY quotations_update ON quotations
    FOR UPDATE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_write_row(owner_id, 'quotations.write', 'quotations.write_all')
    )
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        OR public.is_super_admin()
    );

CREATE POLICY quotations_delete ON quotations
    FOR DELETE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND public.crm_can_write_row(owner_id, 'quotations.write', 'quotations.write_all')
    );

-- ----------------------------------------------------------------------------
-- quotation_items RLS (tenant_id on row)
-- ----------------------------------------------------------------------------
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotation_items_select ON quotation_items
    FOR SELECT
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND EXISTS (
            SELECT 1
            FROM public.quotations q
            WHERE q.id = quotation_items.quotation_id
              AND public.crm_can_read_row(q.owner_id, 'quotations.read_all')
        )
    );

CREATE POLICY quotation_items_insert ON quotation_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND EXISTS (
            SELECT 1
            FROM public.quotations q
            WHERE q.id = quotation_items.quotation_id
              AND public.crm_can_write_row(q.owner_id, 'quotations.write', 'quotations.write_all')
        )
    );

CREATE POLICY quotation_items_update ON quotation_items
    FOR UPDATE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND EXISTS (
            SELECT 1
            FROM public.quotations q
            WHERE q.id = quotation_items.quotation_id
              AND public.crm_can_write_row(q.owner_id, 'quotations.write', 'quotations.write_all')
        )
    )
    WITH CHECK (
        tenant_id = public.current_tenant_id()
        OR public.is_super_admin()
    );

CREATE POLICY quotation_items_delete ON quotation_items
    FOR DELETE
    TO authenticated
    USING (
        (
            tenant_id = public.current_tenant_id()
            OR public.is_super_admin()
        )
        AND EXISTS (
            SELECT 1
            FROM public.quotations q
            WHERE q.id = quotation_items.quotation_id
              AND public.crm_can_write_row(q.owner_id, 'quotations.write', 'quotations.write_all')
        )
    );

-- ----------------------------------------------------------------------------
-- Permissions seed
-- ----------------------------------------------------------------------------
INSERT INTO permissions (module, action, description) VALUES
    ('crm', 'quotations.read',         'Read own quotations'),
    ('crm', 'quotations.read_all',     'Read all tenant quotations'),
    ('crm', 'quotations.write',        'Create and update own quotations'),
    ('crm', 'quotations.write_all',    'Manage all tenant quotations'),
    ('crm', 'quotations.approve',      'Approve quotations (standard mode)'),
    ('crm', 'quotations.send',         'Send quotations to customer'),
    ('crm', 'quotations.accept',       'Accept quotations'),
    ('crm', 'quotations.convert',      'Convert accepted quotation to booking')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'tenant_admin')
  AND p.module = 'crm'
  AND p.action LIKE 'quotations.%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'crm'
    AND p.action IN (
        'quotations.read',
        'quotations.write',
        'quotations.send',
        'quotations.accept',
        'quotations.convert'
    )
WHERE r.name = 'sales_agent'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'crm'
    AND p.action IN ('quotations.read_all')
WHERE r.name = 'finance_officer'
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Customer 360 timeline — quotation events (Sprint 6)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_customer_timeline_events AS
SELECT
    tenant_id,
    customer_id,
    id,
    event_type,
    title,
    occurred_at,
    ref_table,
    ref_id,
    meta,
    timeline_bucket
FROM (
    SELECT
        l.tenant_id,
        l.customer_id,
        l.id,
        'lead_created'::text AS event_type,
        COALESCE(l.full_name, l.lead_number) AS title,
        l.created_at AS occurred_at,
        'leads'::text AS ref_table,
        l.id AS ref_id,
        jsonb_build_object(
            'lead_number', l.lead_number,
            'status', l.status,
            'source', l.source
        ) AS meta,
        'sales'::text AS timeline_bucket
    FROM leads l
    WHERE l.customer_id IS NOT NULL
      AND l.deleted_at IS NULL

    UNION ALL

    SELECT
        o.tenant_id,
        o.customer_id,
        o.id,
        'opportunity_created',
        COALESCE(o.opportunity_number, 'Opportunity'),
        o.created_at,
        'opportunities',
        o.id,
        jsonb_build_object(
            'opportunity_number', o.opportunity_number,
            'stage', o.stage
        ),
        'sales'
    FROM opportunities o
    WHERE o.customer_id IS NOT NULL
      AND o.deleted_at IS NULL

    UNION ALL

    SELECT
        o.tenant_id,
        o.customer_id,
        h.id,
        'opportunity.stage_changed',
        COALESCE(h.from_stage::text, '—') || ' → ' || h.to_stage::text,
        h.changed_at,
        'opportunity_stage_history',
        h.id,
        jsonb_build_object(
            'from_stage', h.from_stage,
            'to_stage', h.to_stage,
            'changed_by', h.changed_by,
            'opportunity_id', h.opportunity_id
        ),
        'sales'
    FROM opportunity_stage_history h
    INNER JOIN opportunities o ON o.id = h.opportunity_id
    WHERE o.customer_id IS NOT NULL
      AND o.deleted_at IS NULL

    UNION ALL

    SELECT
        q.tenant_id,
        q.customer_id,
        q.id,
        'quotation_created',
        q.quotation_number,
        q.created_at,
        'quotations',
        q.id,
        jsonb_build_object(
            'quotation_number', q.quotation_number,
            'status', q.status,
            'total_amount', q.total_amount,
            'currency', q.currency,
            'opportunity_id', q.opportunity_id
        ),
        'sales'
    FROM quotations q
    WHERE q.customer_id IS NOT NULL
      AND q.deleted_at IS NULL

    UNION ALL

    SELECT
        q.tenant_id,
        q.customer_id,
        q.id,
        'quotation_sent',
        q.quotation_number,
        q.sent_at,
        'quotations',
        q.id,
        jsonb_build_object(
            'quotation_number', q.quotation_number,
            'status', q.status,
            'total_amount', q.total_amount
        ),
        'sales'
    FROM quotations q
    WHERE q.customer_id IS NOT NULL
      AND q.deleted_at IS NULL
      AND q.sent_at IS NOT NULL

    UNION ALL

    SELECT
        q.tenant_id,
        q.customer_id,
        q.id,
        'quotation_viewed',
        q.quotation_number,
        q.viewed_at,
        'quotations',
        q.id,
        jsonb_build_object('quotation_number', q.quotation_number),
        'sales'
    FROM quotations q
    WHERE q.customer_id IS NOT NULL
      AND q.deleted_at IS NULL
      AND q.viewed_at IS NOT NULL

    UNION ALL

    SELECT
        q.tenant_id,
        q.customer_id,
        q.id,
        'quotation_accepted',
        q.quotation_number,
        q.accepted_at,
        'quotations',
        q.id,
        jsonb_build_object(
            'quotation_number', q.quotation_number,
            'total_amount', q.total_amount,
            'currency', q.currency
        ),
        'sales'
    FROM quotations q
    WHERE q.customer_id IS NOT NULL
      AND q.deleted_at IS NULL
      AND q.accepted_at IS NOT NULL

    UNION ALL

    SELECT
        q.tenant_id,
        q.customer_id,
        q.id,
        'quotation_rejected',
        q.quotation_number,
        q.rejected_at,
        'quotations',
        q.id,
        jsonb_build_object(
            'quotation_number', q.quotation_number,
            'rejection_reason', q.rejection_reason
        ),
        'sales'
    FROM quotations q
    WHERE q.customer_id IS NOT NULL
      AND q.deleted_at IS NULL
      AND q.rejected_at IS NOT NULL

    UNION ALL

    SELECT
        q.tenant_id,
        q.customer_id,
        q.id,
        'quotation_converted',
        q.quotation_number || ' → booking',
        COALESCE(b.created_at, q.updated_at),
        'quotations',
        q.id,
        jsonb_build_object(
            'quotation_number', q.quotation_number,
            'booking_id', q.booking_id,
            'reference_number', b.reference_number
        ),
        'sales'
    FROM quotations q
    LEFT JOIN bookings b ON b.id = q.booking_id
    WHERE q.customer_id IS NOT NULL
      AND q.deleted_at IS NULL
      AND q.status = 'converted_to_booking'

    UNION ALL

    SELECT
        a.tenant_id,
        a.related_customer_id AS customer_id,
        a.id,
        CASE
            WHEN a.activity_type = 'call' AND a.direction = 'incoming' THEN 'activity.call.incoming'
            WHEN a.activity_type = 'call' THEN 'activity.call.outgoing'
            WHEN a.activity_type = 'whatsapp' AND a.direction = 'incoming' THEN 'activity.whatsapp.incoming'
            WHEN a.activity_type = 'whatsapp' THEN 'activity.whatsapp.outgoing'
            WHEN a.activity_type = 'email' AND a.direction = 'incoming' THEN 'activity.email.incoming'
            WHEN a.activity_type = 'email' THEN 'activity.email.outgoing'
            WHEN a.activity_type = 'meeting' THEN 'activity.meeting'
            ELSE 'activity.task'
        END,
        a.subject,
        COALESCE(a.completed_at, a.created_at),
        'activities',
        a.id,
        jsonb_build_object(
            'activity_type', a.activity_type,
            'direction', a.direction,
            'status', a.status,
            'assigned_to', a.assigned_to,
            'related_lead_id', a.related_lead_id,
            'related_opportunity_id', a.related_opportunity_id
        ),
        'sales'
    FROM activities a
    WHERE a.related_customer_id IS NOT NULL
      AND a.deleted_at IS NULL

    UNION ALL

    SELECT
        b.tenant_id,
        b.customer_id,
        b.id,
        'booking_created',
        b.reference_number,
        b.created_at,
        'bookings',
        b.id,
        jsonb_build_object(
            'reference_number', b.reference_number,
            'status', b.status,
            'total_amount', b.total_amount,
            'currency', b.currency,
            'quotation_id', b.quotation_id
        ),
        'operations'
    FROM bookings b
    WHERE b.deleted_at IS NULL

    UNION ALL

    SELECT
        i.tenant_id,
        b.customer_id,
        i.id,
        'invoice_created',
        i.invoice_number,
        i.created_at,
        'invoices',
        i.id,
        jsonb_build_object(
            'invoice_number', i.invoice_number,
            'status', i.status,
            'total_amount', i.total_amount,
            'booking_id', i.booking_id
        ),
        'operations'
    FROM invoices i
    INNER JOIN bookings b ON b.id = i.booking_id
    WHERE i.deleted_at IS NULL
      AND b.deleted_at IS NULL

    UNION ALL

    SELECT
        p.tenant_id,
        b.customer_id,
        p.id,
        'payment_received',
        COALESCE(p.reference_number, 'Payment'),
        (p.payment_date::timestamptz AT TIME ZONE 'UTC'),
        'payments',
        p.id,
        jsonb_build_object(
            'amount', p.amount,
            'method', p.method,
            'booking_id', p.booking_id,
            'invoice_id', p.invoice_id
        ),
        'operations'
    FROM payments p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.deleted_at IS NULL
      AND b.deleted_at IS NULL

    UNION ALL

    SELECT
        st.tenant_id,
        st.customer_id,
        st.id,
        'ticket_created',
        st.subject,
        st.created_at,
        'support_tickets',
        st.id,
        jsonb_build_object(
            'ticket_number', st.ticket_number,
            'status', st.status,
            'priority', st.priority
        ),
        'support'
    FROM support_tickets st
    WHERE st.customer_id IS NOT NULL
      AND st.deleted_at IS NULL
) AS unified;

COMMENT ON VIEW v_customer_timeline_events IS
    'Customer 360 unified timeline including quotation events (Sprint 6).';

GRANT SELECT ON v_customer_timeline_events TO authenticated;
