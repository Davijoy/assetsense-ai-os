import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    // Real Supabase auth flow (Google OAuth / email)
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) setRoles([]);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      // getSession is the authoritative initial auth check.
      // Restore the session if present; otherwise user stays null (route → /auth).
      if (data.session) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      // Always stop loading once the initial auth check resolves, regardless
      // of whether a session exists. onAuthStateChange keeps session/user in
      // sync for subsequent events (login, logout, token refresh).
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      // No authenticated user → the role set is trivially settled (empty).
      setRolesReady(true);
      return;
    }
    let cancelled = false;

    // Fetch roles from database
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (cancelled) return;
      setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
      // Roles have been resolved from the DB — safe for guards to evaluate.
      setRolesReady(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAnyRole = (rs: AppRole[]) => rs.some((r) => roles.includes(r));

  const value: AuthCtx = {
    user, session, roles, rolesReady, loading,
    isAdmin: hasRole("admin"),
    isManager: hasAnyRole(["admin", "manager"]),
    hasRole, hasAnyRole,
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}