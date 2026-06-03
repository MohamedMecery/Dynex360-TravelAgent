"use client";

import { getAuditUserLabel, type RecordAuditFields } from "@/lib/audit/record-metadata";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";

interface RecordMetadataProps extends RecordAuditFields {
  className?: string;
}

function formatAuditLine(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

export function RecordMetadata({
  created_at,
  updated_at,
  created_by_user,
  updated_by_user,
  className,
}: RecordMetadataProps) {
  const { t } = useTranslation();
  const { formatDateTime } = useFormat();

  if (!created_at) return null;

  const createdLabel = getAuditUserLabel(created_by_user);
  const updatedLabel = getAuditUserLabel(updated_by_user);
  const showUpdated =
    Boolean(updated_at) &&
    (updated_at !== created_at || (updatedLabel && updatedLabel !== createdLabel));

  return (
    <div
      className={cn(
        "border-t pt-4 text-xs text-muted-foreground space-y-1",
        className
      )}
      data-testid="record-metadata"
    >
      <p>
        {createdLabel
          ? formatAuditLine(t("audit.createdBy"), {
              user: createdLabel,
              date: formatDateTime(created_at),
            })
          : formatAuditLine(t("audit.createdOn"), {
              date: formatDateTime(created_at),
            })}
      </p>
      {showUpdated && updated_at && (
        <p>
          {updatedLabel
            ? formatAuditLine(t("audit.updatedBy"), {
                user: updatedLabel,
                date: formatDateTime(updated_at),
              })
            : formatAuditLine(t("audit.updatedOn"), {
                date: formatDateTime(updated_at),
              })}
        </p>
      )}
    </div>
  );
}
