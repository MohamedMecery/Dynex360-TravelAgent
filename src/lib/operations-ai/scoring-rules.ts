import type { OpsOperationalStatus, OpsReadinessItem, OpsRiskIndicator } from "@/lib/operations-ai/types";

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
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

export function computeOpsConfidence(inputs: {
  hasTravelDate: boolean;
  hasTravelers: boolean;
  hasDocuments: boolean;
  hasPaymentContext: boolean;
  hasItems: boolean;
}): number {
  const raw =
    0.25 * (inputs.hasTravelDate ? 1 : 0) +
    0.25 * (inputs.hasTravelers ? 1 : 0) +
    0.2 * (inputs.hasDocuments ? 1 : 0) +
    0.15 * (inputs.hasPaymentContext ? 1 : 0) +
    0.15 * (inputs.hasItems ? 1 : 0);
  return Math.round(raw * 1000) / 1000;
}

export function operationalStatusFromScores(input: {
  riskScore: number;
  readinessScore: number;
  daysToDeparture: number | null;
}): OpsOperationalStatus {
  const { riskScore, readinessScore, daysToDeparture } = input;
  if (
    riskScore >= 70 ||
    (daysToDeparture != null && daysToDeparture <= 7 && readinessScore < 50)
  ) {
    return "critical";
  }
  if (riskScore >= 40 || readinessScore < 60) return "at_risk";
  if (riskScore >= 20 || readinessScore < 80) return "attention_required";
  return "healthy";
}

export function resolveDocumentType(doc: {
  document_type?: string | null;
  file_name?: string | null;
}): string {
  if (doc.document_type && doc.document_type !== "other") return doc.document_type;
  const name = (doc.file_name ?? "").toLowerCase();
  if (name.includes("passport")) return "passport";
  if (name.includes("visa")) return "visa";
  if (name.includes("voucher")) return "voucher";
  if (name.includes("insurance")) return "insurance";
  if (name.includes("ticket")) return "ticket";
  if (name.includes("hotel")) return "hotel_confirmation";
  if (name.includes("itinerary")) return "itinerary";
  return "other";
}

export function buildOpsRiskIndicators(input: {
  paymentGap: boolean;
  daysToDeparture: number | null;
  missingPassports: number;
  missingVoucher: boolean;
  incompleteTravelers: number;
}): OpsRiskIndicator[] {
  const risks: OpsRiskIndicator[] = [];

  if (input.paymentGap) {
    risks.push({
      code: "payment_gap_pre_departure",
      severity: "high",
      label: "Payment not collected before departure",
    });
  }

  if (input.missingPassports > 0) {
    risks.push({
      code: "missing_passport",
      severity: "high",
      label: `${input.missingPassports} traveler(s) missing valid passport`,
      evidence: { count: input.missingPassports },
    });
  }

  if (input.missingVoucher && input.daysToDeparture != null && input.daysToDeparture <= 14) {
    risks.push({
      code: "voucher_missing",
      severity: "medium",
      label: "Voucher not uploaded near departure",
      evidence: { days_to_departure: input.daysToDeparture },
    });
  }

  if (input.incompleteTravelers > 0) {
    risks.push({
      code: "traveler_info_incomplete",
      severity: "medium",
      label: `${input.incompleteTravelers} traveler(s) with incomplete profile`,
      evidence: { count: input.incompleteTravelers },
    });
  }

  if (input.daysToDeparture != null && input.daysToDeparture <= 7) {
    risks.push({
      code: "departure_imminent",
      severity: input.daysToDeparture <= 3 ? "high" : "medium",
      label: `Departure in ${Math.ceil(input.daysToDeparture)} day(s)`,
      evidence: { days_to_departure: input.daysToDeparture },
    });
  }

  return risks;
}

export function readinessFromChecklist(items: OpsReadinessItem[]): number {
  if (items.length === 0) return 0;
  const complete = items.filter((i) => i.complete).length;
  return clampScore((complete / items.length) * 100);
}
