import { DOMAIN_EVENT_TYPE } from "@/lib/events/types";

/** Domain events that trigger async operations score recomputation (Sprint 9D). */
export const OPS_SCORE_EVENT_TYPES = new Set<string>([
  DOMAIN_EVENT_TYPE.BOOKING_CREATED,
  DOMAIN_EVENT_TYPE.BOOKING_UPDATED,
  DOMAIN_EVENT_TYPE.BOOKING_CANCELLED,
  DOMAIN_EVENT_TYPE.PAYMENT_CREATED,
  DOMAIN_EVENT_TYPE.PAYMENT_AUTHORIZED,
  DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
  DOMAIN_EVENT_TYPE.PAYMENT_FAILED,
]);

export function shouldEnqueueOpsScore(eventType: string): boolean {
  return OPS_SCORE_EVENT_TYPES.has(eventType);
}
