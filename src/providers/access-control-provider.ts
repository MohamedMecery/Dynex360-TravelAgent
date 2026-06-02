import { AccessControlProvider } from "@refinedev/core";
import { UserRole } from "@/types";
import { hasAiPermission } from "@/lib/auth/rbac";

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: [
    "customers.*", "travelers.*", "destinations.*", "packages.*",
    "bookings.*", "invoices.*", "payments.*",
    "users.*", "dashboard.*", "settings.*", "audit_logs.read",
    "ai.*", "knowledge.*",
  ],
  sales_agent: [
    "customers.create", "customers.read", "customers.update",
    "travelers.create", "travelers.read", "travelers.update",
    "destinations.read", "packages.create", "packages.read", "packages.update", "packages.publish",
    "bookings.*", "invoices.read", "payments.read", "dashboard.read",
    "ai.knowledge.use", "ai.booking.use", "ai.support.use", "ai.read",
  ],
  finance_officer: [
    "customers.read", "travelers.read", "packages.read", "destinations.read",
    "bookings.read", "bookings.export",
    "invoices.*", "payments.*", "dashboard.read", "dashboard.financial",
    "ai.knowledge.use", "ai.support.use", "ai.read",
  ],
};

function hasPermission(role: UserRole, resource: string, action: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  const key = `${resource}.${action}`;
  if (perms.includes(key)) return true;
  if (perms.includes(`${resource}.*`)) return true;
  return false;
}

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    const role = params?.role as UserRole | undefined;
    if (!role) return { can: false };

    if (resource === "ai-knowledge") {
      return { can: hasAiPermission(role, "ai.knowledge.use") };
    }

    if (resource === "ai-support") {
      return { can: hasAiPermission(role, "ai.support.use") };
    }

    if (resource === "ai-booking") {
      return { can: hasAiPermission(role, "ai.booking.use") };
    }

    if (resource === "settings-knowledge") {
      return { can: hasAiPermission(role, "knowledge.manage") };
    }

    return { can: hasPermission(role, resource ?? "", action ?? "") };
  },
};
