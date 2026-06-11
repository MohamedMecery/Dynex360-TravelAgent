import { UserRole } from "@/types";

const ROLE_AI_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: [
    "ai.knowledge.use",
    "ai.booking.use",
    "ai.support.use",
    "ai.sales.use",
    "ai.sales.read",
    "ai.sales.insights.read",
    "ai.sales.manage",
    "ai.operations.use",
    "ai.operations.read",
    "ai.operations.insights.read",
    "ai.operations.manage",
    "ai.read",
    "ai.logs.read",
    "ai.analytics.read",
    "knowledge.manage",
  ],
  sales_agent: [
    "ai.knowledge.use",
    "ai.booking.use",
    "ai.support.use",
    "ai.sales.use",
    "ai.sales.read",
    "ai.operations.use",
    "ai.operations.read",
    "ai.read",
  ],
  finance_officer: [
    "ai.knowledge.use",
    "ai.support.use",
    "ai.read",
  ],
};

export function hasAiPermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_AI_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

const ROLE_DASHBOARD_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: ["dashboard.read", "dashboard.financial"],
  sales_agent: ["dashboard.read"],
  finance_officer: ["dashboard.read", "dashboard.financial"],
};

export function hasDashboardPermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_DASHBOARD_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}
