"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsAuthenticated } from "@refinedev/core";
import { LandingPage } from "@/components/landing/landing-page";
import { useTranslation } from "@/i18n/locale-provider";

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: authData, isLoading } = useIsAuthenticated();

  useEffect(() => {
    if (!isLoading && authData?.authenticated) {
      router.replace("/dashboard");
    }
  }, [authData?.authenticated, isLoading, router]);

  if (isLoading || authData?.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-landing-sand text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return <LandingPage />;
}
