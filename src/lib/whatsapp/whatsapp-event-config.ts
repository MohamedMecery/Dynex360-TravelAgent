import { DOMAIN_EVENT_TYPE } from "@/lib/events/types";

/** MVP domain events that may trigger automated WhatsApp dispatch. */
export const WHATSAPP_EVENT_TYPES = new Set<string>([
  DOMAIN_EVENT_TYPE.QUOTATION_SENT,
  DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
  DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
  DOMAIN_EVENT_TYPE.BOOKING_CREATED,
]);
