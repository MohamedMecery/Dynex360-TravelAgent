-- ============================================================================
-- TravelOS Migration 044_timeline_view_domain_events
-- Sprint 8C — Extend Customer 360 timeline with domain_events (no duplicates)
-- ============================================================================

-- Preserve existing derived timeline as inner view
ALTER VIEW IF EXISTS v_customer_timeline_events
    RENAME TO v_customer_timeline_events_derived;

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
FROM v_customer_timeline_events_derived

UNION ALL

SELECT
    de.tenant_id,
    de.customer_id,
    de.id,
    CASE de.event_type
        WHEN 'customer.portal_registered' THEN 'customer.portal_registered'
        WHEN 'customer.password_reset_requested' THEN 'customer.password_reset_requested'
        WHEN 'customer.created' THEN 'customer.created'
        WHEN 'booking.updated' THEN 'booking.updated'
        WHEN 'booking.cancelled' THEN 'booking.cancelled'
        WHEN 'quotation.accepted' THEN 'quotation_accepted'
        WHEN 'quotation.rejected' THEN 'quotation_rejected'
        ELSE replace(de.event_type, '.', '_')
    END AS event_type,
    COALESCE(
        de.payload->>'title',
        de.payload->>'quotation_number',
        de.payload->>'reference_number',
        de.event_type
    ) AS title,
    de.occurred_at,
    'domain_events'::text AS ref_table,
    de.id AS ref_id,
    COALESCE(de.payload, '{}'::jsonb) || jsonb_build_object(
        'aggregate_type', de.aggregate_type,
        'aggregate_id', de.aggregate_id,
        'domain_event_type', de.event_type
    ) AS meta,
    CASE
        WHEN de.event_type LIKE 'customer.%' THEN 'portal'::text
        WHEN de.event_type LIKE 'booking.%' THEN 'operations'::text
        WHEN de.event_type LIKE 'quotation.%' THEN 'sales'::text
        ELSE 'communications'::text
    END AS timeline_bucket
FROM domain_events de
WHERE de.customer_id IS NOT NULL
  AND de.event_type NOT IN (
      'quotation.sent',
      'quotation.viewed'
  )
  AND NOT (
      de.event_type IN ('quotation.accepted', 'quotation.rejected')
      AND EXISTS (
          SELECT 1
          FROM v_customer_timeline_events_derived d
          WHERE d.customer_id = de.customer_id
            AND d.ref_id = de.aggregate_id
            AND d.event_type = CASE de.event_type
                WHEN 'quotation.accepted' THEN 'quotation_accepted'
                WHEN 'quotation.rejected' THEN 'quotation_rejected'
                ELSE d.event_type
            END
      )
  );

COMMENT ON VIEW v_customer_timeline_events IS
    'Customer 360 unified timeline — derived sources + domain_events (Sprint 8C).';

GRANT SELECT ON v_customer_timeline_events TO authenticated;
GRANT SELECT ON v_customer_timeline_events_derived TO authenticated;
