import type { DomainEventRecord } from "@/lib/events/types";
import { DOMAIN_EVENT_TYPE } from "@/lib/events/types";

export interface NotificationCopy {
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  staffActionUrl?: string;
  priority?: "normal" | "high";
}

export function resolveNotificationCopy(event: DomainEventRecord): NotificationCopy {
  const p = event.payload ?? {};
  const quotationNumber = String(p.quotation_number ?? "Quotation");
  const referenceNumber = String(p.reference_number ?? "Booking");
  const customerName = String(p.customer_name ?? "Customer");

  switch (event.event_type) {
    case DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED:
      return {
        title: `Quotation ${quotationNumber} accepted`,
        message: `${customerName} accepted quotation ${quotationNumber}.`,
        entityType: "quotation",
        entityId: event.aggregate_id,
        actionUrl: `/portal/quotations/${event.aggregate_id}`,
        staffActionUrl: `/crm/quotations/show/${event.aggregate_id}`,
        priority: "high",
      };
    case DOMAIN_EVENT_TYPE.QUOTATION_REJECTED:
      return {
        title: `Quotation ${quotationNumber} declined`,
        message: p.rejection_reason
          ? `${customerName} declined quotation ${quotationNumber}: ${p.rejection_reason}`
          : `${customerName} declined quotation ${quotationNumber}.`,
        entityType: "quotation",
        entityId: event.aggregate_id,
        actionUrl: `/portal/quotations/${event.aggregate_id}`,
        staffActionUrl: `/crm/quotations/show/${event.aggregate_id}`,
        priority: "normal",
      };
    case DOMAIN_EVENT_TYPE.QUOTATION_SENT:
      return {
        title: `Quotation ${quotationNumber} sent`,
        message: `Quotation ${quotationNumber} was sent to the customer.`,
        entityType: "quotation",
        entityId: event.aggregate_id,
        actionUrl: `/portal/quotations/${event.aggregate_id}`,
        staffActionUrl: `/crm/quotations/show/${event.aggregate_id}`,
      };
    case DOMAIN_EVENT_TYPE.QUOTATION_VIEWED:
      return {
        title: `Quotation ${quotationNumber} viewed`,
        message: `Customer viewed quotation ${quotationNumber}.`,
        entityType: "quotation",
        entityId: event.aggregate_id,
        staffActionUrl: `/crm/quotations/show/${event.aggregate_id}`,
      };
    case DOMAIN_EVENT_TYPE.BOOKING_CREATED:
      return {
        title: `Booking ${referenceNumber} created`,
        message: `Booking ${referenceNumber} was created.`,
        entityType: "booking",
        entityId: event.aggregate_id,
        actionUrl: `/portal/bookings/${event.aggregate_id}`,
        staffActionUrl: `/bookings/show/${event.aggregate_id}`,
      };
    case DOMAIN_EVENT_TYPE.BOOKING_UPDATED:
      return {
        title: `Booking ${referenceNumber} updated`,
        message: `Booking ${referenceNumber} status: ${p.status ?? "updated"}.`,
        entityType: "booking",
        entityId: event.aggregate_id,
        actionUrl: `/portal/bookings/${event.aggregate_id}`,
        staffActionUrl: `/bookings/show/${event.aggregate_id}`,
      };
    case DOMAIN_EVENT_TYPE.BOOKING_CANCELLED:
      return {
        title: `Booking ${referenceNumber} cancelled`,
        message: `Booking ${referenceNumber} was cancelled.`,
        entityType: "booking",
        entityId: event.aggregate_id,
        actionUrl: `/portal/bookings/${event.aggregate_id}`,
        staffActionUrl: `/bookings/show/${event.aggregate_id}`,
        priority: "high",
      };
    case DOMAIN_EVENT_TYPE.CUSTOMER_PORTAL_REGISTERED:
      return {
        title: "Welcome to your customer portal",
        message: "Your portal account is now active.",
        entityType: "customer",
        entityId: event.customer_id ?? event.aggregate_id,
        actionUrl: "/portal",
        staffActionUrl: event.customer_id
          ? `/customers/show/${event.customer_id}`
          : undefined,
      };
    case DOMAIN_EVENT_TYPE.CUSTOMER_PASSWORD_RESET_REQUESTED:
      return {
        title: "Password reset requested",
        message: "A password reset was requested for your portal account.",
        entityType: "customer",
        entityId: event.customer_id ?? event.aggregate_id,
        actionUrl: "/portal/login",
      };
    case DOMAIN_EVENT_TYPE.CUSTOMER_CREATED:
      return {
        title: "Customer account created",
        message: `${customerName} was added as a customer.`,
        entityType: "customer",
        entityId: event.aggregate_id,
        staffActionUrl: `/customers/show/${event.aggregate_id}`,
      };
    case DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED:
      return {
        title: "Payment received",
        message: `Payment of ${p.amount ?? ""} ${p.currency ?? ""} was completed.`,
        entityType: "payment_order",
        entityId: event.aggregate_id,
        actionUrl: p.booking_id
          ? `/portal/bookings/${p.booking_id}`
          : `/portal/payment-orders/${event.aggregate_id}`,
        staffActionUrl: p.booking_id
          ? `/bookings/show/${p.booking_id}`
          : undefined,
        priority: "high",
      };
    case DOMAIN_EVENT_TYPE.PAYMENT_FAILED:
      return {
        title: "Payment failed",
        message: "An online payment attempt did not complete.",
        entityType: "payment_order",
        entityId: event.aggregate_id,
        actionUrl: `/portal/payment-orders/${event.aggregate_id}`,
        priority: "normal",
      };
    case DOMAIN_EVENT_TYPE.PAYMENT_CREATED:
      return {
        title: "Checkout started",
        message: "Customer started an online checkout session.",
        entityType: "payment_order",
        entityId: event.aggregate_id,
        staffActionUrl: p.quotation_id
          ? `/crm/quotations/show/${p.quotation_id}`
          : undefined,
      };
    default:
      return {
        title: event.event_type,
        message: event.event_type,
        entityType: event.aggregate_type,
        entityId: event.aggregate_id,
      };
  }
}

const CUSTOMER_NOTIFICATION_EVENTS = new Set<string>([
  DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
  DOMAIN_EVENT_TYPE.QUOTATION_REJECTED,
  DOMAIN_EVENT_TYPE.QUOTATION_SENT,
  DOMAIN_EVENT_TYPE.BOOKING_CREATED,
  DOMAIN_EVENT_TYPE.BOOKING_UPDATED,
  DOMAIN_EVENT_TYPE.BOOKING_CANCELLED,
  DOMAIN_EVENT_TYPE.CUSTOMER_PORTAL_REGISTERED,
  DOMAIN_EVENT_TYPE.CUSTOMER_PASSWORD_RESET_REQUESTED,
  DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
  DOMAIN_EVENT_TYPE.PAYMENT_FAILED,
]);

const STAFF_NOTIFICATION_EVENTS = new Set<string>([
  DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
  DOMAIN_EVENT_TYPE.QUOTATION_REJECTED,
  DOMAIN_EVENT_TYPE.QUOTATION_VIEWED,
  DOMAIN_EVENT_TYPE.BOOKING_CREATED,
  DOMAIN_EVENT_TYPE.BOOKING_UPDATED,
  DOMAIN_EVENT_TYPE.BOOKING_CANCELLED,
  DOMAIN_EVENT_TYPE.CUSTOMER_PORTAL_REGISTERED,
  DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
  DOMAIN_EVENT_TYPE.PAYMENT_CREATED,
]);

/** Events that generate a customer portal notification. */
export function shouldNotifyCustomer(eventType: string): boolean {
  return CUSTOMER_NOTIFICATION_EVENTS.has(eventType);
}

/** Events that generate staff inbox notifications. */
export function shouldNotifyStaff(eventType: string): boolean {
  return STAFF_NOTIFICATION_EVENTS.has(eventType);
}
