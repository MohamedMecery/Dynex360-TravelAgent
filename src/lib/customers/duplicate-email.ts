export function isDuplicateEmailError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const message =
    "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";

  if (message.includes("uq_customers_tenant_email") || message.includes("duplicate")) {
    return true;
  }

  if ("code" in error && error.code === "23505") return true;

  const nested = "errors" in error && error.errors && typeof error.errors === "object"
    ? (error.errors as { code?: string; message?: string })
    : null;

  if (nested?.code === "23505") return true;
  if (nested?.message?.toLowerCase().includes("duplicate")) return true;

  return false;
}
