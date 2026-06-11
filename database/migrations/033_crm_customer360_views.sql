-- ============================================================================
-- TravelOS Migration 033_crm_customer360_views
-- Customer 360: unified timeline view + travel history aggregation
-- Sprint 5 — quotations omitted until 7B
-- ============================================================================

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
    -- Leads linked to customer
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

    -- Opportunities created for customer
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

    -- Opportunity stage changes (via customer on opportunity)
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

    -- Activities on customer
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

    -- Bookings
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
            'currency', b.currency
        ),
        'operations'
    FROM bookings b
    WHERE b.deleted_at IS NULL

    UNION ALL

    -- Invoices (via booking customer)
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

    -- Payments
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

    -- Support tickets
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
    'Customer 360 unified timeline (Sprint 5). Quotations excluded until 7B.';

-- Travel history: bookings grouped by destination label and travel year
CREATE OR REPLACE VIEW v_customer_travel_history AS
SELECT
    b.tenant_id,
    b.customer_id,
    COALESCE(d.name, p.title, 'Unknown') AS destination_label,
    COALESCE(EXTRACT(YEAR FROM b.travel_date)::integer, EXTRACT(YEAR FROM b.created_at)::integer) AS travel_year,
    COUNT(*)::integer AS booking_count,
    SUM(b.total_amount)::numeric(12, 2) AS total_amount,
    MAX(b.currency) AS currency
FROM bookings b
LEFT JOIN packages p ON p.id = b.package_id AND p.deleted_at IS NULL
LEFT JOIN destinations d ON d.id = p.destination_id AND d.deleted_at IS NULL
WHERE b.deleted_at IS NULL
GROUP BY
    b.tenant_id,
    b.customer_id,
    COALESCE(d.name, p.title, 'Unknown'),
    COALESCE(EXTRACT(YEAR FROM b.travel_date)::integer, EXTRACT(YEAR FROM b.created_at)::integer);

COMMENT ON VIEW v_customer_travel_history IS
    'Customer 360 travel history aggregates by destination and year.';

GRANT SELECT ON v_customer_timeline_events TO authenticated;
GRANT SELECT ON v_customer_travel_history TO authenticated;
