import { UserRole, UserStatus } from "@/types";

type MetadataRecord = Record<string, unknown>;

/**
 * Read tenant_id, role, and account_status from JWT app_metadata (custom_access_token_hook).
 * Never use user_metadata for authorization — it is user-editable.
 */
export function getJwtClaims(user: {
  app_metadata?: MetadataRecord;
} | null | undefined): {
  tenantId: string | null;
  role: UserRole | null;
  accountStatus: UserStatus | null;
} {
  if (!user) return { tenantId: null, role: null, accountStatus: null };

  const tenantId = (user.app_metadata?.tenant_id as string | undefined) ?? null;
  const role = (user.app_metadata?.role as UserRole | undefined) ?? null;
  const accountStatus =
    (user.app_metadata?.account_status as UserStatus | undefined) ?? null;

  return { tenantId, role, accountStatus };
}
