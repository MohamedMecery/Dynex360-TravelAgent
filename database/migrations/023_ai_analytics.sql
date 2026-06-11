-- ============================================================================
-- TravelOS Migration 023_ai_analytics
-- AI analytics indexes, tenant-scoped aggregation RPC, ai.analytics.read permission
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query performance indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_created
    ON ai_conversations(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_agent_created
    ON ai_conversations(tenant_id, agent_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_tenant_created
    ON ai_feedback(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_created
    ON support_tickets(tenant_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Permission: ai.analytics.read (tenant_admin + super_admin only)
-- ----------------------------------------------------------------------------
INSERT INTO permissions (module, action, description) VALUES
    ('ai', 'analytics.read', 'View AI agent analytics dashboard')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'ai' AND p.action = 'analytics.read'
WHERE r.name IN ('tenant_admin', 'super_admin')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Tenant-scoped analytics (SECURITY INVOKER — respects RLS + current_tenant_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ai_analytics(
    p_from TIMESTAMPTZ,
    p_to   TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID := public.current_tenant_id();
    v_exec JSONB;
    v_agents JSONB;
    v_support JSONB;
    v_feedback_rate NUMERIC;
    v_top_docs JSONB;
    v_top_packages JSONB;
    v_top_destinations JSONB;
    v_volume JSONB;
    v_dau JSONB;
BEGIN
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object('code', 'NO_TENANT', 'message', 'Tenant context required')
        );
    END IF;

    IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object('code', 'INVALID_RANGE', 'message', 'Invalid date range')
        );
    END IF;

    SELECT CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE ROUND(
            100.0 * COUNT(*) FILTER (WHERE f.rating = 'helpful')::NUMERIC / COUNT(*)::NUMERIC,
            1
        )
    END
    INTO v_feedback_rate
    FROM ai_feedback f
    WHERE f.tenant_id = v_tenant_id
      AND f.created_at >= p_from
      AND f.created_at < p_to;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB ORDER BY t.count DESC), '[]'::JSONB)
    INTO v_agents
    FROM (
        SELECT c.agent_key::TEXT AS agent_key, COUNT(*)::INT AS count
        FROM ai_conversations c
        WHERE c.tenant_id = v_tenant_id
          AND c.created_at >= p_from
          AND c.created_at < p_to
        GROUP BY c.agent_key
    ) t;

    SELECT jsonb_build_object(
        'tickets_created', (
            SELECT COUNT(*)::INT
            FROM support_tickets st
            WHERE st.tenant_id = v_tenant_id
              AND st.deleted_at IS NULL
              AND st.created_at >= p_from
              AND st.created_at < p_to
        ),
        'tickets_resolved', (
            SELECT COUNT(*)::INT
            FROM support_tickets st
            WHERE st.tenant_id = v_tenant_id
              AND st.deleted_at IS NULL
              AND st.status IN ('resolved', 'closed')
              AND st.updated_at >= p_from
              AND st.updated_at < p_to
        )
    )
    INTO v_support;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB ORDER BY t.reference_count DESC), '[]'::JSONB)
    INTO v_top_docs
    FROM (
        SELECT
            cited.document_id,
            cited.document_title,
            COUNT(*)::INT AS reference_count
        FROM (
            SELECT
                elem->>'document_id' AS document_id,
                elem->>'document_title' AS document_title
            FROM ai_messages m
            INNER JOIN ai_conversations c
                ON c.id = m.conversation_id AND c.tenant_id = v_tenant_id
            CROSS JOIN LATERAL jsonb_array_elements(m.metadata->'citations') AS elem
            WHERE m.tenant_id = v_tenant_id
              AND c.agent_key = 'knowledge'
              AND m.role = 'assistant'
              AND m.created_at >= p_from
              AND m.created_at < p_to
              AND jsonb_typeof(m.metadata->'citations') = 'array'
        ) cited
        WHERE cited.document_id IS NOT NULL
          AND cited.document_title IS NOT NULL
        GROUP BY cited.document_id, cited.document_title
        ORDER BY COUNT(*) DESC
        LIMIT 10
    ) t;

    WITH ai_booking_ids AS (
        SELECT DISTINCT booking_id
        FROM (
            SELECT (l.payload->'draft'->>'booking_id')::UUID AS booking_id
            FROM ai_logs l
            WHERE l.tenant_id = v_tenant_id
              AND l.event_type = 'booking_action_confirmed'
              AND l.created_at >= p_from
              AND l.created_at < p_to
              AND l.payload->'draft'->>'booking_id' IS NOT NULL
            UNION
            SELECT (m.metadata->'draft'->>'booking_id')::UUID AS booking_id
            FROM ai_messages m
            INNER JOIN ai_conversations c
                ON c.id = m.conversation_id AND c.tenant_id = v_tenant_id
            WHERE m.tenant_id = v_tenant_id
              AND c.agent_key = 'booking'
              AND m.created_at >= p_from
              AND m.created_at < p_to
              AND m.metadata->'draft'->>'booking_id' IS NOT NULL
        ) raw
        WHERE raw.booking_id IS NOT NULL
    )
    SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB ORDER BY t.booking_count DESC), '[]'::JSONB)
    INTO v_top_packages
    FROM (
        SELECT
            p.id AS package_id,
            p.title AS package_title,
            COUNT(*)::INT AS booking_count
        FROM ai_booking_ids ab
        INNER JOIN bookings b
            ON b.id = ab.booking_id
           AND b.tenant_id = v_tenant_id
           AND b.deleted_at IS NULL
        INNER JOIN packages p ON p.id = b.package_id
        GROUP BY p.id, p.title
        ORDER BY COUNT(*) DESC
        LIMIT 10
    ) t;

    WITH ai_booking_ids AS (
        SELECT DISTINCT booking_id
        FROM (
            SELECT (l.payload->'draft'->>'booking_id')::UUID AS booking_id
            FROM ai_logs l
            WHERE l.tenant_id = v_tenant_id
              AND l.event_type = 'booking_action_confirmed'
              AND l.created_at >= p_from
              AND l.created_at < p_to
              AND l.payload->'draft'->>'booking_id' IS NOT NULL
            UNION
            SELECT (m.metadata->'draft'->>'booking_id')::UUID AS booking_id
            FROM ai_messages m
            INNER JOIN ai_conversations c
                ON c.id = m.conversation_id AND c.tenant_id = v_tenant_id
            WHERE m.tenant_id = v_tenant_id
              AND c.agent_key = 'booking'
              AND m.created_at >= p_from
              AND m.created_at < p_to
              AND m.metadata->'draft'->>'booking_id' IS NOT NULL
        ) raw
        WHERE raw.booking_id IS NOT NULL
    )
    SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB ORDER BY t.booking_count DESC), '[]'::JSONB)
    INTO v_top_destinations
    FROM (
        SELECT
            d.id AS destination_id,
            d.name AS destination_name,
            COUNT(*)::INT AS booking_count
        FROM ai_booking_ids ab
        INNER JOIN bookings b
            ON b.id = ab.booking_id
           AND b.tenant_id = v_tenant_id
           AND b.deleted_at IS NULL
        INNER JOIN packages p ON p.id = b.package_id
        INNER JOIN destinations d ON d.id = p.destination_id
        GROUP BY d.id, d.name
        ORDER BY COUNT(*) DESC
        LIMIT 10
    ) t;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB ORDER BY t.day ASC), '[]'::JSONB)
    INTO v_volume
    FROM (
        SELECT
            (c.created_at AT TIME ZONE 'UTC')::DATE AS day,
            COUNT(*)::INT AS conversation_count
        FROM ai_conversations c
        WHERE c.tenant_id = v_tenant_id
          AND c.created_at >= p_from
          AND c.created_at < p_to
        GROUP BY (c.created_at AT TIME ZONE 'UTC')::DATE
    ) t;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::JSONB ORDER BY t.day ASC), '[]'::JSONB)
    INTO v_dau
    FROM (
        SELECT
            (c.created_at AT TIME ZONE 'UTC')::DATE AS day,
            COUNT(DISTINCT c.user_id)::INT AS active_users
        FROM ai_conversations c
        WHERE c.tenant_id = v_tenant_id
          AND c.created_at >= p_from
          AND c.created_at < p_to
        GROUP BY (c.created_at AT TIME ZONE 'UTC')::DATE
    ) t;

    SELECT jsonb_build_object(
        'total_conversations', (
            SELECT COUNT(*)::INT
            FROM ai_conversations c
            WHERE c.tenant_id = v_tenant_id
              AND c.created_at >= p_from
              AND c.created_at < p_to
        ),
        'active_users', (
            SELECT COUNT(DISTINCT c.user_id)::INT
            FROM ai_conversations c
            WHERE c.tenant_id = v_tenant_id
              AND c.created_at >= p_from
              AND c.created_at < p_to
        ),
        'feedback_rate', v_feedback_rate
    )
    INTO v_exec;

    RETURN jsonb_build_object(
        'period', jsonb_build_object('from', p_from, 'to', p_to),
        'executive', v_exec,
        'agent_usage', v_agents,
        'support', v_support,
        'top_documents', v_top_docs,
        'top_packages', v_top_packages,
        'top_destinations', v_top_destinations,
        'usage_trends', jsonb_build_object(
            'conversation_volume', v_volume,
            'daily_active_users', v_dau
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
