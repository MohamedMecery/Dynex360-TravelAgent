"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGetCustomer360Timeline } from "@/lib/crm/customer-360-api-client";
import {
  filterTimelineByBucket,
  type TimelineBucket,
  type TimelineEvent,
} from "@/lib/crm/timeline-events";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";

const BUCKETS: TimelineBucket[] = ["all", "sales", "operations", "support"];

function eventHref(event: TimelineEvent): string | null {
  switch (event.ref_table) {
    case "activities":
      return `/crm/activities/show/${event.ref_id}`;
    case "opportunities":
      return `/crm/opportunities/show/${event.ref_id}`;
    case "leads":
      return `/crm/leads/show/${event.ref_id}`;
    case "bookings":
      return `/bookings/show/${event.ref_id}`;
    case "invoices":
      return `/invoices/show/${event.ref_id}`;
    case "payments":
      return `/payments/show/${event.ref_id}`;
    case "support_tickets":
      return `/ai/support/tickets/show/${event.ref_id}`;
    case "quotations":
      return `/crm/quotations/show/${event.ref_id}`;
    case "domain_events":
      if (event.meta?.aggregate_type === "quotation" && event.meta?.aggregate_id) {
        return `/crm/quotations/show/${String(event.meta.aggregate_id)}`;
      }
      if (event.meta?.aggregate_type === "booking" && event.meta?.aggregate_id) {
        return `/bookings/show/${String(event.meta.aggregate_id)}`;
      }
      return null;
    default:
      return null;
  }
}

interface Customer360TimelineProps {
  customerId: string;
  preview?: TimelineEvent[];
  previewOnly?: boolean;
  onViewFull?: () => void;
  canWriteActivity?: boolean;
}

export function Customer360Timeline({
  customerId,
  preview,
  previewOnly = false,
  onViewFull,
  canWriteActivity = false,
}: Customer360TimelineProps) {
  const { t } = useTranslation();
  const [bucket, setBucket] = useState<TimelineBucket>("all");
  const [items, setItems] = useState<TimelineEvent[]>(preview ?? []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(!previewOnly && !preview);

  const loadPage = useCallback(
    async (append: boolean, nextCursor: string | null, activeBucket: TimelineBucket) => {
      if (previewOnly && preview) {
        setItems(preview);
        return;
      }
      setLoading(true);
      try {
        const page = await apiGetCustomer360Timeline(customerId, {
          limit: previewOnly ? 15 : 50,
          cursor: append ? nextCursor : null,
          bucket: activeBucket,
        });
        setItems((prev) => (append ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.next_cursor);
        setHasMore(page.meta.has_more);
      } catch {
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [customerId, previewOnly, preview]
  );

  useEffect(() => {
    if (previewOnly && preview) {
      setItems(preview);
      return;
    }
    void loadPage(false, null, bucket);
  }, [bucket, previewOnly, preview, loadPage]);

  const createHref = `/crm/activities/create?customer_id=${customerId}`;

  const visibleItems = previewOnly
    ? filterTimelineByBucket(preview ?? items, bucket).slice(0, 15)
    : items;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {BUCKETS.map((b) => (
            <Button
              key={b}
              type="button"
              size="sm"
              variant={bucket === b ? "default" : "outline"}
              onClick={() => setBucket(b)}
            >
              {t(`customer360.bucket.${b}`)}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {previewOnly && onViewFull && (
            <Button type="button" size="sm" variant="ghost" onClick={onViewFull}>
              {t("customer360.viewFullTimeline")}
            </Button>
          )}
          {canWriteActivity && (
            <Link href={createHref}>
              <Button type="button" size="sm" variant="outline">
                {t("activities.logActivity")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : visibleItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("activities.noTimeline")}</p>
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((event) => (
            <TimelineRow key={`${event.ref_table}-${event.id}`} event={event} />
          ))}
        </ul>
      )}

      {!previewOnly && hasMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void loadPage(true, cursor, bucket)}
        >
          {loading ? t("common.loading") : t("customer360.loadMore")}
        </Button>
      )}
    </div>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const { t } = useTranslation();
  const href = eventHref(event);
  const labelKey = `activities.eventType.${event.event_type}`;
  const label = t(labelKey);
  const displayLabel = label === labelKey ? event.event_type : label;

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3 last:border-0">
      <div>
        {href ? (
          <Link href={href} className="font-medium text-primary hover:underline">
            {event.title}
          </Link>
        ) : (
          <p className="font-medium">{event.title}</p>
        )}
        <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {displayLabel}
        </span>
        {event.ref_table === "activities" &&
          typeof event.meta.status === "string" && (
            <div className="mt-1">
              <StatusBadge namespace="activities.status" value={event.meta.status} />
            </div>
          )}
        {event.ref_table === "opportunity_stage_history" && (
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {event.meta.from_stage ? (
              <>
                <StatusBadge
                  namespace="opportunities.stage"
                  value={String(event.meta.from_stage)}
                />
                <span>→</span>
              </>
            ) : null}
            <StatusBadge
              namespace="opportunities.stage"
              value={String(event.meta.to_stage)}
            />
          </div>
        )}
      </div>
      <time className="text-xs text-muted-foreground">
        {new Date(event.occurred_at).toLocaleString()}
      </time>
    </li>
  );
}
