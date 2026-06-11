import { UserRole } from "@/types";
import { hasDashboardPermission } from "@/lib/auth/rbac";

const ROLE_CUSTOMERS_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: ["customers.*"],
  sales_agent: ["customers.create", "customers.read", "customers.update"],
  finance_officer: ["customers.read"],
};

const ROLE_PAYMENTS_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: ["payments.*"],
  sales_agent: ["payments.read"],
  finance_officer: ["payments.*"],
};

function hasModulePermission(
  map: Record<UserRole, string[]>,
  role: UserRole | null,
  permission: string
): boolean {
  if (!role) return false;
  const perms = map[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const [module] = permission.split(".");
  if (module && perms.includes(`${module}.*`)) return true;
  return false;
}

export function hasCustomersPermission(role: UserRole | null, permission: string): boolean {
  return hasModulePermission(ROLE_CUSTOMERS_PERMISSIONS, role, permission);
}

export function canReadCustomers(role: UserRole | null): boolean {
  return hasCustomersPermission(role, "customers.read");
}

export function hasPaymentsPermission(role: UserRole | null, permission: string): boolean {
  return hasModulePermission(ROLE_PAYMENTS_PERMISSIONS, role, permission);
}

/**
 * Financial KPIs and Revenue tab (read-only).
 * Gate: sales_agent must not see LCV/outstanding/Revenue — requires dashboard.financial.
 */
export function canReadCustomer360Financial(role: UserRole | null): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  return hasDashboardPermission(role, "dashboard.financial");
}
