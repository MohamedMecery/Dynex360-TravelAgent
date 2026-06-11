"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import { isWhatsAppOptedIn } from "@/lib/whatsapp/preferences-service";
import type { CustomerCommunicationPreferences } from "@/lib/whatsapp/preferences-service";

export default function PortalPreferencesPage() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Partial<CustomerCommunicationPreferences> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/portal/preferences");
    const body = await res.json();
    if (res.ok) setPrefs(body.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/portal/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(body.error?.message ?? t("portal.preferences.saveError"));
      return;
    }
    setPrefs(body.data);
    setMessage(t("portal.preferences.saved"));
  }

  if (loading) return <p className="text-muted-foreground">{t("common.loading")}</p>;

  const optedIn = isWhatsAppOptedIn(
    prefs as CustomerCommunicationPreferences | null
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">{t("portal.preferences.title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("portal.preferences.whatsappTitle")}</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <p className="text-sm text-muted-foreground">
            {t("portal.preferences.whatsappDescription")}
          </p>
          <p className="text-sm">
            {optedIn
              ? t("portal.preferences.optedIn")
              : t("portal.preferences.optedOut")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || optedIn}
              onClick={() => void save({ whatsapp_opt_in: true })}
            >
              {t("portal.preferences.optIn")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !optedIn}
              onClick={() => void save({ whatsapp_opt_in: false })}
            >
              {t("portal.preferences.optOut")}
            </Button>
          </div>
          <label className="text-sm">
            <span className="text-muted-foreground">
              {t("portal.preferences.language")}
            </span>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={prefs?.preferred_language ?? "en"}
              onChange={(e) =>
                void save({ preferred_language: e.target.value === "ar" ? "ar" : "en" })
              }
            >
              <option value="en">{t("portal.preferences.langEn")}</option>
              <option value="ar">{t("portal.preferences.langAr")}</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-muted-foreground">
                {t("portal.preferences.quietStart")}
              </span>
              <Input
                type="time"
                className="mt-1"
                defaultValue={prefs?.quiet_hours_start?.slice(0, 5) ?? ""}
                onBlur={(e) =>
                  void save({
                    quiet_hours_start: e.target.value
                      ? `${e.target.value}:00`
                      : null,
                  })
                }
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">
                {t("portal.preferences.quietEnd")}
              </span>
              <Input
                type="time"
                className="mt-1"
                defaultValue={prefs?.quiet_hours_end?.slice(0, 5) ?? ""}
                onBlur={(e) =>
                  void save({
                    quiet_hours_end: e.target.value ? `${e.target.value}:00` : null,
                  })
                }
              />
            </label>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      </Card>
    </div>
  );
}
