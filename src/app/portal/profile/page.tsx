"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { Customer } from "@/types";

interface PortalProfileResponse {
  customer: Customer & { display_name: string };
  portal_email: string;
}

export default function PortalProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PortalProfileResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/me")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((json) => setProfile(json.data))
      .catch(() => setError(t("portal.errors.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (error || !profile) return <p className="text-red-600">{error}</p>;

  const { customer, portal_email } = profile;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("portal.profile.title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{customer.display_name}</CardTitle>
        </CardHeader>
        <dl className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">{t("portal.profile.accountType")}</dt>
            <dd className="font-medium">{t(`customerType.${customer.type}`)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("auth.email")}</dt>
            <dd className="font-medium">{portal_email}</dd>
          </div>
          {customer.email && customer.email !== portal_email && (
            <div>
              <dt className="text-xs text-muted-foreground">{t("portal.profile.customerEmail")}</dt>
              <dd className="font-medium">{customer.email}</dd>
            </div>
          )}
          {customer.phone && (
            <div>
              <dt className="text-xs text-muted-foreground">{t("portal.profile.phone")}</dt>
              <dd className="font-medium">{customer.phone}</dd>
            </div>
          )}
        </dl>
      </Card>
      <p className="text-sm text-muted-foreground">{t("portal.profile.readOnlyNotice")}</p>
    </div>
  );
}
