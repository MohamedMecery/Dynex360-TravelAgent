"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { getAuthCallbackUrl } from "@/lib/auth/site-url";
import { forgotPasswordSchema } from "@/lib/validation/auth-password";
import { supabaseClient } from "@/lib/supabase/client";
import { useTranslation } from "@/i18n/locale-provider";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(t("auth.forgotEmailInvalid"));
      return;
    }

    setLoading(true);
    try {
      await supabaseClient.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: getAuthCallbackUrl("/reset-password"),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card className="border-0 shadow-lg sm:border">
        <CardHeader>
          <CardTitle>{t("auth.forgotTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("auth.forgotSubtitle")}</p>
        </CardHeader>
        {submitted ? (
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-green-800" role="status">
              {t("auth.forgotSuccess")}
            </p>
            <Link href="/login" className="text-sm text-primary hover:underline">
              {t("auth.backToSignIn")}
            </Link>
          </div>
        ) : (
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
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.forgotSending") : t("auth.forgotSubmit")}
            </Button>
            <p className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                {t("auth.backToSignIn")}
              </Link>
            </p>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
