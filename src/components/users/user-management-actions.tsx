"use client";

import { useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useTranslation } from "@/i18n/locale-provider";
import { ASSIGNABLE_TENANT_ROLES } from "@/lib/users/assignable-roles";
import type { TenantUserListItem } from "@/lib/users/types";
import { UserRole } from "@/types";

interface UserManagementActionsProps {
  user: TenantUserListItem;
  onUpdated: () => void;
}

async function parseApiError(response: Response): Promise<string> {
  const json = (await response.json()) as { error?: { message?: string } };
  return json.error?.message ?? "Request failed";
}

export function UserManagementActions({ user, onUpdated }: UserManagementActionsProps) {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<{ id?: string }>();
  const [role, setRole] = useState<UserRole>(user.role ?? "sales_agent");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSelf = identity?.id === user.id;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("users.actionError"));
    } finally {
      setBusy(false);
    }
  };

  const saveRole = () =>
    run(async () => {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      setMessage(t("users.roleUpdated"));
    });

  const activate = () =>
    run(async () => {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      setMessage(t("users.activated"));
    });

  const deactivate = () => {
    if (!window.confirm(t("users.confirmDeactivate"))) return;
    void run(async () => {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await parseApiError(response));
      setMessage(t("users.deactivated"));
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label className="mb-1 block text-sm font-medium">{t("users.role")}</label>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)} disabled={busy}>
            {ASSIGNABLE_TENANT_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={() => void saveRole()} disabled={busy || role === user.role}>
          {t("users.saveRole")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {user.status !== "active" && (
          <Button type="button" variant="default" onClick={() => void activate()} disabled={busy}>
            {t("users.activate")}
          </Button>
        )}
        {user.status === "active" && !isSelf && (
          <Button type="button" onClick={deactivate} disabled={busy} className="border-red-300 text-red-700">
            {t("users.deactivate")}
          </Button>
        )}
      </div>

      {isSelf && <p className="text-sm text-muted-foreground">{t("users.selfServiceNote")}</p>}
      <p className="text-xs text-muted-foreground">{t("users.jwtRefreshNote")}</p>
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
