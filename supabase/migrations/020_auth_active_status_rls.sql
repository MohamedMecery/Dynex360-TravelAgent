-- ============================================================================
-- TravelOS Migration 020_auth_active_status_rls
-- Enforce users.status = 'active' for tenant data access (RLS + JWT hook).
-- Pending/inactive users may read only their own users row (id = auth.uid()).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: DB-backed active check (do not trust JWT alone)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_auth_user_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.is_auth_user_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_auth_user_active() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Custom access token hook: inject account_status for JWT/app consistency checks
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    original_claims jsonb;
    new_claims      jsonb;
    user_role       text;
    user_tenant     uuid;
    user_status     text;
BEGIN
    original_claims := event->'claims';
    new_claims      := original_claims;

    SELECT r.name, ur.tenant_id, u.status::text
    INTO user_role, user_tenant, user_status
    FROM public.users u
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE u.id = (event->>'user_id')::uuid
    LIMIT 1;

    IF user_tenant IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,tenant_id}',
            to_jsonb(user_tenant::text),
            true
        );
    END IF;

    IF user_role IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,role}',
            to_jsonb(user_role),
            true
        );
    END IF;

    IF user_status IS NOT NULL THEN
        new_claims := jsonb_set(
            new_claims,
            '{app_metadata,account_status}',
            to_jsonb(user_status),
            true
        );
    END IF;

    RETURN jsonb_set(event, '{claims}', new_claims);
END;
$$;

GRANT SELECT ON TABLE public.users TO supabase_auth_admin;

-- ----------------------------------------------------------------------------
-- Tenant-scoped business tables (006 list minus users / user_roles)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'tenant_settings', 'destinations',
        'customers', 'customer_contacts', 'customer_addresses', 'travelers',
        'packages', 'package_days', 'package_day_activities',
        'package_pricing', 'package_media',
        'bookings', 'booking_items', 'booking_travelers',
        'booking_status_history', 'booking_notes', 'booking_documents',
        'invoices', 'payments', 'payment_transactions', 'notifications'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON public.%I', t, t);

        EXECUTE format($f$
            CREATE POLICY %1$s_tenant_isolation ON public.%1$I
            FOR ALL
            TO authenticated
            USING (
                public.is_auth_user_active()
                AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
            )
            WITH CHECK (
                public.is_auth_user_active()
                AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
            );
        $f$, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Phase 5 AI / knowledge / support tables (015)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'ai_agents', 'ai_sessions', 'ai_conversations', 'ai_messages',
        'ai_feedback', 'knowledge_documents', 'knowledge_chunks',
        'support_tickets', 'support_ticket_messages'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON public.%I', t, t);

        EXECUTE format($f$
            CREATE POLICY %1$s_tenant_isolation ON public.%1$I
            FOR ALL
            TO authenticated
            USING (
                public.is_auth_user_active()
                AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
            )
            WITH CHECK (
                public.is_auth_user_active()
                AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
            );
        $f$, t);
    END LOOP;
END $$;

DROP POLICY IF EXISTS ai_logs_select ON public.ai_logs;
CREATE POLICY ai_logs_select ON public.ai_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                tenant_id = public.current_tenant_id()
                AND public.current_user_role() IN ('tenant_admin', 'super_admin')
            )
        )
    );

DROP POLICY IF EXISTS ai_logs_insert ON public.ai_logs;
CREATE POLICY ai_logs_insert ON public.ai_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_auth_user_active()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

-- ----------------------------------------------------------------------------
-- tenants, audit_logs, global reference reads
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenants_select ON public.tenants;
CREATE POLICY tenants_select ON public.tenants
    FOR SELECT
    TO authenticated
    USING (
        public.is_auth_user_active()
        AND (id = public.current_tenant_id() OR public.is_super_admin())
    );

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_auth_user_active()
        AND (tenant_id = public.current_tenant_id() OR public.is_super_admin())
    );

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_auth_user_active());

-- Global reference tables: authenticated + active
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles', 'permissions', 'role_permissions', 'countries', 'cities'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
        EXECUTE format($f$
            CREATE POLICY %1$s_read ON public.%1$I
            FOR SELECT
            TO authenticated
            USING (auth.uid() IS NOT NULL AND public.is_auth_user_active());
        $f$, t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- users / user_roles (019): active required for tenant data; self profile always readable
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR (
            public.is_auth_user_active()
            AND (
                public.is_super_admin()
                OR tenant_id = public.current_tenant_id()
            )
        )
    );

DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                public.is_tenant_user_admin()
                AND tenant_id = public.auth_user_tenant_id()
                AND tenant_id = public.current_tenant_id()
            )
        )
    );

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                public.is_tenant_user_admin()
                AND tenant_id = public.auth_user_tenant_id()
                AND tenant_id = public.current_tenant_id()
            )
        )
    )
    WITH CHECK (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                public.is_tenant_user_admin()
                AND tenant_id = public.auth_user_tenant_id()
                AND tenant_id = public.current_tenant_id()
            )
        )
    );

DROP POLICY IF EXISTS users_delete ON public.users;
CREATE POLICY users_delete ON public.users
    FOR DELETE
    TO authenticated
    USING (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                public.is_tenant_user_admin()
                AND tenant_id = public.auth_user_tenant_id()
                AND tenant_id = public.current_tenant_id()
            )
        )
    );

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
        public.is_auth_user_active()
        AND (public.is_super_admin() OR tenant_id = public.current_tenant_id())
    );

DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
CREATE POLICY user_roles_insert ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                public.is_tenant_user_admin()
                AND tenant_id = public.auth_user_tenant_id()
                AND tenant_id = public.current_tenant_id()
            )
        )
    );

DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
CREATE POLICY user_roles_update ON public.user_roles
    FOR UPDATE
    TO authenticated
    USING (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                public.is_tenant_user_admin()
                AND tenant_id = public.auth_user_tenant_id()
                AND tenant_id = public.current_tenant_id()
            )
        )
    )
    WITH CHECK (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                public.is_tenant_user_admin()
                AND tenant_id = public.auth_user_tenant_id()
                AND tenant_id = public.current_tenant_id()
            )
        )
    );

DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
CREATE POLICY user_roles_delete ON public.user_roles
    FOR DELETE
    TO authenticated
    USING (
        public.is_auth_user_active()
        AND (
            public.is_super_admin()
            OR (
                public.is_tenant_user_admin()
                AND tenant_id = public.auth_user_tenant_id()
                AND tenant_id = public.current_tenant_id()
            )
        )
    );

-- ----------------------------------------------------------------------------
-- Knowledge storage (016)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS knowledge_documents_storage_select ON storage.objects;
CREATE POLICY knowledge_documents_storage_select ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'knowledge-documents'
        AND public.is_auth_user_active()
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    );

DROP POLICY IF EXISTS knowledge_documents_storage_insert ON storage.objects;
CREATE POLICY knowledge_documents_storage_insert ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'knowledge-documents'
        AND public.is_auth_user_active()
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    );

DROP POLICY IF EXISTS knowledge_documents_storage_update ON storage.objects;
CREATE POLICY knowledge_documents_storage_update ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'knowledge-documents'
        AND public.is_auth_user_active()
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
    WITH CHECK (
        bucket_id = 'knowledge-documents'
        AND public.is_auth_user_active()
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    );

DROP POLICY IF EXISTS knowledge_documents_storage_delete ON storage.objects;
CREATE POLICY knowledge_documents_storage_delete ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'knowledge-documents'
        AND public.is_auth_user_active()
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    );

-- ----------------------------------------------------------------------------
-- Knowledge search RPCs: defense in depth
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_knowledge_chunks(
    query_embedding vector(1536),
    match_count     INT DEFAULT 5,
    filter_type     knowledge_document_type DEFAULT NULL
)
RETURNS TABLE (
    id              UUID,
    document_id     UUID,
    content         TEXT,
    chunk_index     INT,
    similarity      FLOAT,
    document_title  TEXT,
    document_type   knowledge_document_type
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.chunk_index,
        (1 - (kc.embedding <=> query_embedding))::FLOAT AS similarity,
        kd.title AS document_title,
        kd.document_type
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE public.is_auth_user_active()
      AND kc.tenant_id = public.current_tenant_id()
      AND kd.deleted_at IS NULL
      AND kd.status = 'published'
      AND kc.embedding IS NOT NULL
      AND (filter_type IS NULL OR kd.document_type = filter_type)
    ORDER BY kc.embedding <=> query_embedding
    LIMIT GREATEST(match_count, 1);
$$;

CREATE OR REPLACE FUNCTION public.search_knowledge_chunks_text(
    search_query TEXT,
    match_count  INT DEFAULT 5,
    filter_type  knowledge_document_type DEFAULT NULL
)
RETURNS TABLE (
    id              UUID,
    document_id     UUID,
    content         TEXT,
    chunk_index     INT,
    rank            FLOAT,
    document_title  TEXT,
    document_type   knowledge_document_type
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        kc.id,
        kc.document_id,
        kc.content,
        kc.chunk_index,
        ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', search_query))::FLOAT AS rank,
        kd.title AS document_title,
        kd.document_type
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    WHERE public.is_auth_user_active()
      AND kc.tenant_id = public.current_tenant_id()
      AND kd.deleted_at IS NULL
      AND kd.status = 'published'
      AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', search_query)
      AND (filter_type IS NULL OR kd.document_type = filter_type)
    ORDER BY rank DESC
    LIMIT GREATEST(match_count, 1);
$$;
