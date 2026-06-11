-- ============================================================================
-- TravelOS Migration 021_audit_user_triggers
-- Auto-populate created_by / updated_by from auth.uid() on tenant records.
-- Preserves explicit values when the application sets them (e.g. AI tools).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_audit_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    actor UUID := auth.uid();
BEGIN
    IF actor IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.created_by IS NULL THEN
            NEW.created_by := actor;
        END IF;
        NEW.updated_by := COALESCE(NEW.updated_by, actor);
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_by := actor;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_created_by_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    actor UUID := auth.uid();
BEGIN
    IF actor IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
        NEW.created_by := actor;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'destinations',
        'customers',
        'travelers',
        'packages',
        'bookings',
        'invoices',
        'payments',
        'knowledge_documents',
        'support_tickets'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%1$s_audit_user ON %1$I;
             CREATE TRIGGER trg_%1$s_audit_user
             BEFORE INSERT OR UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION public.set_audit_user();',
            t
        );
    END LOOP;

    EXECUTE
        'DROP TRIGGER IF EXISTS trg_booking_notes_created_by ON booking_notes;
         CREATE TRIGGER trg_booking_notes_created_by
         BEFORE INSERT ON booking_notes
         FOR EACH ROW EXECUTE FUNCTION public.set_created_by_user();';
END $$;
