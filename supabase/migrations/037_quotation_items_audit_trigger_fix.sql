-- ============================================================================
-- TravelOS Migration 037_quotation_items_audit_trigger_fix
-- quotation_items has no created_by/updated_by; remove erroneous audit trigger.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_quotation_items_audit_user ON public.quotation_items;
