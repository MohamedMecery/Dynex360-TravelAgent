import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampScore,
  computeOpsConfidence,
  hashInputs,
  operationalStatusFromScores,
  readinessFromChecklist,
  resolveDocumentType,
} from "./scoring-rules.ts";
import { shouldEnqueueOpsScore } from "./ops-event-config.ts";
import { DOMAIN_EVENT_TYPE } from "../events/types.ts";
import { buildDispatchJobIdempotencyKey, DISPATCH_JOB_TYPE } from "../events/job-types.ts";

describe("operations-ai scoring rules", () => {
  it("clamps scores to 0-100", () => {
    assert.equal(clampScore(150), 100);
    assert.equal(clampScore(-5), 0);
  });

  it("maps operational status from risk and readiness", () => {
    assert.equal(
      operationalStatusFromScores({ riskScore: 75, readinessScore: 90, daysToDeparture: 30 }),
      "critical"
    );
    assert.equal(
      operationalStatusFromScores({ riskScore: 10, readinessScore: 95, daysToDeparture: 30 }),
      "healthy"
    );
  });

  it("computes readiness from checklist", () => {
    const score = readinessFromChecklist([
      { code: "a", label: "A", complete: true },
      { code: "b", label: "B", complete: false },
    ]);
    assert.equal(score, 50);
  });

  it("resolves document type from file name heuristics", () => {
    assert.equal(resolveDocumentType({ file_name: "passport_scan.pdf" }), "passport");
    assert.equal(resolveDocumentType({ document_type: "voucher", file_name: "x.pdf" }), "voucher");
  });

  it("produces stable input hash", () => {
    const a = hashInputs({ status: "confirmed", score: 42 });
    const b = hashInputs({ status: "confirmed", score: 42 });
    assert.equal(a, b);
  });

  it("computes confidence from inputs", () => {
    const full = computeOpsConfidence({
      hasTravelDate: true,
      hasTravelers: true,
      hasDocuments: true,
      hasPaymentContext: true,
      hasItems: true,
    });
    assert.equal(full, 1);
  });
});

describe("operations-ai event config", () => {
  it("enqueues ops score jobs for booking events", () => {
    assert.equal(shouldEnqueueOpsScore(DOMAIN_EVENT_TYPE.BOOKING_UPDATED), true);
    assert.equal(shouldEnqueueOpsScore(DOMAIN_EVENT_TYPE.QUOTATION_SENT), false);
  });

  it("builds ai_ops_score dispatch idempotency key", () => {
    assert.equal(
      buildDispatchJobIdempotencyKey(DISPATCH_JOB_TYPE.AI_OPS_SCORE, "evt-1"),
      "dispatch.ai_ops_score:evt-1"
    );
  });
});
