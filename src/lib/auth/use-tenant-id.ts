"use client";

import { useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { supabaseClient } from "@/lib/supabase/client";

export function useTenantId(): string | undefined {
  const { data: identity } = useGetIdentity<{ id?: string; tenant_id?: string }>();
  const [resolvedTenantId, setResolvedTenantId] = useState<string | undefined>(
    identity?.tenant_id
  );

  useEffect(() => {
    if (identity?.tenant_id) {
      setResolvedTenantId(identity.tenant_id);
      return;
    }

    const userId = identity?.id;
    if (!userId) {
      setResolvedTenantId(undefined);
      return;
    }

    let cancelled = false;
    void supabaseClient
      .from("users")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setResolvedTenantId(data?.tenant_id ?? undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [identity?.tenant_id, identity?.id]);

  return resolvedTenantId;
}
