import { UserRole } from "@/types";
import type { BookingStatus } from "@/types";

const ROLE_BOOKINGS_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ["*"],
  tenant_admin: ["bookings.*"],
  sales_agent: ["bookings.*"],
  finance_officer: ["bookings.read", "bookings.export"],
};

function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_BOOKINGS_PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const [module] = permission.split(".");
  if (module && perms.includes(`${module}.*`)) return true;
  return false;
}

const STATUS_PERMISSION: Record<BookingStatus, string> = {
  draft: "bookings.update",
  confirmed: "bookings.confirm",
  completed: "bookings.complete",
  cancelled: "bookings.cancel",
};

export function hasBookingsRead(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return hasPermission(role, "bookings.read") || hasPermission(role, "bookings.*");
}

export function hasBookingStatusPermission(
  role: UserRole | null,
  targetStatus: BookingStatus
): boolean {
  if (!role) return false;
  const permission = STATUS_PERMISSION[targetStatus];
  return hasPermission(role, permission);
}
