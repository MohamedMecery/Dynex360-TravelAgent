"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordFields } from "@/components/auth/password-fields";
import { setPasswordSchema } from "@/lib/validation/auth-password";
import { supabaseClient } from "@/lib/supabase/client";
import { useTranslation } from "@/i18n/locale-provider";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>(
    {}
  );
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
    setFieldErrors({});

    const parsed = setPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        password: flat.password?.[0],
        confirmPassword: flat.confirmPassword?.[0],
      });
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: parsed.data.password,
      });

      if (updateError) {
        setError(t("auth.resetFailed"));
        return;
      }

      await supabaseClient.auth.signOut();
      router.replace("/login?reason=password_reset");
    } catch {
      setError(t("auth.resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (sessionReady === null) {
    return (
      <AuthShell>
        <Card className="border-0 shadow-lg sm:border p-6">
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </Card>
      </AuthShell>
    );
  }

  if (!sessionReady) {
    return (
      <AuthShell>
        <Card className="border-0 shadow-lg sm:border">
          <CardHeader>
            <CardTitle>{t("auth.resetTitle")}</CardTitle>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-red-600" role="alert">
              {t("auth.resetLinkInvalid")}
            </p>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              {t("auth.forgotTitle")}
            </Link>
          </div>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="border-0 shadow-lg sm:border">
        <CardHeader>
          <CardTitle>{t("auth.resetTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("auth.resetSubtitle")}</p>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <PasswordFields
            passwordLabel={t("auth.newPassword")}
            confirmLabel={t("auth.confirmPassword")}
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirmPassword}
            passwordError={fieldErrors.password}
            confirmError={fieldErrors.confirmPassword}
            minLengthHint={t("auth.passwordMinLength")}
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.resetSaving") : t("auth.resetSubmit")}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
