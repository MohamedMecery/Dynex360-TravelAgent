"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";

interface WhatsAppTemplateOption {
  id: string;
  internal_name: string;
  meta_template_name: string;
  language: string;
  meta_status: string;
  variable_count: number;
  body_preview: string | null;
  is_active?: boolean;
}

interface WhatsAppSendPanelProps {
  customerId: string;
  quotationId?: string;
  bookingId?: string;
  onSent?: () => void;
}

export function WhatsAppSendPanel({
  customerId,
  quotationId,
  bookingId,
  onSent,
}: WhatsAppSendPanelProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<WhatsAppTemplateOption[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/crm/whatsapp/templates");
    const body = await res.json();
    if (!res.ok) return;
    const approved = (body.data ?? []).filter(
      (row: WhatsAppTemplateOption) => row.meta_status === "approved"
    );
    setTemplates(approved);
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const selected = useMemo(
    () => templates.find((tpl) => tpl.id === templateId),
    [templates, templateId]
  );

  useEffect(() => {
    if (!selected) {
      setVariables([]);
      return;
    }
    setVariables(Array.from({ length: selected.variable_count }, () => ""));
  }, [selected]);

  async function handleSend() {
    if (!templateId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/crm/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          template_id: templateId,
          body_variables: variables,
          quotation_id: quotationId ?? null,
          booking_id: bookingId ?? null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? t("whatsapp.send.failed"));
      setMessage(t("whatsapp.send.success"));
      onSent?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("whatsapp.send.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("whatsapp.send.title")}</CardTitle>
        </CardHeader>
        <p className="px-6 pb-6 text-sm text-muted-foreground">
          {t("whatsapp.send.noTemplates")}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("whatsapp.send.title")}</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-3 px-6 pb-6">
        <label className="text-sm">
          <span className="text-muted-foreground">{t("whatsapp.send.template")}</span>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">{t("whatsapp.send.selectTemplate")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.internal_name} ({tpl.language})
              </option>
            ))}
          </select>
        </label>
        {selected?.body_preview && (
          <p className="text-xs text-muted-foreground">{selected.body_preview}</p>
        )}
        {variables.map((value, index) => (
          <label key={index} className="text-sm">
            <span className="text-muted-foreground">
              {`${t("whatsapp.send.variable")} ${index + 1}`}
            </span>
            <Input
              className="mt-1"
              value={value}
              onChange={(e) => {
                const next = [...variables];
                next[index] = e.target.value;
                setVariables(next);
              }}
            />
          </label>
        ))}
        <Button type="button" disabled={busy || !templateId} onClick={() => void handleSend()}>
          {busy ? t("common.loading") : t("whatsapp.send.button")}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </Card>
  );
}
