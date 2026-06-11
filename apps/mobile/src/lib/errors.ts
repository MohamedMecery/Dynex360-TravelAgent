import { ApiError } from "@/lib/api-client";
import { translate } from "@/i18n/instance";

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return translate("errors.sessionExpired");
    }
    if (error.status === 403) {
      return error.message || translate("errors.forbidden");
    }
    if (error.status === 404) {
      return translate("errors.notFound");
    }
    if (error.status >= 500) {
      return translate("errors.server");
    }
    return error.message;
  }
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return translate("errors.network");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return translate("errors.unexpected");
}

export function isSessionExpiredError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
