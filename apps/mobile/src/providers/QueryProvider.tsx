import {
  QueryClient,
  QueryClientProvider,
  type DefaultOptions,
} from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isSessionExpiredError } from "@/lib/errors";

function createDefaultOptions(onSessionExpired: () => void): DefaultOptions {
  return {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isSessionExpiredError(error)) {
          onSessionExpired();
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      onError: (error) => {
        if (isSessionExpiredError(error)) {
          onSessionExpired();
        }
      },
    },
  };
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: createDefaultOptions(() => {
          void signOut();
        }),
      }),
    [signOut]
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
