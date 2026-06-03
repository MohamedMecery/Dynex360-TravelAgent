-- ============================================================================
-- TravelOS Migration 022_invoice_line_snapshot
-- Freeze booking_items into invoices.line_items_snapshot when status = issued.
-- D-012: JSONB on invoice row (no invoice_items table).
-- ============================================================================

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS line_items_snapshot JSONB;

COMMENT ON COLUMN invoices.line_items_snapshot IS
    'Frozen copy of booking_items at issue time (D-012). Set once when status becomes issued.';

CREATE OR REPLACE FUNCTION public.freeze_invoice_line_items_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'issued'
       AND NEW.line_items_snapshot IS NULL
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'issued')
    THEN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', bi.id,
                    'description', bi.description,
                    'quantity', bi.quantity,
                    'unit_price', bi.unit_price,
                    'total_price', bi.total_price
                )
                ORDER BY bi.created_at, bi.id
            ),
            '[]'::jsonb
        )
        INTO NEW.line_items_snapshot
        FROM booking_items bi
        WHERE bi.booking_id = NEW.booking_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_freeze_line_snapshot ON invoices;

CREATE TRIGGER trg_invoices_freeze_line_snapshot
    BEFORE INSERT OR UPDATE OF status, booking_id ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.freeze_invoice_line_items_snapshot();

-- Backfill issued invoices created before this migration
UPDATE invoices i
SET line_items_snapshot = COALESCE(
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', bi.id,
                'description', bi.description,
                'quantity', bi.quantity,
                'unit_price', bi.unit_price,
                'total_price', bi.total_price
            )
            ORDER BY bi.created_at, bi.id
        )
        FROM booking_items bi
        WHERE bi.booking_id = i.booking_id
    ),
    '[]'::jsonb
)
WHERE i.status = 'issued'
  AND i.line_items_snapshot IS NULL;
