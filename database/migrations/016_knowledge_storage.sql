-- ============================================================================
-- TravelOS Migration 016_knowledge_storage
-- Private storage bucket for knowledge document uploads (tenant-scoped paths)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'knowledge-documents',
    'knowledge-documents',
    false,
    5242880,
    ARRAY['text/plain', 'text/markdown', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY knowledge_documents_storage_select ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'knowledge-documents'
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    );

CREATE POLICY knowledge_documents_storage_insert ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'knowledge-documents'
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    );

CREATE POLICY knowledge_documents_storage_update ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'knowledge-documents'
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    )
    WITH CHECK (
        bucket_id = 'knowledge-documents'
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    );

CREATE POLICY knowledge_documents_storage_delete ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'knowledge-documents'
        AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    );

-- Auto-generate support ticket numbers per tenant
CREATE OR REPLACE FUNCTION public.generate_support_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_next INT;
BEGIN
    IF NEW.ticket_number IS NOT NULL AND NEW.ticket_number <> '' THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(ticket_number, '\D', '', 'g'), '')::INT
    ), 0) + 1
    INTO v_next
    FROM public.support_tickets
    WHERE tenant_id = NEW.tenant_id;

    NEW.ticket_number := 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(v_next::text, 5, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_tickets_number
    BEFORE INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_support_ticket_number();
