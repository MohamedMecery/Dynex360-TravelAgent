-- Sprint 7E: server-side quotation list search (tenant-scoped, paginated)
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_number_pattern
    ON public.quotations (tenant_id, quotation_number text_pattern_ops)
    WHERE deleted_at IS NULL;
