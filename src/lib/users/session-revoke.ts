import { createAdminClient } from "@/lib/supabase/admin";

/** Invalidate refresh tokens / sessions so role and status changes take effect immediately. */
export async function revokeUserSessions(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("revoke_auth_sessions_for_user", {
    p_user_id: userId,
  });

  if (error) {
    console.error(`Failed to revoke sessions for user ${userId}:`, error.message);
    throw new Error("SESSION_REVOKE_FAILED");
  }
}
