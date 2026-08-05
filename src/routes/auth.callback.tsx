import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Sentinel Fort Group" },
      { name: "description", content: "Completing secure sign-in to the Sentinel Fort Group console." },
    ],
  }),
  component: AuthCallback,
});

function readTokens() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const get = (k: string) => hash.get(k) ?? query.get(k);
  return {
    access_token: get("access_token"),
    refresh_token: get("refresh_token"),
    error: get("error_description") ?? get("error"),
  };
}

function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { access_token, refresh_token, error } = readTokens();
      if (error) {
        if (!cancelled) navigate({ to: "/auth" });
        return;
      }
      if (access_token && refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
        window.history.replaceState({}, "", "/auth/callback");
        if (setErr) {
          if (!cancelled) {
            setMessage("Sign-in failed. Redirecting…");
            navigate({ to: "/auth" });
          }
          return;
        }
        if (!cancelled) navigate({ to: "/app/crm" });
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      navigate({ to: data.session ? "/app/crm" : "/auth" });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    </div>
  );
}