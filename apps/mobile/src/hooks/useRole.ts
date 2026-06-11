import { useAuth } from "@/hooks/useAuth";
import type { AuthProfile } from "@/types/auth";

export function useRole(): AuthProfile["role"] | null {
  return useAuth().profile?.role ?? null;
}

export function useIsSalesAgent(): boolean {
  return useRole() === "sales_agent";
}

export function useIsTenantAdmin(): boolean {
  const role = useRole();
  return role === "tenant_admin" || role === "super_admin";
}
