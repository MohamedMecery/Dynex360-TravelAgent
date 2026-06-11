-- Sprint 8C validation — domain events, notifications, timeline
-- Run after migrations 041, 042, 044

DO $$
DECLARE
    v_tenant UUID;
    v_customer UUID;
    v_event UUID;
    v_key TEXT := 'validation:customer.portal_registered:' || gen_random_uuid()::text;
BEGIN
    SELECT id INTO v_tenant FROM tenants LIMIT 1;
    IF v_tenant IS NULL THEN
        RAISE NOTICE 'SKIP: no tenant';
        RETURN;
    END IF;

    SELECT id INTO v_customer FROM customers WHERE tenant_id = v_tenant LIMIT 1;
    IF v_customer IS NULL THEN
        RAISE NOTICE 'SKIP: no customer';
        RETURN;
    END IF;

    v_event := public.emit_domain_event(
        v_tenant,
        'customer.portal_registered',
        'customer',
        v_customer,
        v_customer,
        'system',
        NULL,
        NULL,
        NULL,
        '{"validation": true}'::jsonb,
        v_key,
        now()
    );

    ASSERT v_event IS NOT NULL, 'emit_domain_event must return id';

    PERFORM 1 FROM domain_events WHERE id = v_event AND tenant_id = v_tenant;
    ASSERT FOUND, 'domain_events row missing';

    PERFORM 1 FROM v_customer_timeline_events
    WHERE ref_table = 'domain_events' AND id = v_event AND customer_id = v_customer;
    ASSERT FOUND, 'timeline view must include domain event';

    RAISE NOTICE 'Sprint 8C validation PASS tenant=% customer=% event=%', v_tenant, v_customer, v_event;
END $$;
