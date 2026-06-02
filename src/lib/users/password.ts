import { randomBytes } from "node:crypto";

/** Generate a one-time temporary password for invited users. */
export function generateTemporaryPassword(): string {
  const base = randomBytes(12).toString("base64url");
  return `Tv${base}!1`;
}
