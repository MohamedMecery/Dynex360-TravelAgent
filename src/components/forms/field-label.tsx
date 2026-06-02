"use client";

import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface FieldLabelProps {
  htmlFor?: string;
  label: string;
  required?: boolean;
}

export function FieldLabel({ htmlFor, label, required = false }: FieldLabelProps) {
  const { t } = useTranslation();

  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="text-sm font-medium">{label}</span>
      <span
        className={cn(
          "text-xs font-normal",
          required ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {required ? t("common.required") : t("common.optional")}
      </span>
    </label>
  );
}
