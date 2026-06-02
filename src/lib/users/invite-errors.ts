import { UserManagementError } from "@/lib/users/guards";

/** Generic message to avoid cross-tenant email enumeration. */
export const INVITE_UNAVAILABLE_MESSAGE =
  "This email cannot be invited. The address may already be in use.";

export function inviteUnavailableError(code: string): UserManagementError {
  return new UserManagementError(INVITE_UNAVAILABLE_MESSAGE, code);
}
