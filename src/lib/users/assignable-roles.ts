import { UserRole } from "@/types";

/** Roles a tenant admin may assign within their tenant (excludes super_admin). */
export const ASSIGNABLE_TENANT_ROLES: UserRole[] = [
  "tenant_admin",
  "sales_agent",
  "finance_officer",
];

export function isAssignableTenantRole(role: string): role is UserRole {
  return ASSIGNABLE_TENANT_ROLES.includes(role as UserRole);
}
