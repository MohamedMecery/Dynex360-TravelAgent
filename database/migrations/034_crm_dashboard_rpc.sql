-- ============================================================================
-- TravelOS Migration 034_crm_dashboard_rpc
-- CRM dashboard KPI aggregation (tenant-scoped, owner-aware via CRM helpers)
-- Sprint 6 Phase 1 — quotations excluded
-- ============================================================================

CREATE OR REPLACE FUNCTION public.crm_dashboard_stats(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ,
    p_include_financial BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_now TIMESTAMPTZ := now();
    v_week_ago TIMESTAMPTZ := v_now - INTERVAL '7 days';
    v_stale_cutoff TIMESTAMPTZ := v_now - INTERVAL '3 days';
    v_today_start TIMESTAMPTZ := date_trunc('day', v_now AT TIME ZONE 'UTC');
    v_today_end TIMESTAMPTZ := v_today_start + INTERVAL '1 day';
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
        'kpis', jsonb_build_object(
            'leads_this_month', (
                SELECT COUNT(*)::int
                FROM public.leads l
                WHERE l.tenant_id = v_tenant_id
                  AND l.deleted_at IS NULL
                  AND l.created_at >= p_from
                  AND l.created_at < p_to
                  AND public.crm_can_read_row(l.owner_id, 'leads.read_all')
            ),
            'leads_by_source', COALESCE(
                (
                    SELECT jsonb_object_agg(src, cnt)
                    FROM (
                        SELECT l.source::text AS src, COUNT(*)::int AS cnt
                        FROM public.leads l
                        WHERE l.tenant_id = v_tenant_id
                          AND l.deleted_at IS NULL
                          AND l.created_at >= p_from
                          AND l.created_at < p_to
                          AND public.crm_can_read_row(l.owner_id, 'leads.read_all')
                        GROUP BY l.source
                    ) s
                ),
                '{}'::jsonb
            ),
            'open_opportunities', (
                SELECT COUNT(*)::int
                FROM public.opportunities o
                WHERE o.tenant_id = v_tenant_id
                  AND o.deleted_at IS NULL
                  AND o.stage IN (
                      'discovery', 'proposal', 'negotiation', 'verbal_approval'
                  )
                  AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
            ),
            'forecast_revenue', CASE
                WHEN p_include_financial THEN (
                    SELECT COALESCE(
                        SUM(
                            COALESCE(o.estimated_revenue, 0)
                            * COALESCE(o.probability, 0)::numeric
                            / 100.0
                        ),
                        0
                    )::numeric
                    FROM public.opportunities o
                    WHERE o.tenant_id = v_tenant_id
                      AND o.deleted_at IS NULL
                      AND o.stage IN (
                          'discovery', 'proposal', 'negotiation', 'verbal_approval'
                      )
                      AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
                )
                ELSE NULL
            END,
            'closed_revenue', CASE
                WHEN p_include_financial THEN (
                    SELECT COALESCE(SUM(COALESCE(o.estimated_revenue, 0)), 0)::numeric
                    FROM public.opportunities o
                    WHERE o.tenant_id = v_tenant_id
                      AND o.deleted_at IS NULL
                      AND o.stage = 'closed_won'
                      AND o.updated_at >= p_from
                      AND o.updated_at < p_to
                      AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
                )
                ELSE NULL
            END,
            'activities_due_today', (
                SELECT COUNT(*)::int
                FROM public.activities a
                WHERE a.tenant_id = v_tenant_id
                  AND a.deleted_at IS NULL
                  AND a.status IN ('open', 'in_progress')
                  AND a.due_date IS NOT NULL
                  AND a.due_date >= v_today_start
                  AND a.due_date < v_today_end
                  AND public.crm_can_read_activity(a.assigned_to)
            ),
            'activities_overdue', (
                SELECT COUNT(*)::int
                FROM public.activities a
                WHERE a.tenant_id = v_tenant_id
                  AND a.deleted_at IS NULL
                  AND a.status IN ('open', 'in_progress')
                  AND a.due_date IS NOT NULL
                  AND a.due_date < v_today_start
                  AND public.crm_can_read_activity(a.assigned_to)
            ),
            'whatsapp_activities_7d', (
                SELECT COUNT(*)::int
                FROM public.activities a
                WHERE a.tenant_id = v_tenant_id
                  AND a.deleted_at IS NULL
                  AND a.activity_type = 'whatsapp'
                  AND a.created_at >= v_week_ago
                  AND public.crm_can_read_activity(a.assigned_to)
            )
        ),
        'charts', jsonb_build_object(
            'lead_trend', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'week', week_label,
                            'count', cnt
                        )
                        ORDER BY week_start
                    )
                    FROM (
                        SELECT
                            date_trunc('week', l.created_at)::date AS week_start,
                            to_char(date_trunc('week', l.created_at), 'IYYY-"W"IW') AS week_label,
                            COUNT(*)::int AS cnt
                        FROM public.leads l
                        WHERE l.tenant_id = v_tenant_id
                          AND l.deleted_at IS NULL
                          AND l.created_at >= p_from
                          AND l.created_at < p_to
                          AND public.crm_can_read_row(l.owner_id, 'leads.read_all')
                        GROUP BY 1, 2
                    ) t
                ),
                '[]'::jsonb
            ),
            'opportunity_funnel', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object('stage', stage, 'count', cnt)
                        ORDER BY stage
                    )
                    FROM (
                        SELECT o.stage::text AS stage, COUNT(*)::int AS cnt
                        FROM public.opportunities o
                        WHERE o.tenant_id = v_tenant_id
                          AND o.deleted_at IS NULL
                          AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
                        GROUP BY o.stage
                    ) f
                ),
                '[]'::jsonb
            ),
            'revenue_forecast', CASE
                WHEN p_include_financial THEN COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'month', month_label,
                                'amount', amount
                            )
                            ORDER BY month_start
                        )
                        FROM (
                            SELECT
                                date_trunc('month', o.expected_close_date)::date AS month_start,
                                to_char(o.expected_close_date, 'YYYY-MM') AS month_label,
                                COALESCE(
                                    SUM(
                                        COALESCE(o.estimated_revenue, 0)
                                        * COALESCE(o.probability, 0)::numeric
                                        / 100.0
                                    ),
                                    0
                                )::numeric AS amount
                            FROM public.opportunities o
                            WHERE o.tenant_id = v_tenant_id
                              AND o.deleted_at IS NULL
                              AND o.stage IN (
                                  'discovery', 'proposal', 'negotiation', 'verbal_approval'
                              )
                              AND o.expected_close_date IS NOT NULL
                              AND o.expected_close_date >= p_from::date
                              AND o.expected_close_date < p_to::date
                              AND public.crm_can_read_row(o.owner_id, 'opportunities.read_all')
                            GROUP BY 1, 2
                        ) rf
                    ),
                    '[]'::jsonb
                )
                ELSE '[]'::jsonb
            END,
            'lead_source_analysis', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'source', src,
                            'count', cnt,
                            'percent', percent
                        )
                        ORDER BY cnt DESC
                    )
                    FROM (
                        SELECT
                            l.source::text AS src,
                            COUNT(*)::int AS cnt,
                            ROUND(
                                100.0 * COUNT(*)::numeric
                                / NULLIF(SUM(COUNT(*)) OVER (), 0),
                                1
                            )::numeric AS percent
                        FROM public.leads l
                        WHERE l.tenant_id = v_tenant_id
                          AND l.deleted_at IS NULL
                          AND l.created_at >= p_from
                          AND l.created_at < p_to
                          AND public.crm_can_read_row(l.owner_id, 'leads.read_all')
                        GROUP BY l.source
                    ) ls
                ),
                '[]'::jsonb
            )
        ),
        'lists', jsonb_build_object(
            'overdue_activities', COALESCE(
                (
                    SELECT jsonb_agg(row_data ORDER BY due_date ASC)
                    FROM (
                        SELECT jsonb_build_object(
                            'id', a.id,
                            'subject', a.subject,
                            'due_date', a.due_date,
                            'activity_type', a.activity_type::text,
                            'assigned_to', a.assigned_to
                        ) AS row_data,
                        a.due_date
                        FROM public.activities a
                        WHERE a.tenant_id = v_tenant_id
                          AND a.deleted_at IS NULL
                          AND a.status IN ('open', 'in_progress')
                          AND a.due_date IS NOT NULL
                          AND a.due_date < v_today_start
                          AND public.crm_can_read_activity(a.assigned_to)
                        ORDER BY a.due_date ASC
                        LIMIT 20
                    ) oa
                ),
                '[]'::jsonb
            ),
            'stale_leads', COALESCE(
                (
                    SELECT jsonb_agg(row_data ORDER BY days_since DESC)
                    FROM (
                        SELECT jsonb_build_object(
                            'id', l.id,
                            'full_name', l.full_name,
                            'lead_number', l.lead_number,
                            'days_since_contact', EXTRACT(
                                DAY FROM (v_now - COALESCE(l.last_contacted_at, l.created_at))
                            )::int
                        ) AS row_data,
                        EXTRACT(
                            DAY FROM (v_now - COALESCE(l.last_contacted_at, l.created_at))
                        )::int AS days_since
                        FROM public.leads l
                        WHERE l.tenant_id = v_tenant_id
                          AND l.deleted_at IS NULL
                          AND l.status NOT IN ('won', 'lost')
                          AND COALESCE(l.last_contacted_at, l.created_at) < v_stale_cutoff
                          AND public.crm_can_read_row(l.owner_id, 'leads.read_all')
                        ORDER BY days_since DESC
                        LIMIT 20
                    ) sl
                ),
                '[]'::jsonb
            )
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_dashboard_stats(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_dashboard_stats(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO authenticated;
