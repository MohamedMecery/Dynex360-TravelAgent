"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import type { AnalyticsPreset } from "@/lib/ai/analytics/types";
import { cn } from "@/lib/utils";

const PRESETS: AnalyticsPreset[] = ["today", "7d", "30d", "90d", "custom"];

interface AnalyticsDateRangeProps {
  preset: AnalyticsPreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: AnalyticsPreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  className?: string;
}

export function AnalyticsDateRange({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  className,
}: AnalyticsDateRangeProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      {PRESETS.map((item) => (
        <Button
          key={item}
          type="button"
          size="sm"
          variant={preset === item ? "default" : "outline"}
          onClick={() => onPresetChange(item)}
        >
          {t(`aiAnalytics.presets.${item}`)}
        </Button>
      ))}
      {preset === "custom" && (
        <>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="analytics-from">
              {t("aiAnalytics.customFrom")}
            </label>
            <Input
              id="analytics-from"
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="w-[10.5rem]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="analytics-to">
              {t("aiAnalytics.customTo")}
            </label>
            <Input
              id="analytics-to"
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="w-[10.5rem]"
            />
          </div>
        </>
      )}
    </div>
  );
}
