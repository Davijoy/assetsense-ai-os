import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULTS = {
  authorize: "https://auth.realtifyu.com/oauth/authorize",
  token: "https://auth.realtifyu.com/oauth/token",
  userinfo: "https://api.realtifyu.com/v1/me",
  scopes: "openid profile email",
};

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return b64url(new Uint8Array(buf));
}
function callbackUrl() {
  const req = getRequest();
  const url = new URL(req!.url);
  const proto = req!.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req!.headers.get("x-forwarded-host") ?? req!.headers.get("host") ?? url.host;
  return `${proto}://${host}/api/public/realtifyu/callback`;
}

export const getRealtifyuStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("realtifyu_connections")
      .select("account_email,account_name,account_id,scope,connected_at,expires_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const configured = Boolean(
      process.env.REALTIFYU_CLIENT_ID && process.env.REALTIFYU_CLIENT_SECRET,
    );
    return { connected: !!data, connection: data ?? null, configured };
  });

export const startRealtifyuOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { returnTo?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const clientId = process.env.REALTIFYU_CLIENT_ID;
    if (!clientId || !process.env.REALTIFYU_CLIENT_SECRET) {
      throw new Error(
        "RealtifyU OAuth is not configured yet. Add REALTIFYU_CLIENT_ID and REALTIFYU_CLIENT_SECRET in project secrets.",
      );
    }
    const authorize = process.env.REALTIFYU_AUTHORIZE_URL ?? DEFAULTS.authorize;
    const scopes = process.env.REALTIFYU_SCOPES ?? DEFAULTS.scopes;
    const redirect = callbackUrl();

    const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = await sha256(verifier);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("realtifyu_oauth_states").insert({
      state,
      user_id: context.userId,
      code_verifier: verifier,
      redirect_uri: redirect,
      return_to: data.returnTo ?? "/realtifyu",
    });
    if (error) throw new Error(error.message);

    const url = new URL(authorize);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", scopes);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return { authorizeUrl: url.toString() };
  });

export const disconnectRealtifyu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("realtifyu_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });