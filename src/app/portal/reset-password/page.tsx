"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PortalAuthShell } from "@/components/portal/portal-auth-shell";
import { setPasswordSchema } from "@/lib/validation/auth-password";
import { supabaseClient } from "@/lib/supabase/client";
import { useTranslation } from "@/i18n/locale-provider";

export default function PortalResetPasswordPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setSessionReady(Boolean(data.session));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = setPasswordSchema.safeParse({ password, confirmPassword: confirm });
    if (!parsed.success) {
      setError(t("auth.resetFailed"));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: parsed.data.password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("auth.supabaseUnreachable"));
    } finally {
      setLoading(false);
    }
  };

  if (sessionReady === null) {
    return (
      <PortalAuthShell>
        <Card className="border-0 shadow-lg sm:border p-6">
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </Card>
      </PortalAuthShell>
    );
  }

  if (!sessionReady) {
    return (
      <PortalAuthShell>
        <Card className="border-0 shadow-lg sm:border">
          <CardHeader>
            <CardTitle>{t("auth.resetTitle")}</CardTitle>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-red-600" role="alert">
              {t("auth.resetLinkInvalid")}
            </p>
            <Link href="/portal/forgot-password" className="text-sm text-primary hover:underline">
              {t("auth.forgotTitle")}
            </Link>
          </div>
        </Card>
      </PortalAuthShell>
    );
  }

  return (
    <PortalAuthShell>
      <Card className="border-0 shadow-lg sm:border">
        <CardHeader>
          <CardTitle>{t("auth.resetTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("auth.resetSubtitle")}</p>
        </CardHeader>
        {success ? (
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-green-800" role="status">
              {t("auth.resetSuccess")}
            </p>
            <Link href="/portal/login?reason=password_reset" className="text-sm text-primary hover:underline">
              {t("auth.backToSignIn")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
            <div>
              <Label htmlFor="password">{t("auth.newPassword")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.resetting") : t("auth.resetSubmit")}
            </Button>
          </form>
        )}
      </Card>
    </PortalAuthShell>
  );
}
