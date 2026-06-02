import { createAdminClient } from "@/lib/supabase/admin";

/** Set users.status to active for a pending invitee (service role; RLS blocks self-activation). */
export async function activatePendingTenantUser(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: profile, error: fetchError } = await admin
    .from("users")
    .select("status")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError || !profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  if (profile.status === "inactive") {
    throw new Error("CANNOT_ACTIVATE_INACTIVE");
  }

  if (profile.status === "active") {
    return;
  }

  const { error: updateError } = await admin
    .from("users")
    .update({ status: "active" })
    .eq("id", userId)
    .eq("status", "pending");

  if (updateError) {
    throw new Error("ACTIVATION_FAILED");
  }
}
