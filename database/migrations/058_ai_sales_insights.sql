-- ============================================================================
-- TravelOS Migration 058_ai_sales_insights
-- Sprint 9C-D — Pre-aggregated insight cache + tenant-scoped insights RPC
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_sales_insight_cache (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_from         TIMESTAMPTZ NOT NULL,
    period_to           TIMESTAMPTZ NOT NULL,
    cache_key           TEXT NOT NULL,
    payload             JSONB NOT NULL DEFAULT '{}',
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_sales_insight_cache UNIQUE (tenant_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_sales_insight_cache_expires
    ON ai_sales_insight_cache(tenant_id, expires_at);

-- ----------------------------------------------------------------------------
-- get_sales_insights — deterministic manager KPIs (L4)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sales_insights(
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
        'lead_funnel', COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('stage', stage, 'count', cnt) ORDER BY ord)
                FROM (
                    SELECT l.status::text AS stage, COUNT(*)::int AS cnt,
                        CASE l.status::text
                            WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'qualified' THEN 3
                            WHEN 'proposal_sent' THEN 4 WHEN 'negotiation' THEN 5
                            WHEN 'won' THEN 6 WHEN 'lost' THEN 7 ELSE 99
                        END AS ord
                    FROM public.leads l
                    WHERE l.tenant_id = v_tenant_id
                      AND l.deleted_at IS NULL
                      AND l.created_at >= p_from AND l.created_at < p_to
                      AND public.crm_can_read_row(l.owner_id, 'leads.read_all')
                    GROUP BY l.status
                ) s
            ),
            '[]'::jsonb
        ),
        'quotation_funnel', COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('status', status, 'count', cnt) ORDER BY ord)
                FROM (
                    SELECT q.status::text AS status, COUNT(*)::int AS cnt,
                        CASE q.status::text
                            WHEN 'draft' THEN 1 WHEN 'pending_approval' THEN 2 WHEN 'approved' THEN 3
                            WHEN 'sent' THEN 4 WHEN 'viewed' THEN 5 WHEN 'accepted' THEN 6
                            WHEN 'rejected' THEN 7 WHEN 'expired' THEN 8
                            WHEN 'converted_to_booking' THEN 9 ELSE 99
                        END AS ord
                    FROM public.quotations q
                    WHERE q.tenant_id = v_tenant_id
                      AND q.deleted_at IS NULL
                      AND q.created_at >= p_from AND q.created_at < p_to
                      AND public.crm_can_read_row(q.owner_id, 'quotations.read_all')
                    GROUP BY q.status
                ) s
            ),
            '[]'::jsonb
        ),
        'acceptance_rate', (
            SELECT CASE
                WHEN sent_cnt = 0 THEN NULL
                ELSE ROUND(100.0 * accepted_cnt / sent_cnt, 1)
            END
            FROM (
                SELECT
                    COUNT(*) FILTER (WHERE q.status IN ('sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted_to_booking'))::int AS sent_cnt,
                    COUNT(*) FILTER (WHERE q.status IN ('accepted', 'converted_to_booking'))::int AS accepted_cnt
                FROM public.quotations q
                WHERE q.tenant_id = v_tenant_id
                  AND q.deleted_at IS NULL
                  AND q.created_at >= p_from AND q.created_at < p_to
                  AND public.crm_can_read_row(q.owner_id, 'quotations.read_all')
            ) r
        ),
        'payment_conversion', (
            SELECT CASE
                WHEN accepted_cnt = 0 THEN NULL
                ELSE ROUND(100.0 * paid_cnt / accepted_cnt, 1)
            END
            FROM (
                SELECT
                    COUNT(*) FILTER (WHERE q.status IN ('accepted', 'converted_to_booking'))::int AS accepted_cnt,
                    COUNT(*) FILTER (
                        WHERE q.status = 'converted_to_booking'
                           OR q.booking_id IS NOT NULL
                    )::int AS paid_cnt
                FROM public.quotations q
                WHERE q.tenant_id = v_tenant_id
                  AND q.deleted_at IS NULL
                  AND q.created_at >= p_from AND q.created_at < p_to
                  AND public.crm_can_read_row(q.owner_id, 'quotations.read_all')
            ) r
        ),
        'top_packages', COALESCE(
            (
                SELECT jsonb_agg(row_data ORDER BY cnt DESC)
                FROM (
                    SELECT jsonb_build_object(
                        'package_id', qi.package_id,
                        'package_name', COALESCE(p.name, qi.description, 'Package'),
                        'count', COUNT(*)::int
                    ) AS row_data,
                    COUNT(*)::int AS cnt
                    FROM public.quotation_items qi
                    INNER JOIN public.quotations q ON q.id = qi.quotation_id
                    LEFT JOIN public.packages p ON p.id = qi.package_id
                    WHERE q.tenant_id = v_tenant_id
                      AND q.deleted_at IS NULL
                      AND qi.item_type = 'package'
                      AND q.created_at >= p_from AND q.created_at < p_to
                      AND public.crm_can_read_row(q.owner_id, 'quotations.read_all')
                    GROUP BY qi.package_id, p.name, qi.description
                    ORDER BY cnt DESC
                    LIMIT 10
                ) tp
            ),
            '[]'::jsonb
        ),
        'top_destinations', COALESCE(
            (
                SELECT jsonb_agg(row_data ORDER BY cnt DESC)
                FROM (
                    SELECT jsonb_build_object(
                        'destination', dest,
                        'count', cnt
                    ) AS row_data,
                    cnt
                    FROM (
                        SELECT COALESCE(o.destination_text, d.name, 'Unknown') AS dest,
                               COUNT(*)::int AS cnt
                        FROM public.opportunities o
                        LEFT JOIN public.destinations d ON d.id = o.destination_id
                        WHERE o.tenant_id = v_tenant_id
                          AND o.deleted_at IS NULL
                          AND o.created_at >= p_from AND o.created_at < p_to
                          AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
                        GROUP BY 1
                    ) td
                    ORDER BY cnt DESC
                    LIMIT 10
                ) x
            ),
            '[]'::jsonb
        ),
        'lost_reasons', COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('reason', reason, 'count', cnt) ORDER BY cnt DESC)
                FROM (
                    SELECT reason, SUM(cnt)::int AS cnt
                    FROM (
                        SELECT COALESCE(NULLIF(TRIM(l.lost_reason), ''), 'unspecified') AS reason,
                               COUNT(*)::int AS cnt
                        FROM public.leads l
                        WHERE l.tenant_id = v_tenant_id
                          AND l.deleted_at IS NULL
                          AND l.status = 'lost'
                          AND l.updated_at >= p_from AND l.updated_at < p_to
                          AND public.crm_can_read_row(l.owner_id, 'leads.read_all')
                        GROUP BY 1
                        UNION ALL
                        SELECT COALESCE(NULLIF(TRIM(q.rejection_reason), ''), 'unspecified'),
                               COUNT(*)::int
                        FROM public.quotations q
                        WHERE q.tenant_id = v_tenant_id
                          AND q.deleted_at IS NULL
                          AND q.status = 'rejected'
                          AND q.rejected_at >= p_from AND q.rejected_at < p_to
                          AND public.crm_can_read_row(q.owner_id, 'quotations.read_all')
                        GROUP BY 1
                    ) lr
                    GROUP BY reason
                    ORDER BY cnt DESC
                    LIMIT 15
                ) z
            ),
            '[]'::jsonb
        ),
        'rep_leaderboard', COALESCE(
            (
                SELECT jsonb_agg(row_data ORDER BY won_revenue DESC NULLS LAST)
                FROM (
                    SELECT jsonb_build_object(
                        'owner_id', o.owner_id,
                        'owner_name', COALESCE(u.full_name, u.email, 'Unknown'),
                        'won_count', COUNT(*) FILTER (WHERE o.stage = 'closed_won')::int,
                        'won_revenue', COALESCE(SUM(o.estimated_revenue) FILTER (WHERE o.stage = 'closed_won'), 0)::numeric,
                        'open_count', COUNT(*) FILTER (WHERE o.stage NOT IN ('closed_won', 'closed_lost'))::int
                    ) AS row_data,
                    COALESCE(SUM(o.estimated_revenue) FILTER (WHERE o.stage = 'closed_won'), 0)::numeric AS won_revenue
                    FROM public.opportunities o
                    LEFT JOIN public.users u ON u.id = o.owner_id
                    WHERE o.tenant_id = v_tenant_id
                      AND o.deleted_at IS NULL
                      AND o.updated_at >= p_from AND o.updated_at < p_to
                      AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
                    GROUP BY o.owner_id, u.full_name, u.email
                    ORDER BY won_revenue DESC NULLS LAST
                    LIMIT 20
                ) rb
            ),
            '[]'::jsonb
        ),
        'open_recommendations_count', (
            SELECT COUNT(*)::int
            FROM public.ai_sales_recommendations r
            WHERE r.tenant_id = v_tenant_id
              AND r.status = 'open'
        ),
        'hot_leads_count', (
            SELECT COUNT(*)::int
            FROM public.ai_sales_snapshots s
            INNER JOIN public.leads l ON l.id = s.entity_id AND l.deleted_at IS NULL
            WHERE s.tenant_id = v_tenant_id
              AND s.entity_type = 'lead'
              AND s.priority_tier = 'hot'
              AND public.crm_can_read_row(l.owner_id, 'leads.read_all')
        ),
        'at_risk_opportunities_count', (
            SELECT COUNT(*)::int
            FROM public.ai_sales_snapshots s
            INNER JOIN public.opportunities o ON o.id = s.entity_id AND o.deleted_at IS NULL
            WHERE s.tenant_id = v_tenant_id
              AND s.entity_type = 'opportunity'
              AND s.health_score IS NOT NULL
              AND s.health_score < 50
              AND o.stage NOT IN ('closed_won', 'closed_lost')
              AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_sales_insights(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sales_insights(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
