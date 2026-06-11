"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityDirectionField } from "@/components/crm/activity-direction-field";
import { requiresActivityDirection } from "@/lib/crm/timeline-events";
import { useNavigation } from "@refinedev/core";
import { useRouter, useSearchParams } from "next/navigation";
import { apiCreateActivity } from "@/lib/crm/activities-api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import type { ActivityDirection, ActivityStatus, ActivityType } from "@/types";

interface ActivityFormValues {
  activity_type: ActivityType;
  direction?: ActivityDirection;
  subject: string;
  description: string;
  due_date: string;
  status: ActivityStatus;
  related_lead_id: string;
  related_opportunity_id: string;
  related_customer_id: string;
}

export default function ActivityCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    defaultValues: {
      activity_type: "task",
      direction: "outgoing",
      subject: "",
      description: "",
      due_date: "",
      status: "open",
      related_lead_id: searchParams.get("lead_id") ?? "",
      related_opportunity_id: searchParams.get("opportunity_id") ?? "",
      related_customer_id: searchParams.get("customer_id") ?? "",
    },
  });

  const activityType = watch("activity_type");

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    try {
      const activity = await apiCreateActivity({
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
        related_lead_id: values.related_lead_id || null,
        related_opportunity_id: values.related_opportunity_id || null,
        related_customer_id: values.related_customer_id || null,
      });
      router.push(`/crm/activities/show/${activity.id}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : t("leads.actionError"));
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">{t("activities.createTitle")}</h2>
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t("activities.details")}</CardTitle>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <div>
              <label className="text-sm font-medium">{t("activities.typeLabel")}</label>
              <Select {...register("activity_type", { required: true })}>
                {(["call", "whatsapp", "email", "meeting", "task"] as const).map(
                  (type) => (
                    <option key={type} value={type}>
                      {t(`activities.type.${type}`)}
                    </option>
                  )
                )}
              </Select>
            </div>
            <ActivityDirectionField
              activityType={activityType}
              register={register}
            />
            <div>
              <label className="text-sm font-medium">{t("activities.subject")}</label>
              <Input {...register("subject", { required: true })} />
              {errors.subject && (
                <p className="text-xs text-destructive">{t("common.required")}</p>
              )}
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
            <div>
              <label className="text-sm font-medium">{t("leads.title")} ID</label>
              <Input {...register("related_lead_id")} placeholder={t("common.optional")} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("opportunities.title")} ID</label>
              <Input
                {...register("related_opportunity_id")}
                placeholder={t("common.optional")}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("nav.customers")} ID</label>
              <Input
                {...register("related_customer_id")}
                placeholder={t("common.optional")}
              />
            </div>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("common.create")}
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
