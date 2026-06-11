"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PortalAuthShell } from "@/components/portal/portal-auth-shell";
import { resolveDbUserAccess } from "@/lib/auth/resolve-db-user-access";
import {
  isActivePortalStatus,
  resolvePortalUserAccess,
} from "@/lib/auth/resolve-portal-user-access";
import { supabaseClient } from "@/lib/supabase/client";
import { useTranslation } from "@/i18n/locale-provider";

export default function PortalLoginPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("to") ?? "/portal";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabaseClient.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const portal = await resolvePortalUserAccess(supabaseClient, user.id);
      if (portal && isActivePortalStatus(portal.status)) {
        window.location.assign(redirectTo);
      }
    });
  }, [redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(t("auth.invalidCredentials"));
        return;
      }
      if (!data.user) {
        setError(t("auth.invalidCredentials"));
        return;
      }

      const staff = await resolveDbUserAccess(supabaseClient, data.user.id);
      if (staff) {
        await supabaseClient.auth.signOut();
        setError(t("portal.errors.staffAccount"));
        return;
      }

      const portal = await resolvePortalUserAccess(supabaseClient, data.user.id);
      if (!portal || !isActivePortalStatus(portal.status)) {
        await supabaseClient.auth.signOut();
        setError(t("portal.errors.noPortalAccess"));
        return;
      }

      window.location.assign(redirectTo);
    } catch {
      setError(t("auth.supabaseUnreachable"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalAuthShell>
      <Card className="border-0 shadow-lg sm:border">
        <CardHeader>
          <CardTitle>{t("portal.login.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("portal.login.subtitle")}</p>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Link href="/portal/forgot-password" className="text-xs text-primary hover:underline">
                {t("auth.forgotPasswordLink")}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
      </Card>
    </PortalAuthShell>
  );
}
