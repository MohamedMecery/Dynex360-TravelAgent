import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { bootstrapSession, signInWithEmail, signOut } from "@/auth/session";
import type { AuthProfile } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  profile: AuthProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    const result = await bootstrapSession();
    if (result.session && result.profile) {
      setProfile(result.profile);
      setStatus("authenticated");
    } else {
      setProfile(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextProfile = await signInWithEmail(email, password);
    setProfile(nextProfile);
    setStatus("authenticated");
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setProfile(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({
      status,
      profile,
      signIn,
      signOut: handleSignOut,
      refresh,
    }),
    [status, profile, signIn, handleSignOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return ctx;
}
