"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { authProvider } from "@/providers/auth-provider";
import { refineDataProvider } from "@/providers/data-provider";
import { accessControlProvider } from "@/providers/access-control-provider";
import { resources } from "@/providers/resources";
import { Layout } from "@/components/layout";
import { SetupRequired } from "@/components/setup-required";
import { LocaleProvider } from "@/i18n/locale-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function RefineContext({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <LocaleProvider>
        <SetupRequired />
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider>
      <ToastProvider>
        <Refine
          routerProvider={routerProvider}
          dataProvider={refineDataProvider}
          authProvider={authProvider}
          accessControlProvider={accessControlProvider}
          resources={resources}
          options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
        >
          <Layout>{children}</Layout>
        </Refine>
      </ToastProvider>
    </LocaleProvider>
  );
}
