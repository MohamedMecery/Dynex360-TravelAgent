"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCan, useGetIdentity } from "@refinedev/core";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserManagementActions } from "@/components/users/user-management-actions";
import { useTranslation } from "@/i18n/locale-provider";
import type { TenantUserListItem } from "@/lib/users/types";
import { UserRole } from "@/types";

export default function UserShowPage() {
  const { t } = useTranslation();
  const params = useParams();
  const userId = params.id as string;
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canRead } = useCan({
    resource: "users",
    action: "read",
    params: { role: identity?.role },
  });
  const { data: canUpdate } = useCan({
    resource: "users",
    action: "update",
    params: { role: identity?.role },
  });

  const [user, setUser] = useState<TenantUserListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        const json = (await response.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? t("users.loadError"));
      }
      const json = (await response.json()) as { data: TenantUserListItem };
      setUser(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("users.loadError"));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    if (canRead?.can) void loadUser();
    else setLoading(false);
  }, [canRead?.can, loadUser]);

  if (canRead?.can === false) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-bold">{t("users.detailsTitle")}</h2>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{t("users.forbidden")}</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error || !user) {
    return (
      <div>
        <Link href="/users" className="text-sm text-primary hover:underline">
          {t("users.backToList")}
        </Link>
        <p className="mt-4 text-red-700" role="alert">
          {error ?? t("users.notFound")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/users" className="text-sm text-primary hover:underline">
          {t("users.backToList")}
        </Link>
        <h2 className="mt-2 text-2xl font-bold">{t("users.detailsTitle")}</h2>
      </div>

      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle>{user.full_name ?? user.email}</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-1 gap-3 px-6 pb-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("users.email")}</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("users.name")}</dt>
            <dd className="font-medium">{user.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("users.role")}</dt>
            <dd className="font-medium">{user.role ? t(`roles.${user.role}`) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("users.status")}</dt>
            <dd>
              <StatusBadge namespace="userStatus" value={user.status} />
            </dd>
          </div>
        </dl>
      </Card>

      {canUpdate?.can && (
        <Card className="max-w-2xl p-6">
          <h3 className="mb-4 text-lg font-semibold">{t("users.manageTitle")}</h3>
          <UserManagementActions user={user} onUpdated={() => void loadUser()} />
        </Card>
      )}
    </div>
  );
}
