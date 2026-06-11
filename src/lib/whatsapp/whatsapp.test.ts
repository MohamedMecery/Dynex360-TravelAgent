import assert from "node:assert/strict";
import test from "node:test";
import { MetaCloudAdapter } from "@/lib/whatsapp/meta-cloud-adapter";
import { MockWhatsAppAdapter } from "@/lib/whatsapp/mock-whatsapp-adapter";
import { normalizePhoneToE164 } from "@/lib/whatsapp/phone-utils";
import {
  isWhatsAppOptedIn,
  isWithinQuietHours,
  type CustomerCommunicationPreferences,
} from "@/lib/whatsapp/preferences-service";
import { buildTemplateVariables } from "@/lib/whatsapp/template-service";
import { WHATSAPP_EVENT_TYPES } from "@/lib/whatsapp/whatsapp-event-config";
import { DOMAIN_EVENT_TYPE } from "@/lib/events/types";
import type { DomainEventRecord } from "@/lib/events/types";
import { buildDispatchJobIdempotencyKey, DISPATCH_JOB_TYPE } from "@/lib/events/job-types";

test("normalizePhoneToE164 adds Egypt country code", () => {
  assert.equal(normalizePhoneToE164("01001234567"), "201001234567");
  assert.equal(normalizePhoneToE164("+20 100 123 4567"), "201001234567");
});

test("isWhatsAppOptedIn respects opt-out after opt-in", () => {
  const prefs: CustomerCommunicationPreferences = {
    id: "1",
    tenant_id: "t",
    customer_id: "c",
    preferred_language: "en",
    whatsapp_opt_in_at: "2026-06-01T10:00:00Z",
    whatsapp_opt_out_at: "2026-06-02T10:00:00Z",
    quiet_hours_start: null,
    quiet_hours_end: null,
    quiet_hours_timezone: "Africa/Cairo",
  };
  assert.equal(isWhatsAppOptedIn(prefs), false);
});

test("WHATSAPP_EVENT_TYPES covers MVP events only", () => {
  assert.equal(WHATSAPP_EVENT_TYPES.has(DOMAIN_EVENT_TYPE.QUOTATION_SENT), true);
  assert.equal(WHATSAPP_EVENT_TYPES.has(DOMAIN_EVENT_TYPE.QUOTATION_VIEWED), false);
});

test("buildTemplateVariables pads to variable count", () => {
  const event: DomainEventRecord = {
    id: "e1",
    tenant_id: "t1",
    event_type: DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
    aggregate_type: "payment_order",
    aggregate_id: "a1",
    customer_id: "c1",
    actor_type: "system",
    actor_user_id: null,
    actor_customer_id: null,
    actor_portal_account_id: null,
    payload: { customer_name: "Ali", amount: "100", currency: "EGP" },
    idempotency_key: "k",
    occurred_at: "2026-06-01T12:00:00Z",
    created_at: "2026-06-01T12:00:00Z",
  };
  const vars = buildTemplateVariables(event, 3);
  assert.equal(vars.length, 3);
  assert.equal(vars[0], "Ali");
});

test("MetaCloudAdapter normalizeStatusEvent parses statuses", () => {
  const adapter = new MetaCloudAdapter();
  const events = adapter.normalizeStatusEvent({
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                { id: "wamid.abc", status: "delivered", timestamp: "1717500000" },
              ],
            },
          },
        ],
      },
    ],
  });
  assert.equal(events.length, 1);
  assert.equal(events[0]?.status, "delivered");
});

test("MockWhatsAppAdapter send returns mock id", async () => {
  const adapter = new MockWhatsAppAdapter();
  const result = await adapter.sendTemplateMessage({
    toPhoneE164: "201001234567",
    templateName: "quotation_sent",
    languageCode: "en",
    bodyVariables: ["Ali", "Q-1"],
  });
  assert.equal(result.status, "sent");
  assert.ok(result.providerMessageId?.startsWith("mock-"));
});

test("buildDispatchJobIdempotencyKey includes whatsapp job type", () => {
  assert.equal(
    buildDispatchJobIdempotencyKey(DISPATCH_JOB_TYPE.WHATSAPP, "event-1"),
    "dispatch.whatsapp:event-1"
  );
});

test("isWithinQuietHours returns false when quiet hours unset", () => {
  assert.equal(isWithinQuietHours(null), false);
});
