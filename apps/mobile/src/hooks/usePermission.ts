import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

function matchesPermission(granted: string[], required: string): boolean {
  if (granted.includes(required)) return true;
  const [module] = required.split(".");
  if (module && granted.includes(`${module}.*`)) return true;
  if (granted.includes("crm.*") && required.startsWith("crm.")) return true;
  if (granted.includes("bookings.*") && required.startsWith("bookings.")) return true;
  if (granted.includes("customers.*") && required.startsWith("customers.")) return true;
  return false;
}

export function usePermission(permission: string): boolean {
  const { profile } = useAuth();
  return useMemo(() => {
    const list = profile?.permissions ?? [];
    return matchesPermission(list, permission);
  }, [profile?.permissions, permission]);
}

export function usePermissions(): string[] {
  const { profile } = useAuth();
  return profile?.permissions ?? [];
}
