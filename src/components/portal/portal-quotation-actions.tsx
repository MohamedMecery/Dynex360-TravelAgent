"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import { PORTAL_ACTIONABLE_QUOTATION_STATUSES } from "@/lib/portal/constants";
import type { QuotationStatus } from "@/types";

interface PortalQuotationActionsProps {
  quotationId: string;
  status: QuotationStatus;
  onUpdated: () => void;
}

export function PortalQuotationActions({
  quotationId,
  status,
  onUpdated,
}: PortalQuotationActionsProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const actionable = PORTAL_ACTIONABLE_QUOTATION_STATUSES.includes(
    status as (typeof PORTAL_ACTIONABLE_QUOTATION_STATUSES)[number]
  );

  if (!actionable) return null;

  const handleAccept = async () => {
    setError("");
    setLoading("accept");
    try {
      const res = await fetch(`/api/portal/quotations/${quotationId}/accept`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.message ?? t("portal.actions.failed"));
        return;
      }
      onUpdated();
    } catch {
      setError(t("portal.actions.failed"));
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setError("");
    setLoading("reject");
    try {
      const res = await fetch(`/api/portal/quotations/${quotationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.message ?? t("portal.actions.failed"));
        return;
      }
      setShowReject(false);
      onUpdated();
    } catch {
      setError(t("portal.actions.failed"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{t("portal.actions.prompt")}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleAccept} disabled={loading !== null}>
          {loading === "accept" ? t("portal.actions.accepting") : t("portal.actions.accept")}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowReject((v) => !v)}
          disabled={loading !== null}
        >
          {t("portal.actions.reject")}
        </Button>
      </div>
      {showReject && (
        <div className="space-y-2">
          <Label htmlFor="reject-reason">{t("portal.actions.rejectReason")}</Label>
          <Input
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("portal.actions.rejectReasonPlaceholder")}
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReject}
            disabled={loading !== null}
          >
            {loading === "reject" ? t("portal.actions.rejecting") : t("portal.actions.confirmReject")}
          </Button>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
