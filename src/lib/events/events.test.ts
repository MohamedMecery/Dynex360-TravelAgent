import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveNotificationCopy,
  shouldNotifyCustomer,
  shouldNotifyStaff,
} from "@/lib/events/notification-copy";
import { DOMAIN_EVENT_TYPE, buildIdempotencyKey } from "@/lib/events/types";
import { buildDispatchJobIdempotencyKey, DISPATCH_JOB_TYPE } from "@/lib/events/job-types";
import type { DomainEventRecord } from "@/lib/events/types";

function sampleEvent(overrides: Partial<DomainEventRecord> = {}): DomainEventRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    tenant_id: "00000000-0000-4000-8000-000000000010",
    event_type: DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
    aggregate_type: "quotation",
    aggregate_id: "00000000-0000-4000-8000-000000000020",
    customer_id: "00000000-0000-4000-8000-000000000030",
    actor_type: "customer",
    actor_user_id: null,
    actor_customer_id: "00000000-0000-4000-8000-000000000030",
    actor_portal_account_id: "00000000-0000-4000-8000-000000000040",
    payload: { quotation_number: "Q-1001", customer_name: "Jane Doe" },
    idempotency_key: "test-key",
    occurred_at: "2026-06-01T12:00:00.000Z",
    created_at: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

test("buildIdempotencyKey produces stable tenant-scoped keys", () => {
  const key = buildIdempotencyKey(
    DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
    "tenant-a",
    "quotation",
    "quote-a",
    "2026-06-01T12:00:00Z"
  );
  assert.equal(
    key,
    "quotation.accepted:tenant-a:quotation:quote-a:2026-06-01T12:00:00Z"
  );
});

test("resolveNotificationCopy maps quotation.accepted", () => {
  const copy = resolveNotificationCopy(sampleEvent());
  assert.match(copy.title, /Q-1001 accepted/);
  assert.match(copy.message, /Jane Doe/);
  assert.equal(copy.priority, "high");
  assert.equal(copy.staffActionUrl, "/crm/quotations/show/00000000-0000-4000-8000-000000000020");
});

test("resolveNotificationCopy includes rejection reason", () => {
  const copy = resolveNotificationCopy(
    sampleEvent({
      event_type: DOMAIN_EVENT_TYPE.QUOTATION_REJECTED,
      payload: {
        quotation_number: "Q-2002",
        customer_name: "Acme",
        rejection_reason: "Budget",
      },
    })
  );
  assert.match(copy.message, /Budget/);
});

test("shouldNotifyCustomer covers portal-facing events", () => {
  assert.equal(shouldNotifyCustomer(DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED), true);
  assert.equal(shouldNotifyCustomer(DOMAIN_EVENT_TYPE.QUOTATION_VIEWED), false);
  assert.equal(shouldNotifyCustomer(DOMAIN_EVENT_TYPE.CUSTOMER_PORTAL_REGISTERED), true);
});

test("shouldNotifyStaff covers CRM inbox events", () => {
  assert.equal(shouldNotifyStaff(DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED), true);
  assert.equal(shouldNotifyStaff(DOMAIN_EVENT_TYPE.QUOTATION_SENT), false);
  assert.equal(shouldNotifyStaff(DOMAIN_EVENT_TYPE.CUSTOMER_PORTAL_REGISTERED), true);
  assert.equal(shouldNotifyStaff(DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED), true);
});

test("shouldNotifyCustomer includes payment.completed", () => {
  assert.equal(shouldNotifyCustomer(DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED), true);
});

test("buildDispatchJobIdempotencyKey is stable per event and job type", () => {
  const eventId = "00000000-0000-4000-8000-000000000099";
  assert.equal(
    buildDispatchJobIdempotencyKey(DISPATCH_JOB_TYPE.EMAIL, eventId),
    `dispatch.email:${eventId}`
  );
  assert.equal(
    buildDispatchJobIdempotencyKey(DISPATCH_JOB_TYPE.WHATSAPP, eventId),
    `dispatch.whatsapp:${eventId}`
  );
  assert.equal(
    buildDispatchJobIdempotencyKey(DISPATCH_JOB_TYPE.AI_SCORE, eventId),
    `dispatch.ai_score:${eventId}`
  );
});
