import type { PortalQuotationDetail } from "@/lib/portal/portal-quotations-service";

export type PortalQuotationTimelineEventType =
  | "created"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected";

export interface PortalQuotationTimelineEvent {
  type: PortalQuotationTimelineEventType;
  label_key: string;
  occurred_at: string;
  meta?: Record<string, string | null>;
}

export function buildPortalQuotationTimeline(
  quotation: PortalQuotationDetail
): PortalQuotationTimelineEvent[] {
  const events: PortalQuotationTimelineEvent[] = [
    {
      type: "created",
      label_key: "portal.timeline.created",
      occurred_at: quotation.created_at,
    },
  ];

  if (quotation.sent_at) {
    events.push({
      type: "sent",
      label_key: "portal.timeline.sent",
      occurred_at: quotation.sent_at,
    });
  }

  if (quotation.viewed_at) {
    events.push({
      type: "viewed",
      label_key: "portal.timeline.viewed",
      occurred_at: quotation.viewed_at,
    });
  }

  if (quotation.accepted_at) {
    events.push({
      type: "accepted",
      label_key: "portal.timeline.accepted",
      occurred_at: quotation.accepted_at,
    });
  }

  if (quotation.rejected_at) {
    events.push({
      type: "rejected",
      label_key: "portal.timeline.rejected",
      occurred_at: quotation.rejected_at,
      meta: { reason: quotation.rejection_reason ?? null },
    });
  }

  return events.sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );
}
