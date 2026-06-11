"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityDirectionField } from "@/components/crm/activity-direction-field";
import { requiresActivityDirection } from "@/lib/crm/timeline-events";
import { useNavigation, useOne } from "@refinedev/core";
import { useParams, useRouter } from "next/navigation";
import { apiUpdateActivity } from "@/lib/crm/activities-api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import type {
  ActivityDirection,
  ActivityStatus,
  ActivityType,
  CrmActivity,
} from "@/types";

interface ActivityFormValues {
  activity_type: ActivityType;
  direction?: ActivityDirection;
  subject: string;
  description: string;
  due_date: string;
  status: ActivityStatus;
}

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ActivityEditPage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useOne<CrmActivity>({
    resource: "activities",
    id,
  });
  const activity = data?.data;

  const { register, handleSubmit, reset, watch } = useForm<ActivityFormValues>();
  const activityType = watch("activity_type") ?? activity?.activity_type ?? "task";

  useEffect(() => {
    if (!activity) return;
    reset({
      activity_type: activity.activity_type,
      direction: activity.direction ?? "outgoing",
      subject: activity.subject,
      description: activity.description ?? "",
      due_date: toLocalDatetime(activity.due_date),
      status: activity.status,
    });
  }, [activity, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    try {
      await apiUpdateActivity(id, {
        activity_type: values.activity_type,
        direction: requiresActivityDirection(values.activity_type)
          ? values.direction ?? "outgoing"
          : null,
        subject: values.subject,
        description: values.description || null,
        due_date: values.due_date
          ? new Date(values.due_date).toISOString()
          : null,
        status: values.status,
      });
      router.push(`/crm/activities/show/${id}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : t("leads.actionError"));
    } finally {
      setSaving(false);
    }
  });

  if (isLoading || !activity) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">{t("activities.editTitle")}</h2>
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t("activities.details")}</CardTitle>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <div>
              <label className="text-sm font-medium">{t("activities.typeLabel")}</label>
              <Select {...register("activity_type")}>
                {(["call", "whatsapp", "email", "meeting", "task"] as const).map(
                  (type) => (
                    <option key={type} value={type}>
                      {t(`activities.type.${type}`)}
                    </option>
                  )
                )}
              </Select>
            </div>
            {activityType && (
              <ActivityDirectionField
                activityType={activityType}
                register={register}
              />
            )}
            <div>
              <label className="text-sm font-medium">{t("activities.subject")}</label>
              <Input {...register("subject", { required: true })} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("common.notes")}</label>
              <Textarea {...register("description")} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("activities.due")}</label>
              <Input type="datetime-local" {...register("due_date")} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("activities.statusLabel")}</label>
              <Select {...register("status")}>
                {(["open", "in_progress", "completed", "cancelled"] as const).map(
                  (s) => (
                    <option key={s} value={s}>
                      {t(`activities.status.${s}`)}
                    </option>
                  )
                )}
              </Select>
            </div>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("common.save")}
              </Button>
              <Button type="button" variant="outline" onClick={() => list("activities")}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
