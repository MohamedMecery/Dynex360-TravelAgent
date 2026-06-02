"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLogin } from "@refinedev/core";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { loginReasonMessageKey, parseLoginReasonParam } from "@/lib/auth/account-status";
import { useTranslation } from "@/i18n/locale-provider";

interface SupabaseHealth {
  ok: boolean;
  configured?: boolean;
  isLocal?: boolean;
  message?: string;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("to") ?? "/dashboard";
  const loginReason = parseLoginReasonParam(searchParams.get("reason"));
  const { mutate: login, isLoading } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealth | null>(null);

  useEffect(() => {
    if (loginReason) {
      const key = loginReasonMessageKey(loginReason);
      const message = t(key);
      if (
        loginReason === "onboarding_complete" ||
        loginReason === "password_reset"
      ) {
        setInfo(message);
        setError("");
      } else {
        setError(message);
        setInfo("");
      }
    }
  }, [loginReason, t]);

  useEffect(() => {
    fetch("/api/health/supabase")
      .then((r) => r.json())
      .then((data: SupabaseHealth) => setSupabaseHealth(data))
      .catch(() => setSupabaseHealth({ ok: false, message: t("auth.supabaseUnreachable") }));
  }, [t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (supabaseHealth && !supabaseHealth.ok) {
      setError(supabaseHealth.message ?? t("auth.supabaseUnreachable"));
      return;
    }
    login(
      { email, password, redirectTo },
      {
        onSuccess: () => {
          window.location.assign(redirectTo);
        },
        onError: (err) => {
          const raw =
            err && typeof err === "object" && "message" in err && typeof err.message === "string"
              ? err.message
              : t("auth.invalidCredentials");
          if (raw.startsWith("auth.")) {
            setError(t(raw));
            return;
          }
          setError(
            raw.includes("fetch") || raw.includes("reach")
              ? t("auth.supabaseUnreachable")
              : raw
          );
        },
      }
    );
  };

  return (
    <AuthShell>
      {supabaseHealth && !supabaseHealth.ok && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          <p className="font-medium">{t("auth.supabaseDownTitle")}</p>
          <p className="mt-1">{supabaseHealth.message}</p>
          {supabaseHealth.isLocal && (
            <p className="mt-2 text-xs">
              {t("auth.supabaseLocalHint")} <code className="rounded bg-amber-100 px-1">npx supabase start</code>
              {t("auth.supabaseOrCloud")}
            </p>
          )}
        </div>
      )}
      <Card className="border-0 shadow-lg sm:border">
        <CardHeader>
          <CardTitle>{t("auth.signInTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>
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
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
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
          {info && (
            <p className="text-sm text-green-800" role="status">
              {info}
            </p>
          )}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/home" className="text-primary hover:underline">
              {t("landing.backHome")}
            </Link>
          </p>
        </form>
      </Card>
    </AuthShell>
  );
}
