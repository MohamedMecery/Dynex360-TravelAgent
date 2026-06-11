import type { SalesPriorityTier, SalesRiskIndicator } from "@/lib/sales-ai/types";

export const STAGE_PRIORS: Record<string, number> = {
  discovery: 15,
  proposal: 35,
  negotiation: 55,
  verbal_approval: 75,
  closed_won: 100,
  closed_lost: 0,
};

export const QUOTATION_STATUS_FACTOR: Record<string, number> = {
  draft: 10,
  pending_approval: 15,
  approved: 25,
  sent: 40,
  viewed: 60,
  accepted: 90,
  rejected: 0,
  expired: 5,
  converted_to_booking: 95,
};

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function tierFromPriorityScore(score: number): SalesPriorityTier {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export function computeConfidence(inputs: {
  hasQuotation: boolean;
  hasRecentActivity: boolean;
  hasCustomerLink: boolean;
  hasDomainEvents30d: boolean;
  hasPaymentContext: boolean;
}): number {
  const raw =
    0.3 * (inputs.hasQuotation ? 1 : 0) +
    0.25 * (inputs.hasRecentActivity ? 1 : 0) +
    0.2 * (inputs.hasCustomerLink ? 1 : 0) +
    0.15 * (inputs.hasDomainEvents30d ? 1 : 0) +
    0.1 * (inputs.hasPaymentContext ? 1 : 0);
  return Math.round(raw * 1000) / 1000;
}

export function hashInputs(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(16)}`;
}

export function buildRiskIndicators(input: {
  quotationValidUntil: string | null;
  quotationStatus: string | null;
  paymentPending: boolean;
  daysSinceCustomerSignal: number | null;
  expectedCloseDate: string | null;
  stage: string | null;
}): SalesRiskIndicator[] {
  const risks: SalesRiskIndicator[] = [];
  const now = new Date();

  if (input.quotationValidUntil && input.quotationStatus) {
    const validUntil = new Date(input.quotationValidUntil);
    const daysLeft = (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (
      daysLeft <= 3 &&
      ["sent", "viewed"].includes(input.quotationStatus)
    ) {
      risks.push({
        code: "quotation_expiring",
        severity: "high",
        label: "Quotation expiring soon",
        evidence: { valid_until: input.quotationValidUntil, days_left: Math.ceil(daysLeft) },
      });
    }
  }

  if (input.paymentPending) {
    risks.push({
      code: "payment_pending",
      severity: "high",
      label: "Payment pending",
    });
  }

  if (input.daysSinceCustomerSignal != null && input.daysSinceCustomerSignal >= 7) {
    risks.push({
      code: "no_activity",
      severity: "medium",
      label: "No customer activity in 7+ days",
      evidence: { days: input.daysSinceCustomerSignal },
    });
  }

  if (input.expectedCloseDate && input.stage && !["closed_won", "closed_lost"].includes(input.stage)) {
    const close = new Date(input.expectedCloseDate);
    if (close < now) {
      risks.push({
        code: "overdue_close_date",
        severity: "high",
        label: "Expected close date passed",
        evidence: { expected_close_date: input.expectedCloseDate },
      });
    }
  }

  return risks;
}
