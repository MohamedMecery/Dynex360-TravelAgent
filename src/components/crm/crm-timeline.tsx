"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiListActivityTimelineEvents } from "@/lib/crm/activities-api-client";
import { apiGetOpportunityStageHistory } from "@/lib/crm/opportunities-api-client";
import {
  mergeTimelineEvents,
  stageHistoryToTimelineEvent,
  type TimelineEvent,
} from "@/lib/crm/timeline-events";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/locale-provider";

interface CrmTimelineProps {
  leadId?: string;
  opportunityId?: string;
  customerId?: string;
  includeStageHistory?: boolean;
  canWrite?: boolean;
}

function eventHref(event: TimelineEvent): string | null {
  if (event.ref_table === "activities") {
    return `/crm/activities/show/${event.ref_id}`;
  }
  if (event.ref_table === "quotations") {
    return `/crm/quotations/show/${event.ref_id}`;
  }
  return null;
}

export function CrmTimeline({
  leadId,
  opportunityId,
  customerId,
  includeStageHistory = false,
  canWrite = false,
}: CrmTimelineProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: activityEvents } = await apiListActivityTimelineEvents({
        lead_id: leadId,
        opportunity_id: opportunityId,
        customer_id: customerId,
        limit: 50,
      });

      let stageEvents: TimelineEvent[] = [];
      if (includeStageHistory && opportunityId) {
        const history = await apiGetOpportunityStageHistory(opportunityId);
        stageEvents = history.map(stageHistoryToTimelineEvent);
      }

      setItems(mergeTimelineEvents(activityEvents, stageEvents));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [leadId, opportunityId, customerId, includeStageHistory]);

  useEffect(() => {
    void load();
  }, [load]);

  const createHref = (() => {
    const params = new URLSearchParams();
    if (leadId) params.set("lead_id", leadId);
    if (opportunityId) params.set("opportunity_id", opportunityId);
    if (customerId) params.set("customer_id", customerId);
    const qs = params.toString();
    return `/crm/activities/create${qs ? `?${qs}` : ""}`;
  })();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{t("activities.timeline")}</CardTitle>
        {canWrite && (
          <Link href={createHref}>
            <Button type="button" size="sm" variant="outline">
              {t("activities.logActivity")}
            </Button>
          </Link>
        )}
      </CardHeader>
      <div className="px-6 pb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("activities.noTimeline")}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((event) => {
              const href = eventHref(event);
              const labelKey = `activities.eventType.${event.event_type}`;
              const label = t(labelKey);
              const displayLabel = label === labelKey ? event.event_type : label;

              return (
                <li
                  key={`${event.ref_table}-${event.id}`}
                  className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3 last:border-0"
                >
                  <div>
                    {href ? (
                      <Link
                        href={href}
                        className="font-medium text-primary hover:underline"
                      >
                        {event.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{event.title}</p>
                    )}
                    <div className="mt-1">
                      <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {displayLabel}
                      </span>
                    </div>
                    {event.ref_table === "activities" &&
                      typeof event.meta.status === "string" && (
                        <div className="mt-1">
                          <StatusBadge
                            namespace="activities.status"
                            value={event.meta.status}
                          />
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
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
