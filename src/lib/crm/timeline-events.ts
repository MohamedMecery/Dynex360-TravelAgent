import type {
  ActivityDirection,
  ActivityType,
  CrmActivity,
  OpportunityStage,
  OpportunityStageHistoryEntry,
} from "@/types";

/** Stable timeline event_type values (CRM Phase 7 — do not rename without migration plan). */
export const TIMELINE_EVENT_TYPE = {
  ACTIVITY_CALL_INCOMING: "activity.call.incoming",
  ACTIVITY_CALL_OUTGOING: "activity.call.outgoing",
  ACTIVITY_WHATSAPP_INCOMING: "activity.whatsapp.incoming",
  ACTIVITY_WHATSAPP_OUTGOING: "activity.whatsapp.outgoing",
  ACTIVITY_EMAIL_INCOMING: "activity.email.incoming",
  ACTIVITY_EMAIL_OUTGOING: "activity.email.outgoing",
  ACTIVITY_MEETING: "activity.meeting",
  ACTIVITY_TASK: "activity.task",
  LEAD_CREATED: "lead_created",
  OPPORTUNITY_CREATED: "opportunity_created",
  OPPORTUNITY_STAGE_CHANGED: "opportunity.stage_changed",
  BOOKING_CREATED: "booking_created",
  INVOICE_CREATED: "invoice_created",
  PAYMENT_RECEIVED: "payment_received",
  TICKET_CREATED: "ticket_created",
  QUOTATION_CREATED: "quotation_created",
  QUOTATION_SENT: "quotation_sent",
  QUOTATION_VIEWED: "quotation_viewed",
  QUOTATION_ACCEPTED: "quotation_accepted",
  QUOTATION_REJECTED: "quotation_rejected",
  QUOTATION_CONVERTED: "quotation_converted",
  CUSTOMER_PORTAL_REGISTERED: "customer.portal_registered",
  CUSTOMER_PASSWORD_RESET_REQUESTED: "customer.password_reset_requested",
  CUSTOMER_CREATED: "customer.created",
  BOOKING_UPDATED: "booking.updated",
  BOOKING_CANCELLED: "booking.cancelled",
} as const;

export type TimelineBucket = "all" | "sales" | "operations" | "support";

export const TIMELINE_BUCKET_BY_EVENT_TYPE: Record<
  TimelineEventType,
  Exclude<TimelineBucket, "all">
> = {
  [TIMELINE_EVENT_TYPE.ACTIVITY_CALL_INCOMING]: "sales",
  [TIMELINE_EVENT_TYPE.ACTIVITY_CALL_OUTGOING]: "sales",
  [TIMELINE_EVENT_TYPE.ACTIVITY_WHATSAPP_INCOMING]: "sales",
  [TIMELINE_EVENT_TYPE.ACTIVITY_WHATSAPP_OUTGOING]: "sales",
  [TIMELINE_EVENT_TYPE.ACTIVITY_EMAIL_INCOMING]: "sales",
  [TIMELINE_EVENT_TYPE.ACTIVITY_EMAIL_OUTGOING]: "sales",
  [TIMELINE_EVENT_TYPE.ACTIVITY_MEETING]: "sales",
  [TIMELINE_EVENT_TYPE.ACTIVITY_TASK]: "sales",
  [TIMELINE_EVENT_TYPE.LEAD_CREATED]: "sales",
  [TIMELINE_EVENT_TYPE.OPPORTUNITY_CREATED]: "sales",
  [TIMELINE_EVENT_TYPE.OPPORTUNITY_STAGE_CHANGED]: "sales",
  [TIMELINE_EVENT_TYPE.BOOKING_CREATED]: "operations",
  [TIMELINE_EVENT_TYPE.INVOICE_CREATED]: "operations",
  [TIMELINE_EVENT_TYPE.PAYMENT_RECEIVED]: "operations",
  [TIMELINE_EVENT_TYPE.TICKET_CREATED]: "support",
  [TIMELINE_EVENT_TYPE.QUOTATION_CREATED]: "sales",
  [TIMELINE_EVENT_TYPE.QUOTATION_SENT]: "sales",
  [TIMELINE_EVENT_TYPE.QUOTATION_VIEWED]: "sales",
  [TIMELINE_EVENT_TYPE.QUOTATION_ACCEPTED]: "sales",
  [TIMELINE_EVENT_TYPE.QUOTATION_REJECTED]: "sales",
  [TIMELINE_EVENT_TYPE.QUOTATION_CONVERTED]: "sales",
  [TIMELINE_EVENT_TYPE.CUSTOMER_PORTAL_REGISTERED]: "sales",
  [TIMELINE_EVENT_TYPE.CUSTOMER_PASSWORD_RESET_REQUESTED]: "sales",
  [TIMELINE_EVENT_TYPE.CUSTOMER_CREATED]: "sales",
  [TIMELINE_EVENT_TYPE.BOOKING_UPDATED]: "operations",
  [TIMELINE_EVENT_TYPE.BOOKING_CANCELLED]: "operations",
};

export type TimelineEventType =
  (typeof TIMELINE_EVENT_TYPE)[keyof typeof TIMELINE_EVENT_TYPE];

export const DIRECTIONAL_ACTIVITY_TYPES: readonly ActivityType[] = [
  "call",
  "whatsapp",
  "email",
];

export type TimelineRefTable =
  | "activities"
  | "opportunity_stage_history"
  | "leads"
  | "opportunities"
  | "bookings"
  | "invoices"
  | "payments"
  | "support_tickets"
  | "quotations"
  | "domain_events";

export interface TimelineEvent {
  id: string;
  event_type: TimelineEventType;
  title: string;
  occurred_at: string;
  ref_table: TimelineRefTable;
  ref_id: string;
  meta: Record<string, unknown>;
}

export interface TimelineViewRow {
  tenant_id: string;
  customer_id: string;
  id: string;
  event_type: string;
  title: string;
  occurred_at: string;
  ref_table: string;
  ref_id: string;
  meta: Record<string, unknown> | null;
  timeline_bucket: string;
}

const TIMELINE_EVENT_TYPE_SET = new Set<string>(Object.values(TIMELINE_EVENT_TYPE));

export function timelineViewRowToEvent(row: TimelineViewRow): TimelineEvent | null {
  if (!TIMELINE_EVENT_TYPE_SET.has(row.event_type)) {
    return null;
  }
  return {
    id: row.id,
    event_type: row.event_type as TimelineEventType,
    title: row.title,
    occurred_at: row.occurred_at,
    ref_table: row.ref_table as TimelineRefTable,
    ref_id: row.ref_id,
    meta: row.meta ?? {},
  };
}

export function filterTimelineByBucket(
  events: TimelineEvent[],
  bucket: TimelineBucket
): TimelineEvent[] {
  if (bucket === "all") return events;
  return events.filter(
    (e) => TIMELINE_BUCKET_BY_EVENT_TYPE[e.event_type] === bucket
  );
}

export function requiresActivityDirection(
  activityType: ActivityType
): boolean {
  return (DIRECTIONAL_ACTIVITY_TYPES as readonly string[]).includes(
    activityType
  );
}

const ACTIVITY_EVENT_BY_DIRECTION: Record<
  "call" | "whatsapp" | "email",
  Record<ActivityDirection, TimelineEventType>
> = {
  call: {
    incoming: TIMELINE_EVENT_TYPE.ACTIVITY_CALL_INCOMING,
    outgoing: TIMELINE_EVENT_TYPE.ACTIVITY_CALL_OUTGOING,
  },
  whatsapp: {
    incoming: TIMELINE_EVENT_TYPE.ACTIVITY_WHATSAPP_INCOMING,
    outgoing: TIMELINE_EVENT_TYPE.ACTIVITY_WHATSAPP_OUTGOING,
  },
  email: {
    incoming: TIMELINE_EVENT_TYPE.ACTIVITY_EMAIL_INCOMING,
    outgoing: TIMELINE_EVENT_TYPE.ACTIVITY_EMAIL_OUTGOING,
  },
};

export function resolveActivityEventType(
  activityType: ActivityType,
  direction: ActivityDirection | null | undefined
): TimelineEventType {
  if (activityType === "meeting") {
    return TIMELINE_EVENT_TYPE.ACTIVITY_MEETING;
  }
  if (activityType === "task") {
    return TIMELINE_EVENT_TYPE.ACTIVITY_TASK;
  }
  const dir: ActivityDirection = direction ?? "outgoing";
  return ACTIVITY_EVENT_BY_DIRECTION[activityType][dir];
}

export function activityToTimelineEvent(activity: CrmActivity): TimelineEvent {
  return {
    id: activity.id,
    event_type: resolveActivityEventType(
      activity.activity_type,
      activity.direction
    ),
    title: activity.subject,
    occurred_at: activity.completed_at ?? activity.created_at,
    ref_table: "activities",
    ref_id: activity.id,
    meta: {
      activity_type: activity.activity_type,
      direction: activity.direction ?? null,
      status: activity.status,
      assigned_to: activity.assigned_to,
      due_date: activity.due_date ?? null,
      related_lead_id: activity.related_lead_id ?? null,
      related_opportunity_id: activity.related_opportunity_id ?? null,
      related_customer_id: activity.related_customer_id ?? null,
    },
  };
}

export function stageHistoryToTimelineEvent(
  entry: OpportunityStageHistoryEntry
): TimelineEvent {
  const fromLabel = entry.from_stage ?? "—";
  const toLabel = entry.to_stage;
  return {
    id: entry.id,
    event_type: TIMELINE_EVENT_TYPE.OPPORTUNITY_STAGE_CHANGED,
    title: `${fromLabel} → ${toLabel}`,
    occurred_at: entry.changed_at,
    ref_table: "opportunity_stage_history",
    ref_id: entry.id,
    meta: {
      from_stage: entry.from_stage,
      to_stage: entry.to_stage,
      changed_by: entry.changed_by ?? null,
      opportunity_id: entry.opportunity_id,
    },
  };
}

export function mergeTimelineEvents(
  ...groups: TimelineEvent[][]
): TimelineEvent[] {
  return groups
    .flat()
    .sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
}
