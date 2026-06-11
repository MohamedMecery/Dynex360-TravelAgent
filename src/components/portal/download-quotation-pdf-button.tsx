"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/locale-provider";

interface DownloadQuotationPdfButtonProps {
  quotationId: string;
  quotationNumber: string;
}

export function DownloadQuotationPdfButton({
  quotationId,
  quotationNumber,
}: DownloadQuotationPdfButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/quotations/${quotationId}/pdf`);
      if (!res.ok) {
        setError(t("portal.pdf.failed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation-${quotationNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("portal.pdf.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
        {loading ? t("portal.pdf.downloading") : t("portal.pdf.download")}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
