"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";

interface TemplateRow {
  id: string;
  internal_name: string;
  meta_template_name: string;
  language: string;
  meta_status: string;
  event_type: string | null;
  variable_count: number;
  body_preview: string | null;
  is_active: boolean;
}

export default function WhatsAppTemplatesAdminPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    internal_name: "",
    meta_template_name: "",
    language: "en",
    event_type: "",
    variable_count: "0",
    body_preview: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/crm/whatsapp/templates");
    const body = await res.json();
    if (res.ok) setTemplates(body.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTemplate() {
    const res = await fetch("/api/crm/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        variable_count: Number(form.variable_count),
        meta_status: "pending",
      }),
    });
    if (res.ok) {
      setForm({
        internal_name: "",
        meta_template_name: "",
        language: "en",
        event_type: "",
        variable_count: "0",
        body_preview: "",
      });
      void load();
    }
  }

  async function setApproval(id: string, meta_status: string) {
    await fetch(`/api/crm/whatsapp/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta_status }),
    });
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("whatsapp.admin.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("whatsapp.admin.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("whatsapp.admin.addTemplate")}</CardTitle>
        </CardHeader>
        <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
          <Input
            placeholder={t("whatsapp.admin.internalName")}
            value={form.internal_name}
            onChange={(e) => setForm({ ...form, internal_name: e.target.value })}
          />
          <Input
            placeholder={t("whatsapp.admin.metaName")}
            value={form.meta_template_name}
            onChange={(e) => setForm({ ...form, meta_template_name: e.target.value })}
          />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
          <Input
            placeholder={t("whatsapp.admin.eventType")}
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
          />
          <Input
            type="number"
            min={0}
            max={10}
            placeholder={t("whatsapp.admin.variableCount")}
            value={form.variable_count}
            onChange={(e) => setForm({ ...form, variable_count: e.target.value })}
          />
          <Input
            placeholder={t("whatsapp.admin.bodyPreview")}
            value={form.body_preview}
            onChange={(e) => setForm({ ...form, body_preview: e.target.value })}
          />
          <Button type="button" className="sm:col-span-2" onClick={() => void createTemplate()}>
            {t("whatsapp.admin.create")}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("whatsapp.admin.listTitle")}</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          {loading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          {!loading && templates.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("whatsapp.admin.empty")}</p>
          )}
          <ul className="space-y-3">
            {templates.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {row.internal_name} · {row.language}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.meta_template_name}
                    {row.event_type ? ` · ${row.event_type}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge namespace="whatsapp.metaStatus" value={row.meta_status} />
                  {row.meta_status !== "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void setApproval(row.id, "approved")}
                    >
                      {t("whatsapp.admin.markApproved")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
