import { UserRole } from "@/types";

/** Mirrors migration 029_crm_permissions.sql grants */
const ROLE_CRM_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: ["crm.*"],
  sales_agent: [
    "crm.leads.read",
    "crm.leads.write",
    "crm.opportunities.read",
    "crm.opportunities.write",
    "crm.activities.read",
    "crm.activities.write",
    "crm.dashboard.read",
    "crm.quotations.read",
    "crm.quotations.write",
    "crm.quotations.send",
    "crm.quotations.accept",
    "crm.quotations.convert",
    "crm.whatsapp.messages.send",
    "crm.whatsapp.messages.read",
  ],
  finance_officer: [
    "crm.leads.read_all",
    "crm.opportunities.read_all",
    "crm.activities.read_all",
    "crm.dashboard.read",
    "crm.quotations.read_all",
  ],
};

export function hasCrmPermission(role: UserRole | null | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_CRM_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes("crm.*")) return true;
  if (perms.includes(permission)) return true;
  const [module] = permission.split(".");
  if (perms.includes(`${module}.*`)) return true;
  return false;
}

export function canReadCrmLeads(role: UserRole | null | undefined): boolean {
  return (
    hasCrmPermission(role, "crm.leads.read") ||
    hasCrmPermission(role, "crm.leads.read_all")
  );
}

export function canWriteCrmLeads(role: UserRole | null | undefined): boolean {
  return (
    hasCrmPermission(role, "crm.leads.write") ||
    hasCrmPermission(role, "crm.leads.write_all")
  );
}

export function canReadCrmOpportunities(role: UserRole | null | undefined): boolean {
  return (
    hasCrmPermission(role, "crm.opportunities.read") ||
    hasCrmPermission(role, "crm.opportunities.read_all")
  );
}

export function canWriteCrmOpportunities(role: UserRole | null | undefined): boolean {
  return (
    hasCrmPermission(role, "crm.opportunities.write") ||
    hasCrmPermission(role, "crm.opportunities.write_all")
  );
}

export function canReadCrmActivities(role: UserRole | null | undefined): boolean {
  return (
    hasCrmPermission(role, "crm.activities.read") ||
    hasCrmPermission(role, "crm.activities.read_all")
  );
}

export function canWriteCrmActivities(role: UserRole | null | undefined): boolean {
  return (
    hasCrmPermission(role, "crm.activities.write") ||
    hasCrmPermission(role, "crm.activities.write_all")
  );
}

export function canReadCrmDashboard(role: UserRole | null | undefined): boolean {
  return hasCrmPermission(role, "crm.dashboard.read");
}

export function canReadOperationsDashboard(role: UserRole | null | undefined): boolean {
  return role === "tenant_admin" || role === "super_admin";
}

export function canReadCrmQuotations(role: UserRole | null | undefined): boolean {
  return (
    hasCrmPermission(role, "crm.quotations.read") ||
    hasCrmPermission(role, "crm.quotations.read_all")
  );
}

export function canWriteCrmQuotations(role: UserRole | null | undefined): boolean {
  return (
    hasCrmPermission(role, "crm.quotations.write") ||
    hasCrmPermission(role, "crm.quotations.write_all")
  );
}

export const OPPORTUNITY_BOOKING_STAGES = [
  "verbal_approval",
  "closed_won",
] as const;

export function canCreateBookingFromOpportunityStage(
  stage: string,
  role: UserRole | null | undefined
): boolean {
  if (
    OPPORTUNITY_BOOKING_STAGES.includes(
      stage as (typeof OPPORTUNITY_BOOKING_STAGES)[number]
    )
  ) {
    return true;
  }
  return role === "tenant_admin" || role === "super_admin";
}
