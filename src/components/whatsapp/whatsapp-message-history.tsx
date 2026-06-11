"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";

export interface WhatsAppMessageRow {
  id: string;
  template_name: string;
  language: string;
  status: string;
  to_phone_e164: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
}

interface WhatsAppMessageHistoryProps {
  customerId?: string;
  quotationId?: string;
  bookingId?: string;
  title?: string;
}

export function WhatsAppMessageHistory({
  customerId,
  quotationId,
  bookingId,
  title,
}: WhatsAppMessageHistoryProps) {
  const { t } = useTranslation();
  const { formatDateTime } = useFormat();
  const [messages, setMessages] = useState<WhatsAppMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (customerId) params.set("customer_id", customerId);
    if (quotationId) params.set("quotation_id", quotationId);
    if (bookingId) params.set("booking_id", bookingId);
    try {
      const res = await fetch(`/api/crm/whatsapp/messages?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? t("whatsapp.history.loadError"));
      setMessages(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("whatsapp.history.loadError"));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, quotationId, bookingId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? t("whatsapp.history.title")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {loading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("whatsapp.history.empty")}</p>
        )}
        {!loading && messages.length > 0 && (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{m.template_name}</span>
                  <StatusBadge namespace="whatsapp.status" value={m.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.language.toUpperCase()} · {m.to_phone_e164} ·{" "}
                  {formatDateTime(m.created_at)}
                </p>
                {m.error_message && (
                  <p className="mt-1 text-xs text-destructive">{m.error_message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
