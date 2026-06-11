import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import { hasAiPermission, hasDashboardPermission } from "@/lib/auth/rbac";
import { hasBookingsRead } from "@/lib/auth/bookings-permissions";
import { hasUsersPermission } from "@/lib/auth/users-permissions";
import {
  canReadCustomers,
  hasCustomersPermission,
} from "@/lib/auth/customers-permissions";
import { canReadAssignees } from "@/lib/auth/assignees-permissions";
import type { UserRole } from "@/types";

const CRM_PERMISSION_KEYS = [
  "crm.leads.read",
  "crm.leads.read_all",
  "crm.leads.write",
  "crm.leads.write_all",
  "crm.opportunities.read",
  "crm.opportunities.read_all",
  "crm.opportunities.write",
  "crm.opportunities.write_all",
  "crm.activities.read",
  "crm.activities.read_all",
  "crm.activities.write",
  "crm.activities.write_all",
  "crm.dashboard.read",
  "crm.quotations.read",
  "crm.quotations.read_all",
  "crm.quotations.write",
  "crm.quotations.write_all",
  "crm.quotations.send",
  "crm.quotations.accept",
  "crm.quotations.convert",
  "crm.quotations.approve",
] as const;

const CUSTOMERS_PERMISSION_KEYS = [
  "customers.read",
  "customers.create",
  "customers.update",
] as const;

const BOOKINGS_ROLE_HINTS: Record<UserRole, string[]> = {
  super_admin: ["bookings.*"],
  tenant_admin: ["bookings.*"],
  sales_agent: ["bookings.*"],
  finance_officer: ["bookings.read", "bookings.export"],
};

const DASHBOARD_PERMISSION_KEYS = ["dashboard.read", "dashboard.financial"] as const;

const AI_PERMISSION_KEYS = [
  "ai.knowledge.use",
  "ai.booking.use",
  "ai.support.use",
  "ai.read",
  "ai.logs.read",
  "ai.analytics.read",
  "knowledge.manage",
] as const;

const USERS_PERMISSION_KEYS = [
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
] as const;

/**
 * Effective permission strings for the current role (client hints; server enforces on each route).
 */
export function getEffectivePermissions(role: UserRole): string[] {
  const granted = new Set<string>();

  for (const key of CRM_PERMISSION_KEYS) {
    if (hasCrmPermission(role, key)) {
      granted.add(key);
    }
  }

  for (const key of DASHBOARD_PERMISSION_KEYS) {
    if (hasDashboardPermission(role, key)) {
      granted.add(key);
    }
  }

  for (const key of AI_PERMISSION_KEYS) {
    if (hasAiPermission(role, key)) {
      granted.add(key);
    }
  }

  for (const key of USERS_PERMISSION_KEYS) {
    if (hasUsersPermission(role, key)) {
      granted.add(key);
    }
  }

  if (canReadAssignees(role)) {
    granted.add("users.assignees.read");
  }

  for (const key of CUSTOMERS_PERMISSION_KEYS) {
    if (hasCustomersPermission(role, key)) {
      granted.add(key);
    }
  }
  if (hasCustomersPermission(role, "customers.*")) {
    granted.add("customers.*");
  }

  for (const key of BOOKINGS_ROLE_HINTS[role] ?? []) {
    granted.add(key);
  }
  if (hasBookingsRead(role)) {
    granted.add("bookings.read");
  }

  return [...granted].sort();
}
