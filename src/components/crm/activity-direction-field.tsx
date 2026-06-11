"use client";

import { Select } from "@/components/ui/input";
import { requiresActivityDirection } from "@/lib/crm/timeline-events";
import { useTranslation } from "@/i18n/locale-provider";
import type { ActivityType } from "@/types";
import type { FieldValues, UseFormRegister } from "react-hook-form";

interface ActivityDirectionFieldProps<T extends FieldValues> {
  activityType: ActivityType;
  register: UseFormRegister<T>;
}

export function ActivityDirectionField<T extends FieldValues>({
  activityType,
  register,
}: ActivityDirectionFieldProps<T>) {
  const { t } = useTranslation();

  if (!requiresActivityDirection(activityType)) {
    return null;
  }

  return (
    <div>
      <label className="text-sm font-medium">{t("activities.directionLabel")}</label>
      <Select
        {...register("direction" as never, { required: true })}
        defaultValue="outgoing"
      >
        <option value="incoming">{t("activities.direction.incoming")}</option>
        <option value="outgoing">{t("activities.direction.outgoing")}</option>
      </Select>
    </div>
  );
}
