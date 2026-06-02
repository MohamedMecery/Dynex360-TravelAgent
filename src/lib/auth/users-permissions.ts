import { UserRole } from "@/types";

const ROLE_USERS_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: ["users.*"],
  sales_agent: [],
  finance_officer: [],
};

export function hasUsersPermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_USERS_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const [module] = permission.split(".");
  if (module && perms.includes(`${module}.*`)) return true;
  return false;
}
