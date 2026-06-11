"use client";

import { useSearchParams } from "next/navigation";
import { OperationsAssistantPanel } from "@/components/operations-ai/OperationsAssistantPanel";
import { useTranslation } from "@/i18n/locale-provider";

export default function OperationsAgentPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  if (!bookingId) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("opsAi.selectBookingHint")}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">{t("opsAi.panelTitle")}</h2>
      <OperationsAssistantPanel bookingId={bookingId} />
    </div>
  );
}
