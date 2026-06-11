import { AccessControlProvider } from "@refinedev/core";
import { UserRole } from "@/types";
import { hasAiPermission, hasDashboardPermission } from "@/lib/auth/rbac";
import {
  canReadCrmActivities,
  canReadCrmLeads,
  canReadCrmOpportunities,
  canReadCrmQuotations,
  canReadOperationsDashboard,
  canWriteCrmActivities,
  canWriteCrmLeads,
  canWriteCrmOpportunities,
  canWriteCrmQuotations,
  hasCrmPermission,
} from "@/lib/auth/crm-rbac";

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: [
    "customers.*", "travelers.*", "destinations.*", "packages.*",
    "bookings.*", "invoices.*", "payments.*",
    "users.*", "dashboard.*", "settings.*", "audit_logs.read",
    "ai.*", "knowledge.*", "ai-analytics.*", "ai-sales.*", "crm-sales-insights.*",
    "ai-operations.*", "crm-operations-insights.*",
  ],
  sales_agent: [
    "customers.create", "customers.read", "customers.update",
    "travelers.create", "travelers.read", "travelers.update",
    "destinations.read", "packages.create", "packages.read", "packages.update", "packages.publish",
    "bookings.*", "invoices.read", "payments.read", "dashboard.read",
    "ai.knowledge.use", "ai.booking.use", "ai.support.use", "ai.sales.use", "ai.sales.read", "ai.read",
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

    if (resource === "ai-conversations") {
      return { can: hasAiPermission(role, "ai.read") };
    }

    if (resource === "ai-analytics") {
      return { can: hasAiPermission(role, "ai.analytics.read") };
    }

    if (resource === "ai-sales") {
      if (action === "insights") {
        return { can: hasAiPermission(role, "ai.sales.insights.read") };
      }
      if (action === "use") {
        return { can: hasAiPermission(role, "ai.sales.use") };
      }
      return { can: hasAiPermission(role, "ai.sales.read") };
    }

    if (resource === "crm-sales-insights") {
      return { can: hasAiPermission(role, "ai.sales.insights.read") };
    }

    if (resource === "ai-operations") {
      if (action === "insights") {
        return { can: hasAiPermission(role, "ai.operations.insights.read") };
      }
      if (action === "use") {
        return { can: hasAiPermission(role, "ai.operations.use") };
      }
      return { can: hasAiPermission(role, "ai.operations.read") };
    }

    if (resource === "crm-operations-insights") {
      return { can: hasAiPermission(role, "ai.operations.insights.read") };
    }

    if (resource === "audit_logs") {
      return { can: hasPermission(role, "audit_logs", "read") };
    }

    if (resource === "leads") {
      if (action === "list" || action === "show") {
        return { can: canReadCrmLeads(role) };
      }
      if (action === "create" || action === "edit" || action === "delete") {
        return { can: canWriteCrmLeads(role) };
      }
      return { can: false };
    }

    if (resource === "crm-dashboard") {
      if (action === "financial") {
        return { can: hasDashboardPermission(role, "dashboard.financial") };
      }
      return { can: hasCrmPermission(role, "crm.dashboard.read") };
    }

    if (resource === "crm-operations") {
      return { can: canReadOperationsDashboard(role) };
    }

    if (resource === "opportunities") {
      if (action === "list" || action === "show") {
        return { can: canReadCrmOpportunities(role) };
      }
      if (action === "create" || action === "edit" || action === "delete") {
        return { can: canWriteCrmOpportunities(role) };
      }
      return { can: false };
    }

    if (resource === "quotations") {
      if (action === "list" || action === "show") {
        return { can: canReadCrmQuotations(role) };
      }
      if (action === "create" || action === "edit" || action === "delete") {
        return { can: canWriteCrmQuotations(role) };
      }
      if (action === "send") {
        return { can: hasCrmPermission(role, "crm.quotations.send") };
      }
      if (action === "approve") {
        return { can: hasCrmPermission(role, "crm.quotations.approve") };
      }
      if (action === "accept") {
        return { can: hasCrmPermission(role, "crm.quotations.accept") };
      }
      if (action === "convert") {
        return { can: hasCrmPermission(role, "crm.quotations.convert") };
      }
      return { can: false };
    }

    if (resource === "activities") {
      if (action === "list" || action === "show") {
        return { can: canReadCrmActivities(role) };
      }
      if (action === "create" || action === "edit" || action === "delete") {
        return { can: canWriteCrmActivities(role) };
      }
      return { can: false };
    }

    return { can: hasPermission(role, resource ?? "", action ?? "") };
  },
};
