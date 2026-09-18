import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        // Handle OAuth errors from Google
        if (error) {
          const msg = errorDescription || error || "Authentication was cancelled";
          return htmlClose(msg, "/auth?auth=error");
        }

        // Validate code parameter
        if (!code) {
          return htmlClose("Missing authorization code", "/auth?auth=error");
        }

        try {
          // Return an HTML page that uses the browser-side Supabase client to exchange the code
          // This ensures the session is set properly with cookies
          return new Response(
            `<!doctype html>
<meta charset="utf-8">
<title>Signing in</title>
<body style="font-family:system-ui;background:#0b0b10;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="text-align:center"><p>Completing sign in…</p><p style="opacity:.6">Please wait</p></div>
<script>
(async () => {
  try {
    // Import Supabase client module dynamically
    const mod = await import('@/integrations/supabase/client');
    const { supabase } = mod;
    
    // Exchange the authorization code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession('${escapeJsString(code)}');
    
    if (error) {
      console.error('Auth exchange error:', error);
      window.location.replace('/auth?auth=error');
      return;
    }
    
    if (!data?.session) {
      console.error('No session received after code exchange');
      window.location.replace('/auth?auth=error');
      return;
    }
    
    // Session set successfully, redirect to the Sentinel Fort experience
    window.location.replace('/fort');
  } catch (err) {
    console.error('Auth callback error:', err);
    window.location.replace('/auth?auth=error');
  }
})();
</script>
</body>`,
            { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[Auth Callback] Error:", message);
          return htmlClose("An unexpected error occurred", "/auth?auth=error");
        }
      },
    },
  },
});

function htmlClose(message: string, redirect: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Signing in</title>
<body style="font-family:system-ui;background:#0b0b10;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="text-align:center"><p>${escapeHtml(message)}</p><p style="opacity:.6">Redirecting…</p></div>
<script>location.replace(${JSON.stringify(redirect)})</script></body>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapeJsString(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
