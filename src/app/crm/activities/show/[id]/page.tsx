"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCan, useGetIdentity, useOne } from "@refinedev/core";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { activityToTimelineEvent } from "@/lib/crm/timeline-events";
import { useTranslation } from "@/i18n/locale-provider";
import type { CrmActivity, UserRole } from "@/types";

export default function ActivityShowPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const { data: identity } = useGetIdentity<{ role?: UserRole; id?: string }>();
  const { data, isLoading } = useOne<CrmActivity>({ resource: "activities", id });
  const activity = data?.data;

  const { data: canEdit } = useCan({
    resource: "activities",
    action: "edit",
    params: { role: identity?.role },
  });

  if (isLoading || !activity) {
    return <p>{t("common.loading")}</p>;
  }

  const canWrite =
    canEdit?.can !== false &&
    (identity?.role === "tenant_admin" ||
      identity?.role === "super_admin" ||
      activity.assigned_to === identity?.id);

  const timelineEvent = activityToTimelineEvent(activity);
  const eventLabelKey = `activities.eventType.${timelineEvent.event_type}`;
  const eventLabel = t(eventLabelKey);
  const eventDisplay =
    eventLabel === eventLabelKey ? timelineEvent.event_type : eventLabel;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{activity.subject}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge namespace="activities.type" value={activity.activity_type} />
            <StatusBadge namespace="activities.status" value={activity.status} />
          </div>
        </div>
        {canWrite && (
          <Link href={`/crm/activities/edit/${activity.id}`}>
            <Button variant="outline">{t("common.edit")}</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("activities.details")}</CardTitle>
        </CardHeader>
        <dl className="space-y-2 px-6 pb-6 text-sm">
          <div>
            <dt className="font-medium">{t("activities.eventTypeLabel")}</dt>
            <dd className="text-muted-foreground">{eventDisplay}</dd>
          </div>
          {activity.direction && (
            <div>
              <dt className="font-medium">{t("activities.directionLabel")}</dt>
              <dd>
                <StatusBadge
                  namespace="activities.direction"
                  value={activity.direction}
                />
              </dd>
            </div>
          )}
          {activity.description && (
            <div>
              <dt className="font-medium">{t("common.notes")}</dt>
              <dd className="text-muted-foreground">{activity.description}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium">{t("activities.due")}</dt>
            <dd>
              {activity.due_date
                ? new Date(activity.due_date).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t("activities.completed")}</dt>
            <dd>
              {activity.completed_at
                ? new Date(activity.completed_at).toLocaleString()
                : "—"}
            </dd>
          </div>
          {activity.related_lead_id && (
            <div>
              <dt className="font-medium">{t("leads.title")}</dt>
              <dd>
                <Link
                  href={`/crm/leads/show/${activity.related_lead_id}`}
                  className="text-primary underline"
                >
                  {t("common.view")}
                </Link>
              </dd>
            </div>
          )}
          {activity.related_opportunity_id && (
            <div>
              <dt className="font-medium">{t("opportunities.title")}</dt>
              <dd>
                <Link
                  href={`/crm/opportunities/show/${activity.related_opportunity_id}`}
                  className="text-primary underline"
                >
                  {t("common.view")}
                </Link>
              </dd>
            </div>
          )}
          {activity.related_customer_id && (
            <div>
              <dt className="font-medium">{t("nav.customers")}</dt>
              <dd>
                <Link
                  href={`/customers/show/${activity.related_customer_id}`}
                  className="text-primary underline"
                >
                  {t("common.view")}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
}
