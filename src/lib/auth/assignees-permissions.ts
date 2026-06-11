import {
  canReadCrmLeads,
  canReadCrmOpportunities,
  canReadCrmQuotations,
  canWriteCrmLeads,
  canWriteCrmOpportunities,
  canWriteCrmQuotations,
  hasCrmPermission,
} from "@/lib/auth/crm-rbac";
import { hasUsersPermission } from "@/lib/auth/users-permissions";
import type { UserRole } from "@/types";

/** Tenant user directory for assignment pickers (no full users.read required). */
export function canReadAssignees(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  if (hasUsersPermission(role, "users.read")) {
    return true;
  }
  return (
    canReadCrmLeads(role) ||
    canWriteCrmLeads(role) ||
    canReadCrmOpportunities(role) ||
    canWriteCrmOpportunities(role) ||
    canReadCrmQuotations(role) ||
    canWriteCrmQuotations(role) ||
    hasCrmPermission(role, "crm.*")
  );
}
