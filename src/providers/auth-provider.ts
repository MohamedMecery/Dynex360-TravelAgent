import { AuthProvider } from "@refinedev/core";
import {
  accountStatusLoginReason,
  accountStatusMessageKey,
  isActiveUserStatus,
} from "@/lib/auth/account-status";
import { resolveDbUserAccess } from "@/lib/auth/resolve-db-user-access";
import { resolveActiveDbUserAccess } from "@/lib/auth/validate-active-account";
import { supabaseClient } from "@/lib/supabase/client";
import { UserRole } from "@/types";

const DEFAULT_LOGIN_ERROR = "Invalid email or password";

async function rejectNonActiveLogin(
  userId: string
): Promise<{ success: false; error: { message: string; name: string } }> {
  const access = await resolveDbUserAccess(supabaseClient, userId);
  await supabaseClient.auth.signOut();
  const key = accountStatusMessageKey(access?.status);
  return {
    success: false,
    error: {
      message: key,
      name: "AccountStatusError",
    },
  };
}

export const authProvider: AuthProvider = {
  login: async ({ email, password, redirectTo }) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: { message: error.message, name: "LoginError" } };
      }

      if (data?.user) {
        const access = await resolveDbUserAccess(supabaseClient, data.user.id);
        if (!access || !isActiveUserStatus(access.status)) {
          return rejectNonActiveLogin(data.user.id);
        }

        const target =
          typeof redirectTo === "string" && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
            ? redirectTo
            : "/dashboard";
        return { success: true, redirectTo: target };
      }

      return {
        success: false,
        error: { message: DEFAULT_LOGIN_ERROR, name: "LoginError" },
      };
    } catch (err) {
      const message =
        err instanceof TypeError && err.message === "Failed to fetch"
          ? "Cannot reach Supabase. Start local Supabase (Docker + npx supabase start) or set your cloud project URL in .env.local"
          : err instanceof Error
            ? err.message
            : "Login failed";
      return { success: false, error: { message, name: "LoginError" } };
    }
  },

  logout: async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      return { success: false, error: { message: error.message, name: "LogoutError" } };
    }
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (session && !user) {
      await supabaseClient.auth.signOut();
      return { authenticated: false, redirectTo: "/login?reason=expired" };
    }

    if (!user) {
      return { authenticated: false, redirectTo: "/login" };
    }

    const access = await resolveActiveDbUserAccess(supabaseClient, user.id);
    if (!access) {
      const profile = await resolveDbUserAccess(supabaseClient, user.id);
      await supabaseClient.auth.signOut();
      const reason = accountStatusLoginReason(profile?.status);
      return {
        authenticated: false,
        redirectTo: `/login?reason=${reason}`,
      };
    }

    return { authenticated: true };
  },

  getPermissions: async () => {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return null;
    const access = await resolveActiveDbUserAccess(supabaseClient, user.id);
    if (!access) return null;
    return access.role as UserRole;
  },

  getIdentity: async () => {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (user) {
      const access = await resolveDbUserAccess(supabaseClient, user.id);
      return {
        id: user.id,
        name: user.user_metadata?.full_name ?? user.email ?? "",
        email: user.email ?? "",
        tenant_id: access?.tenantId ?? null,
        role: access?.role ?? null,
        status: access?.status ?? null,
      };
    }
    return null;
  },

  onError: async (error) => {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return { logout: true };
    }
    return { error };
  },
};
