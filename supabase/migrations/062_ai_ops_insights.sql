-- ============================================================================
-- TravelOS Migration 062_ai_ops_insights
-- Sprint 9D-D — Operations insight cache + get_operations_insights RPC
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_ops_insight_cache (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_from         TIMESTAMPTZ NOT NULL,
    period_to           TIMESTAMPTZ NOT NULL,
    cache_key           TEXT NOT NULL,
    payload             JSONB NOT NULL DEFAULT '{}',
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_ops_insight_cache UNIQUE (tenant_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_ops_insight_cache_expires
    ON ai_ops_insight_cache(tenant_id, expires_at);

CREATE OR REPLACE FUNCTION public.get_operations_insights(
    p_from TIMESTAMPTZ,
    p_to   TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_now DATE := CURRENT_DATE;
BEGIN
    IF NOT public.has_crm_permission('dashboard.read') THEN
        RAISE EXCEPTION 'Missing CRM dashboard permission' USING ERRCODE = '42501';
    END IF;

    v_tenant_id := public.current_tenant_id();
    IF v_tenant_id IS NULL AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Tenant context required' USING ERRCODE = 'P0001';
    END IF;

    RETURN jsonb_build_object(
        'period', jsonb_build_object('from', p_from, 'to', p_to),
        'upcoming_departures', COALESCE(
            (
                SELECT jsonb_agg(row_data ORDER BY travel_date ASC)
                FROM (
                    SELECT jsonb_build_object(
                        'booking_id', b.id,
                        'reference_number', b.reference_number,
                        'travel_date', b.travel_date,
                        'status', b.status::text,
                        'health_score', s.health_score,
                        'readiness_score', s.readiness_score,
                        'operational_status', s.operational_status::text
                    ) AS row_data,
                    b.travel_date
                    FROM public.bookings b
                    LEFT JOIN public.ai_ops_snapshots s
                        ON s.tenant_id = b.tenant_id
                       AND s.entity_type = 'booking'
                       AND s.entity_id = b.id
                    WHERE b.tenant_id = v_tenant_id
                      AND b.deleted_at IS NULL
                      AND b.status IN ('confirmed', 'draft')
                      AND b.travel_date IS NOT NULL
                      AND b.travel_date >= v_now
                      AND b.travel_date < v_now + 30
                    ORDER BY b.travel_date ASC
                    LIMIT 50
                ) ud
            ),
            '[]'::jsonb
        ),
        'at_risk_bookings_count', (
            SELECT COUNT(*)::int
            FROM public.ai_ops_snapshots s
            INNER JOIN public.bookings b ON b.id = s.entity_id AND b.deleted_at IS NULL
            WHERE s.tenant_id = v_tenant_id
              AND s.entity_type = 'booking'
              AND s.operational_status IN ('at_risk', 'critical')
        ),
        'missing_documents_count', (
            SELECT COUNT(*)::int
            FROM public.ai_ops_recommendations r
            WHERE r.tenant_id = v_tenant_id
              AND r.status = 'open'
              AND r.recommendation_code IN ('documents_incomplete', 'missing_passport')
        ),
        'traveler_actions_count', (
            SELECT COUNT(*)::int
            FROM public.ai_ops_recommendations r
            WHERE r.tenant_id = v_tenant_id
              AND r.status = 'open'
              AND r.action_type IN ('collect_traveler_info', 'upload_document')
        ),
        'voucher_backlog_count', (
            SELECT COUNT(*)::int
            FROM public.ai_ops_recommendations r
            INNER JOIN public.bookings b ON b.id = r.entity_id
            WHERE r.tenant_id = v_tenant_id
              AND r.status = 'open'
              AND r.recommendation_code = 'voucher_missing'
              AND b.travel_date IS NOT NULL
              AND b.travel_date <= v_now + 14
        ),
        'payment_gaps_pre_departure', (
            SELECT COUNT(*)::int
            FROM public.bookings b
            WHERE b.tenant_id = v_tenant_id
              AND b.deleted_at IS NULL
              AND b.status = 'confirmed'
              AND b.payment_status <> 'paid'
              AND b.travel_date IS NOT NULL
              AND b.travel_date <= v_now + 30
        ),
        'open_recommendations_count', (
            SELECT COUNT(*)::int
            FROM public.ai_ops_recommendations r
            WHERE r.tenant_id = v_tenant_id
              AND r.status = 'open'
        ),
        'departures_7d_count', (
            SELECT COUNT(*)::int
            FROM public.bookings b
            WHERE b.tenant_id = v_tenant_id
              AND b.deleted_at IS NULL
              AND b.status IN ('confirmed', 'draft')
              AND b.travel_date >= v_now
              AND b.travel_date < v_now + 7
        ),
        'readiness_summary', COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('status', operational_status, 'count', cnt))
                FROM (
                    SELECT s.operational_status::text AS operational_status, COUNT(*)::int AS cnt
                    FROM public.ai_ops_snapshots s
                    INNER JOIN public.bookings b ON b.id = s.entity_id AND b.deleted_at IS NULL
                    WHERE s.tenant_id = v_tenant_id
                      AND s.entity_type = 'booking'
                      AND b.travel_date >= v_now
                    GROUP BY s.operational_status
                ) rs
            ),
            '[]'::jsonb
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_operations_insights(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_operations_insights(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
