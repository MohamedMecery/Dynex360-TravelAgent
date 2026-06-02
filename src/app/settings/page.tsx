"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("settings.title")}</h2>
      <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
        <Card className="opacity-90">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{t("settings.tenantSettings")}</CardTitle>
              <Badge variant="secondary">{t("settings.comingSoon")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t("settings.description")}</p>
          </CardHeader>
        </Card>
        <Link href="/settings/knowledge" className="block">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>{t("knowledgeSettings.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("knowledgeSettings.cardDescription")}</p>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
