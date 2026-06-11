import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampScore,
  tierFromPriorityScore,
  computeConfidence,
  hashInputs,
  buildRiskIndicators,
} from "./scoring-rules.ts";
import { shouldEnqueueSalesScore } from "./sales-event-config.ts";
import { DOMAIN_EVENT_TYPE } from "../events/types.ts";
import { buildDispatchJobIdempotencyKey, DISPATCH_JOB_TYPE } from "../events/job-types.ts";

describe("sales-ai scoring rules", () => {
  it("clamps scores to 0-100", () => {
    assert.equal(clampScore(150), 100);
    assert.equal(clampScore(-5), 0);
  });

  it("maps priority tiers", () => {
    assert.equal(tierFromPriorityScore(80), "hot");
    assert.equal(tierFromPriorityScore(50), "warm");
    assert.equal(tierFromPriorityScore(10), "cold");
  });

  it("computes confidence from inputs", () => {
    const full = computeConfidence({
      hasQuotation: true,
      hasRecentActivity: true,
      hasCustomerLink: true,
      hasDomainEvents30d: true,
      hasPaymentContext: true,
    });
    assert.equal(full, 1);
  });

  it("produces stable input hash", () => {
    const a = hashInputs({ stage: "proposal", score: 42 });
    const b = hashInputs({ stage: "proposal", score: 42 });
    assert.equal(a, b);
  });

  it("detects quotation expiring risk", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const risks = buildRiskIndicators({
      quotationValidUntil: tomorrow,
      quotationStatus: "viewed",
      paymentPending: false,
      daysSinceCustomerSignal: 1,
      expectedCloseDate: null,
      stage: "proposal",
    });
    assert.ok(risks.some((r) => r.code === "quotation_expiring"));
  });
});

describe("sales-ai event config", () => {
  it("enqueues score jobs for quotation events", () => {
    assert.equal(shouldEnqueueSalesScore(DOMAIN_EVENT_TYPE.QUOTATION_VIEWED), true);
    assert.equal(shouldEnqueueSalesScore("customer.created"), false);
  });

  it("builds ai_score dispatch idempotency key", () => {
    assert.equal(
      buildDispatchJobIdempotencyKey(DISPATCH_JOB_TYPE.AI_SCORE, "evt-1"),
      "dispatch.ai_score:evt-1"
    );
  });
});
