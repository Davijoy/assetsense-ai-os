import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/realtifyu/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        if (err) return htmlClose(`RealtifyU returned: ${err}`, "/realtifyu?realtifyu=error");
        if (!code || !state) return htmlClose("Missing code/state", "/realtifyu?realtifyu=error");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: st, error: stErr } = await supabaseAdmin
          .from("realtifyu_oauth_states").select("*").eq("state", state).maybeSingle();
        if (stErr || !st) return htmlClose("Invalid or expired state", "/realtifyu?realtifyu=error");
        await supabaseAdmin.from("realtifyu_oauth_states").delete().eq("state", state);
        if (new Date(st.expires_at).getTime() < Date.now())
          return htmlClose("OAuth request expired", "/realtifyu?realtifyu=expired");

        const tokenUrl = process.env.REALTIFYU_TOKEN_URL ?? "https://auth.realtifyu.com/oauth/token";
        const clientId = process.env.REALTIFYU_CLIENT_ID!;
        const clientSecret = process.env.REALTIFYU_CLIENT_SECRET!;
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: st.redirect_uri,
          client_id: clientId,
          client_secret: clientSecret,
          code_verifier: st.code_verifier,
        });
        const tokRes = await fetch(tokenUrl, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
          body,
        });
        if (!tokRes.ok) {
          const t = await tokRes.text();
          console.error("realtifyu token exchange failed", tokRes.status, t);
          return htmlClose("Token exchange failed", "/realtifyu?realtifyu=token_failed");
        }
        const tok = (await tokRes.json()) as {
          access_token: string; refresh_token?: string; token_type?: string;
          scope?: string; expires_in?: number;
        };

        let profile: Record<string, unknown> | null = null;
        const userinfo = process.env.REALTIFYU_USERINFO_URL ?? "https://api.realtifyu.com/v1/me";
        try {
          const p = await fetch(userinfo, { headers: { authorization: `Bearer ${tok.access_token}` } });
          if (p.ok) profile = await p.json();
        } catch { /* ignore */ }

        const expiresAt = tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null;
        const { error: upErr } = await supabaseAdmin.from("realtifyu_connections").upsert({
          user_id: st.user_id,
          access_token: tok.access_token,
          refresh_token: tok.refresh_token ?? null,
          token_type: tok.token_type ?? "Bearer",
          scope: tok.scope ?? null,
          expires_at: expiresAt,
          account_id: (profile?.id as string) ?? (profile?.sub as string) ?? null,
          account_email: (profile?.email as string) ?? null,
          account_name: (profile?.name as string) ?? (profile?.full_name as string) ?? null,
          raw_profile: profile as never,
        }, { onConflict: "user_id" });
        if (upErr) return htmlClose(upErr.message, "/realtifyu?realtifyu=save_failed");

        const returnTo = st.return_to && st.return_to.startsWith("/") ? st.return_to : "/realtifyu";
        return htmlClose("Connected to RealtifyU", `${returnTo}?realtifyu=connected`);
      },
    },
  },
});

function htmlClose(message: string, redirect: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>RealtifyU</title>
<body style="font-family:system-ui;background:#0b0b10;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="text-align:center"><p>${escapeHtml(message)}</p><p style="opacity:.6">Redirecting…</p></div>
<script>location.replace(${JSON.stringify(redirect)})</script></body>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}