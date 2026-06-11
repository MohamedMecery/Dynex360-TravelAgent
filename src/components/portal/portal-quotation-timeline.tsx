"use client";

import { useTranslation } from "@/i18n/locale-provider";
import type { PortalQuotationTimelineEvent } from "@/lib/portal/portal-quotation-timeline-service";

interface PortalQuotationTimelineProps {
  events: PortalQuotationTimelineEvent[];
}

export function PortalQuotationTimeline({ events }: PortalQuotationTimelineProps) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("common.noData")}</p>;
  }

  return (
    <ol className="relative space-y-4 border-s border-muted ps-4">
      {events.map((event, index) => (
        <li key={`${event.type}-${event.occurred_at}-${index}`} className="relative">
          <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="font-medium text-sm">{t(event.label_key)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(event.occurred_at).toLocaleString()}
          </p>
          {event.meta?.reason && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("portal.timeline.reason")}: {event.meta.reason}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
