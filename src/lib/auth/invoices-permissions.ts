import { UserRole } from "@/types";

const ROLE_INVOICES_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: ["invoices.*"],
  sales_agent: ["invoices.read"],
  finance_officer: ["invoices.*"],
};

export function hasInvoicesPermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_INVOICES_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const [module] = permission.split(".");
  if (module && perms.includes(`${module}.*`)) return true;
  return false;
}
