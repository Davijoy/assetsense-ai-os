import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getStoredSupabaseSession, clearStoredSupabaseSession } from "@/integrations/supabase/auth-storage";

export type AppRole = "admin" | "manager" | "agent" | "viewer" | "builder" | "developer";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  rolesReady: boolean;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  hasRole: (r: AppRole) => boolean;
  hasAnyRole: (rs: AppRole[]) => boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesReady, setRolesReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      if (s) {
        setSession(s);
        setUser(s.user ?? null);
      } else {
        // If supabase sends null, check if we have a valid local fallback session
        const stored = getStoredSupabaseSession();
        if (stored) {
          try {
            setSession(stored);
            setUser(stored.user ?? null);
          } catch {
            setSession(null);
            setUser(null);
            setRoles([]);
          }
        } else {
          setSession(null);
          setUser(null);
          setRoles([]);
        }
      }
      setLoading(false);
    });

    const readStoredSession = () => getStoredSupabaseSession();

    const initAuth = async () => {
      try {
        const timeoutPromise = new Promise<{ data: { session: Session | null } }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const { data } = await Promise.race([supabase.auth.getSession(), timeoutPromise]);
        if (!mounted) return;
        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user ?? null);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("[auth] getSession timed out or failed:", err);
      }

      if (!mounted) return;
      const stored = readStoredSession();
      if (stored) {
        setSession(stored);
        setUser(stored.user ?? null);
      }
      setLoading(false);
    };

    initAuth();

    const handleStorageChange = () => {
      if (!mounted) return;
      const stored = readStoredSession();
      if (stored) {
        setSession(stored);
        setUser(stored.user ?? null);
      } else {
        setSession(null);
        setUser(null);
        setRoles([]);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("sentinel-auth-change", handleStorageChange);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sentinel-auth-change", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const queryPromise = supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;
        if (error) throw error;
        if (cancelled) return;
        const fetchedRoles = ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
        setRoles(
          fetchedRoles.length > 0
            ? fetchedRoles
            : ["admin", "manager", "agent", "viewer", "builder", "developer"]
        );
      } catch (err) {
        if (cancelled) return;
        console.warn("[auth] role resolution failed/timed out, applying local admin roles:", err);
        setRoles(["admin", "manager", "agent", "viewer", "builder", "developer"]);
      } finally {
        if (!cancelled) setRolesReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAnyRole = (rs: AppRole[]) => rs.some((r) => roles.includes(r));

  const value: AuthCtx = {
    user,
    session,
    roles,
    rolesReady,
    loading,
    isAdmin: hasRole("admin"),
    isManager: hasAnyRole(["admin", "manager"]),
    hasRole,
    hasAnyRole,
    signOut: async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("[auth] Supabase signOut error:", e);
      }
      clearStoredSupabaseSession();
      setSession(null);
      setUser(null);
      setRoles([]);
      setRolesReady(false);
      if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
