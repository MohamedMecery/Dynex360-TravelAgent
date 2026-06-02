import { UserStatus } from "@/types";

export type AccountStatusErrorCode =
  | "ACCOUNT_PENDING"
  | "ACCOUNT_INACTIVE"
  | "ACCOUNT_NOT_ACTIVE"
  | "ACCOUNT_STATUS_MISMATCH";

export function isActiveUserStatus(status: UserStatus | undefined | null): boolean {
  return status === "active";
}

/** Map login/API reason to i18n key under auth.* */
export function accountStatusMessageKey(
  status: UserStatus | undefined | null
): "auth.accountPending" | "auth.accountInactive" | "auth.accountNotActive" {
  if (status === "pending") return "auth.accountPending";
  if (status === "inactive") return "auth.accountInactive";
  return "auth.accountNotActive";
}

export function accountStatusErrorCode(
  status: UserStatus | undefined | null
): AccountStatusErrorCode {
  if (status === "pending") return "ACCOUNT_PENDING";
  if (status === "inactive") return "ACCOUNT_INACTIVE";
  return "ACCOUNT_NOT_ACTIVE";
}

/** Login redirect query param (middleware / check). */
export function accountStatusLoginReason(
  status: UserStatus | undefined | null
): "pending" | "inactive" | "not_active" {
  if (status === "pending") return "pending";
  if (status === "inactive") return "inactive";
  return "not_active";
}

export type LoginReasonParam =
  | "pending"
  | "inactive"
  | "not_active"
  | "expired"
  | "session"
  | "auth_callback_error"
  | "link_expired"
  | "onboarding_complete"
  | "password_reset";

export function parseLoginReasonParam(reason: string | null): LoginReasonParam | null {
  if (
    reason === "pending" ||
    reason === "inactive" ||
    reason === "not_active" ||
    reason === "expired" ||
    reason === "session"
  ) {
    return reason;
  }
  if (reason === "auth_callback_error" || reason === "link_expired") {
    return reason;
  }
  if (reason === "onboarding_complete" || reason === "password_reset") {
    return reason;
  }
  return null;
}

export function loginReasonMessageKey(
  reason: LoginReasonParam
):
  | "auth.accountPending"
  | "auth.accountInactive"
  | "auth.accountNotActive"
  | "auth.sessionExpired"
  | "auth.sessionEnded"
  | "auth.authCallbackError"
  | "auth.linkExpired"
  | "auth.onboardingComplete"
  | "auth.passwordResetSuccess" {
  switch (reason) {
    case "pending":
      return "auth.accountPending";
    case "inactive":
      return "auth.accountInactive";
    case "not_active":
      return "auth.accountNotActive";
    case "expired":
      return "auth.sessionExpired";
    case "session":
      return "auth.sessionEnded";
    case "link_expired":
      return "auth.linkExpired";
    case "onboarding_complete":
      return "auth.onboardingComplete";
    case "password_reset":
      return "auth.passwordResetSuccess";
    default:
      return "auth.authCallbackError";
  }
}
