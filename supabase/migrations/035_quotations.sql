-- ============================================================================
-- TravelOS Migration 035_quotations
-- CRM quotations + items, booking link, totals, tenant quotation settings
-- Sprint 6 Phase 2 — approved design
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
CREATE TYPE quotation_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'viewed',
    'accepted',
    'rejected',
    'expired',
    'converted_to_booking'
);

CREATE TYPE quotation_item_type AS ENUM (
    'package',
    'hotel',
    'flight',
    'visa',
    'transport',
    'insurance',
    'other'
);

CREATE TYPE quotation_approval_mode AS ENUM ('simple', 'standard');

-- ----------------------------------------------------------------------------
-- tenant_settings extensions
-- ----------------------------------------------------------------------------
ALTER TABLE tenant_settings
    ADD COLUMN IF NOT EXISTS quotation_approval_mode quotation_approval_mode NOT NULL DEFAULT 'simple',
    ADD COLUMN IF NOT EXISTS quotation_default_valid_days INTEGER NOT NULL DEFAULT 14,
    ADD COLUMN IF NOT EXISTS quotation_terms_default TEXT;

-- ----------------------------------------------------------------------------
-- quotations
-- ----------------------------------------------------------------------------
CREATE TABLE quotations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_number     TEXT NOT NULL,
    opportunity_id       UUID NOT NULL REFERENCES opportunities(id) ON DELETE RESTRICT,
    customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
    status               quotation_status NOT NULL DEFAULT 'draft',
    valid_until          DATE,
    currency             CHAR(3) NOT NULL DEFAULT 'USD',
    subtotal             DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount           DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes                TEXT,
    terms_and_conditions TEXT,
    owner_id             UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    sent_at              TIMESTAMPTZ,
    viewed_at            TIMESTAMPTZ,
    accepted_at          TIMESTAMPTZ,
    rejected_at          TIMESTAMPTZ,
    rejection_reason     TEXT,
    approved_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at          TIMESTAMPTZ,
    booking_id           UUID,
    source_quotation_id  UUID REFERENCES quotations(id) ON DELETE SET NULL,
    deleted_at           TIMESTAMPTZ,
    created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_quotations_tenant_number UNIQUE (tenant_id, quotation_number)
);

CREATE INDEX idx_quotations_tenant_status ON quotations(tenant_id, status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_quotations_tenant_owner ON quotations(tenant_id, owner_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_quotations_tenant_opportunity ON quotations(tenant_id, opportunity_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_quotations_tenant_customer ON quotations(tenant_id, customer_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_quotations_one_active_accept
    ON quotations(opportunity_id)
    WHERE deleted_at IS NULL
      AND status IN ('accepted', 'converted_to_booking');

-- ----------------------------------------------------------------------------
-- quotation_items
-- ----------------------------------------------------------------------------
CREATE TABLE quotation_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quotation_id   UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    item_type      quotation_item_type NOT NULL,
    description    TEXT NOT NULL,
    package_id     UUID REFERENCES packages(id) ON DELETE SET NULL,
    quantity       DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price     DECIMAL(12,2) NOT NULL,
    line_total     DECIMAL(12,2) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_quotation_items_qty CHECK (quantity > 0)
);

CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_tenant ON quotation_items(tenant_id);

-- ----------------------------------------------------------------------------
-- bookings.quotation_id + quotations.booking_id FK
-- ----------------------------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_booking_quotation
    ON bookings(quotation_id)
    WHERE quotation_id IS NOT NULL;

ALTER TABLE quotations
    ADD CONSTRAINT fk_quotations_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_quotation_id ON bookings(quotation_id)
    WHERE quotation_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Quotation number: QT-YYYY-######
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    IF NEW.quotation_number IS NOT NULL AND NEW.quotation_number <> '' THEN
        RETURN NEW;
    END IF;

    SELECT count(*) + 1
    INTO v_seq
    FROM public.quotations
    WHERE tenant_id = NEW.tenant_id
      AND date_part('year', created_at) = date_part('year', now());

    NEW.quotation_number := 'QT-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quotations_number
    BEFORE INSERT ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_quotation_number();

-- ----------------------------------------------------------------------------
-- Recalculate quotation totals from items
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_quotation_totals(p_quotation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subtotal DECIMAL(12,2);
    v_tenant_id UUID;
    v_discount DECIMAL(12,2);
    v_tax DECIMAL(12,2);
BEGIN
    SELECT tenant_id, discount_amount, tax_amount
    INTO v_tenant_id, v_discount, v_tax
    FROM public.quotations
    WHERE id = p_quotation_id;

    IF v_tenant_id IS NULL THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(line_total), 0)
    INTO v_subtotal
    FROM public.quotation_items
    WHERE quotation_id = p_quotation_id;

    UPDATE public.quotations
    SET
        subtotal = v_subtotal,
        total_amount = GREATEST(v_subtotal - COALESCE(v_discount, 0) + COALESCE(v_tax, 0), 0),
        updated_at = now()
    WHERE id = p_quotation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_quotation_items_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_quotation_totals(OLD.quotation_id);
        RETURN OLD;
    END IF;
    NEW.line_total := ROUND(NEW.quantity * NEW.unit_price, 2);
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        PERFORM public.recalculate_quotation_totals(NEW.quotation_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quotation_items_recalc
    AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_quotation_items_recalc();

-- ----------------------------------------------------------------------------
-- CRM audit triggers on quotations
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_quotations_updated_at
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quotation_items_updated_at
    BEFORE UPDATE ON public.quotation_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quotations_audit_user
    BEFORE INSERT OR UPDATE ON public.quotations
    FOR EACH ROW EXECUTE FUNCTION public.set_audit_user();

-- quotation_items: no created_by/updated_by columns (see 037 if trigger was applied in error)

CREATE TRIGGER trg_quotations_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.quotations
    FOR EACH ROW EXECUTE FUNCTION public.log_audit();

REVOKE ALL ON FUNCTION public.recalculate_quotation_totals(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_quotation_totals(UUID) TO authenticated;
