-- ============================================================================
-- TravelOS Migration 018_booking_guards
-- BR-008: Enforce booking status transitions at the database layer
-- BR-009: Reject new payments on cancelled bookings
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Booking status transition guard
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot change booking status from %', OLD.status
            USING ERRCODE = 'check_violation';
    END IF;

    IF OLD.status = 'draft' AND NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid booking transition from draft to %', NEW.status
            USING ERRCODE = 'check_violation';
    END IF;

    IF OLD.status = 'confirmed' AND NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid booking transition from confirmed to %', NEW.status
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_status_transition ON bookings;
CREATE TRIGGER trg_bookings_status_transition
    BEFORE UPDATE OF status ON bookings
    FOR EACH ROW EXECUTE FUNCTION public.validate_booking_status_transition();

-- ----------------------------------------------------------------------------
-- 2. Payment guard — cancelled bookings (BR-009)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_overpayment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_total   NUMERIC;
    v_paid    NUMERIC;
    v_status  booking_status;
BEGIN
    SELECT total_amount, status
    INTO v_total, v_status
    FROM bookings
    WHERE id = NEW.booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found for payment'
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot record payment for a cancelled booking'
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT COALESCE(sum(amount), 0) INTO v_paid
    FROM payments
    WHERE booking_id = NEW.booking_id
      AND deleted_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_total > 0 AND (v_paid + NEW.amount) > v_total THEN
        RAISE EXCEPTION 'Payment % exceeds remaining balance (total %, already paid %)',
            NEW.amount, v_total, v_paid;
    END IF;

    RETURN NEW;
END;
$$;
