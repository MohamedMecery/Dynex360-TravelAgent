-- Sprint 8D validation — event dispatch jobs queue
-- Run after migrations 045, 046

DO $$
DECLARE
    v_tenant UUID;
    v_event UUID;
    v_job UUID;
    v_job2 UUID;
BEGIN
    SELECT id INTO v_tenant FROM tenants LIMIT 1;
    IF v_tenant IS NULL THEN
        RAISE NOTICE 'SKIP: no tenant';
        RETURN;
    END IF;

    v_event := public.emit_domain_event(
        v_tenant,
        'customer.created',
        'customer',
        v_tenant,
        NULL,
        'system',
        NULL, NULL, NULL,
        '{"validation":"8d"}'::jsonb,
        'validation-8d-' || gen_random_uuid()::text,
        now()
    );

    v_job := public.enqueue_event_dispatch_job(
        v_tenant,
        v_event,
        'dispatch.notification',
        'validation-job-' || v_event::text,
        5
    );

    v_job2 := public.enqueue_event_dispatch_job(
        v_tenant,
        v_event,
        'dispatch.notification',
        'validation-job-' || v_event::text,
        5
    );

    ASSERT v_job = v_job2, 'enqueue must be idempotent';

    PERFORM 1 FROM scheduled_automation_templates
    WHERE template_key = 'quotation.expiring_soon' AND is_active = false;
    ASSERT FOUND, 'automation templates seeded inactive';

    RAISE NOTICE 'Sprint 8D validation PASS event=% job=%', v_event, v_job;
END $$;
