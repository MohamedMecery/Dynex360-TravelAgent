-- ============================================================================
-- TravelOS Migration 007_functions_triggers
-- Business logic functions and triggers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. updated_at maintenance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'tenants', 'tenant_settings', 'users', 'countries', 'cities',
        'destinations', 'customers', 'customer_contacts', 'customer_addresses',
        'travelers', 'packages', 'package_days', 'package_day_activities',
        'package_pricing', 'bookings', 'booking_items', 'booking_travelers',
        'booking_notes', 'booking_documents', 'invoices', 'payments'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Audit logging
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_tenant UUID;
    v_record UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_old := to_jsonb(OLD); v_record := OLD.id; v_tenant := OLD.tenant_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_record := NEW.id; v_tenant := NEW.tenant_id;
    ELSE
        v_new := to_jsonb(NEW); v_record := NEW.id; v_tenant := NEW.tenant_id;
    END IF;

    INSERT INTO audit_logs (tenant_id, user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_tenant, auth.uid(), TG_OP::audit_action, TG_TABLE_NAME, v_record, v_old, v_new);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'destinations', 'customers', 'travelers', 'packages',
        'bookings', 'invoices', 'payments'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION public.log_audit();', t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Booking reference number (BK-YYYY-######)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
        SELECT count(*) + 1 INTO v_seq
        FROM bookings
        WHERE tenant_id = NEW.tenant_id
          AND date_part('year', created_at) = date_part('year', now());

        NEW.reference_number := 'BK-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_reference BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION public.generate_booking_reference();

-- ----------------------------------------------------------------------------
-- 4. Invoice number (INV-YYYY-######)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        SELECT count(*) + 1 INTO v_seq
        FROM invoices
        WHERE tenant_id = NEW.tenant_id
          AND date_part('year', created_at) = date_part('year', now());

        NEW.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoices_number BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

-- ----------------------------------------------------------------------------
-- 5. Booking item total + booking total recalculation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calc_booking_item_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.total_price := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_items_total BEFORE INSERT OR UPDATE ON booking_items
    FOR EACH ROW EXECUTE FUNCTION public.calc_booking_item_total();

CREATE OR REPLACE FUNCTION public.recalc_booking_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_booking UUID;
BEGIN
    v_booking := COALESCE(NEW.booking_id, OLD.booking_id);

    UPDATE bookings
    SET total_amount = COALESCE(
            (SELECT sum(total_price) FROM booking_items WHERE booking_id = v_booking), 0),
        updated_at = now()
    WHERE id = v_booking;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_booking_items_recalc AFTER INSERT OR UPDATE OR DELETE ON booking_items
    FOR EACH ROW EXECUTE FUNCTION public.recalc_booking_total();

-- ----------------------------------------------------------------------------
-- 6. Booking status history
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_booking_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO booking_status_history (booking_id, tenant_id, from_status, to_status, changed_by)
        VALUES (NEW.id, NEW.tenant_id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_status_history AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION public.track_booking_status();

-- ----------------------------------------------------------------------------
-- 7. Overpayment guard (per booking)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_overpayment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_total NUMERIC;
    v_paid  NUMERIC;
BEGIN
    SELECT total_amount INTO v_total FROM bookings WHERE id = NEW.booking_id;

    SELECT COALESCE(sum(amount), 0) INTO v_paid
    FROM payments
    WHERE booking_id = NEW.booking_id
      AND deleted_at IS NULL
      AND id <> NEW.id;

    IF v_total > 0 AND (v_paid + NEW.amount) > v_total THEN
        RAISE EXCEPTION 'Payment % exceeds remaining balance (total %, already paid %)',
            NEW.amount, v_total, v_paid;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_overpayment BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION public.prevent_overpayment();

-- ----------------------------------------------------------------------------
-- 8. Payment -> booking & invoice status recalculation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_booking UUID;
    v_invoice UUID;
    v_total   NUMERIC;
    v_paid    NUMERIC;
BEGIN
    v_booking := COALESCE(NEW.booking_id, OLD.booking_id);
    v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Booking payment_status
    SELECT total_amount INTO v_total FROM bookings WHERE id = v_booking;
    SELECT COALESCE(sum(amount), 0) INTO v_paid
    FROM payments WHERE booking_id = v_booking AND deleted_at IS NULL;

    UPDATE bookings
    SET payment_status = CASE
            WHEN v_paid <= 0 THEN 'unpaid'::payment_status
            WHEN v_paid < v_total THEN 'partial'::payment_status
            ELSE 'paid'::payment_status
        END,
        updated_at = now()
    WHERE id = v_booking;

    -- Invoice status (only when payment is linked to an invoice)
    IF v_invoice IS NOT NULL THEN
        SELECT total_amount INTO v_total FROM invoices WHERE id = v_invoice;
        SELECT COALESCE(sum(amount), 0) INTO v_paid
        FROM payments WHERE invoice_id = v_invoice AND deleted_at IS NULL;

        UPDATE invoices
        SET status = CASE
                WHEN v_paid <= 0 THEN status
                WHEN v_paid < v_total THEN 'partially_paid'::invoice_status
                ELSE 'paid'::invoice_status
            END,
            updated_at = now()
        WHERE id = v_invoice AND status NOT IN ('cancelled', 'void');
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_payments_status AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION public.update_payment_status();
