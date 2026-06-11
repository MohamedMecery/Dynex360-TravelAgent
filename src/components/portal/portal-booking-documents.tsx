"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { BookingDocumentRow } from "@/lib/portal/portal-booking-documents-service";

interface PortalBookingDocumentsProps {
  bookingId: string;
}

export function PortalBookingDocuments({ bookingId }: PortalBookingDocumentsProps) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<BookingDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/bookings/${bookingId}/documents`)
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((json) => setDocuments(json.data ?? []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [bookingId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("portal.documents.title")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("portal.documents.empty")}</p>
        ) : (
          <ul className="divide-y">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{doc.file_name}</p>
                  {doc.file_type && (
                    <p className="text-xs text-muted-foreground">{doc.file_type}</p>
                  )}
                </div>
                <a
                  href={`/api/portal/bookings/${bookingId}/documents/${doc.id}`}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("portal.documents.download")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
