"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/locale-provider";
import { useToast } from "@/providers/toast-provider";

interface DownloadInvoicePdfButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export function DownloadInvoicePdfButton({
  invoiceId,
  invoiceNumber,
}: DownloadInvoicePdfButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDownload = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        let message = t("invoices.pdf.downloadError");
        try {
          const body = (await response.json()) as { error?: { message?: string } };
          if (body.error?.message) message = body.error.message;
        } catch {
          // non-JSON error body
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        `invoice-${invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      success(t("invoices.pdf.downloadSuccess"));
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("invoices.pdf.downloadError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      onClick={() => void handleDownload()}
      data-testid="download-invoice-pdf"
    >
      <Download className="mr-2 h-4 w-4" aria-hidden />
      {loading ? t("invoices.pdf.downloading") : t("invoices.pdf.download")}
    </Button>
  );
}
