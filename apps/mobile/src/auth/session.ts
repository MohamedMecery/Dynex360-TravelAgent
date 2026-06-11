import { apiFetch } from "@/lib/api-client";
import { getSupabaseClient } from "@/lib/supabase";
import type { AuthProfile } from "@/types/auth";

export async function fetchAuthProfile(
  includePermissions = true
): Promise<AuthProfile> {
  const qs = includePermissions ? "?include_permissions=true" : "";
  const body = await apiFetch<{ data: AuthProfile }>(`/api/auth/me${qs}`);
  return body.data;
}

export async function bootstrapSession(): Promise<{
  session: boolean;
  profile: AuthProfile | null;
}> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { session: false, profile: null };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    await supabase.auth.signOut();
    return { session: false, profile: null };
  }

  try {
    const profile = await fetchAuthProfile(true);
    if (profile.account_status !== "active") {
      await supabase.auth.signOut();
      return { session: false, profile: null };
    }
    return { session: true, profile };
  } catch {
    await supabase.auth.signOut();
    return { session: false, profile: null };
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthProfile> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return fetchAuthProfile(true);
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}
