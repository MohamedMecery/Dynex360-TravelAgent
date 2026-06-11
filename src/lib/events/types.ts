/** Canonical domain event type strings (Sprint 8C). */
export const DOMAIN_EVENT_TYPE = {
  QUOTATION_ACCEPTED: "quotation.accepted",
  QUOTATION_REJECTED: "quotation.rejected",
  QUOTATION_SENT: "quotation.sent",
  QUOTATION_VIEWED: "quotation.viewed",
  BOOKING_CREATED: "booking.created",
  BOOKING_UPDATED: "booking.updated",
  BOOKING_CANCELLED: "booking.cancelled",
  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_PORTAL_REGISTERED: "customer.portal_registered",
  CUSTOMER_PASSWORD_RESET_REQUESTED: "customer.password_reset_requested",
  PAYMENT_CREATED: "payment.created",
  PAYMENT_AUTHORIZED: "payment.authorized",
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_FAILED: "payment.failed",
  PAYMENT_REFUNDED: "payment.refunded",
} as const;

export type DomainEventType =
  (typeof DOMAIN_EVENT_TYPE)[keyof typeof DOMAIN_EVENT_TYPE];

export type DomainActorType = "staff" | "customer" | "system";

export type DomainAggregateType =
  | "quotation"
  | "booking"
  | "customer"
  | "portal_account"
  | "payment_order"
  | "payment_attempt";

export interface DomainEventRecord {
  id: string;
  tenant_id: string;
  event_type: DomainEventType | string;
  aggregate_type: DomainAggregateType | string;
  aggregate_id: string;
  customer_id: string | null;
  actor_type: DomainActorType;
  actor_user_id: string | null;
  actor_customer_id: string | null;
  actor_portal_account_id: string | null;
  payload: Record<string, unknown>;
  idempotency_key: string;
  occurred_at: string;
  created_at: string;
}

export interface EmitDomainEventInput {
  tenantId: string;
  eventType: DomainEventType | string;
  aggregateType: DomainAggregateType | string;
  aggregateId: string;
  customerId?: string | null;
  actorType?: DomainActorType;
  actorUserId?: string | null;
  actorCustomerId?: string | null;
  actorPortalAccountId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
  occurredAt?: string;
}

export function buildIdempotencyKey(
  eventType: string,
  tenantId: string,
  aggregateType: string,
  aggregateId: string,
  suffix?: string
): string {
  const base = `${eventType}:${tenantId}:${aggregateType}:${aggregateId}`;
  return suffix ? `${base}:${suffix}` : base;
}
