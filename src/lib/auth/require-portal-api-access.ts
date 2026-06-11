import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isActivePortalStatus,
  PortalUserAccess,
  resolvePortalUserAccess,
} from "@/lib/auth/resolve-portal-user-access";
import { resolveDbUserAccess } from "@/lib/auth/resolve-db-user-access";
import { createApiClient, type ApiAuthMode } from "@/lib/supabase/api-client";

export interface PortalApiContext extends PortalUserAccess {
  supabase: SupabaseClient;
  authMode: ApiAuthMode;
  userId: string;
}

/**
 * Authenticated customer portal session only — rejects staff CRM sessions.
 */
export async function requirePortalApiAccess(): Promise<
  PortalApiContext | NextResponse
> {
  const { supabase, authMode } = await createApiClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const staffAccess = await resolveDbUserAccess(supabase, user.id);
  if (staffAccess) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "CRM accounts cannot access the customer portal API" } },
      { status: 403 }
    );
  }

  const portalAccess = await resolvePortalUserAccess(supabase, user.id);
  if (!portalAccess || !isActivePortalStatus(portalAccess.status)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Customer portal access required" } },
      { status: 403 }
    );
  }

  return { ...portalAccess, supabase, authMode, userId: user.id };
}
