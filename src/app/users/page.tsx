"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GridActionButton } from "@/components/ui/grid-action-button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import type { TenantUserListItem } from "@/lib/users/types";
import { UserRole, UserStatus } from "@/types";

export default function UsersListPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canRead } = useCan({
    resource: "users",
    action: "read",
    params: { role: identity?.role },
  });
  const { data: canCreate } = useCan({
    resource: "users",
    action: "create",
    params: { role: identity?.role },
  });

  const [users, setUsers] = useState<TenantUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (roleFilter) params.set("role", roleFilter);

    try {
      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) {
        const json = (await response.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? t("users.loadError"));
      }
      const json = (await response.json()) as { data: TenantUserListItem[] };
      setUsers(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("users.loadError"));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, t]);

  useEffect(() => {
    if (canRead?.can) void loadUsers();
    else setLoading(false);
  }, [canRead?.can, loadUsers]);

  if (canRead?.can === false) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-bold">{t("users.title")}</h2>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{t("users.forbidden")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("users.title")}</h2>
        {canCreate?.can && (
          <Link href="/users/create">
            <Button>{t("users.invite")}</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder={t("users.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | "")}
          >
            <option value="">{t("users.allStatuses")}</option>
            <option value="active">{t("userStatus.active")}</option>
            <option value="inactive">{t("userStatus.inactive")}</option>
            <option value="pending">{t("userStatus.pending")}</option>
          </Select>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}>
            <option value="">{t("users.allRoles")}</option>
            <option value="tenant_admin">{t("roles.tenant_admin")}</option>
            <option value="sales_agent">{t("roles.sales_agent")}</option>
            <option value="finance_officer">{t("roles.finance_officer")}</option>
          </Select>
        </div>
        <Button type="button" className="mt-3" onClick={() => void loadUsers()} disabled={loading}>
          {t("users.applyFilters")}
        </Button>
      </Card>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950" role="alert">
          {error}
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3">{t("users.name")}</th>
              <th className="p-3">{t("users.email")}</th>
              <th className="p-3">{t("users.role")}</th>
              <th className="p-3">{t("users.status")}</th>
              <th className="p-3">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  {t("common.loading")}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  {t("users.empty")}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{user.full_name ?? "—"}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.role ? t(`roles.${user.role}`) : "—"}</td>
                  <td className="p-3">
                    <StatusBadge namespace="userStatus" value={user.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <GridActionButton href={`/users/show/${user.id}`} variant="outline" size="sm">
                        {t("common.view")}
                      </GridActionButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
