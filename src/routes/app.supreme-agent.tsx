import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState, useCallback, useEffect } from "react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import type { Session } from "@supabase/supabase-js";
import { processAgentRequest, type AgentResponse } from "@/lib/supreme-agent-processor";

function SupremeAgentPage() {
  const navigate = useNavigate();
  const { hasAnyRole, loading: authLoading, rolesReady } = useAuth();
  const { user } = Route.useRouteContext() as { user: { id: string; workspaceId: string; roles: string[] } };
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input; setInput("");
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    setIsLoading(true);
    try {
      const response = await processAgentRequest(
        { message: userMsg, workspaceId: user.workspaceId, inputMode: "text", dryRun: false },
        user.id, user.roles, supabase
      );
      // Primary user-facing answer is the synthesized natural-language narrative;
      // raw capability output is retained only in the Evidence/Details section.
      const text = response.narrative && response.narrative.trim()
        ? response.narrative
        : [
            "Intent: " + response.evidence.interpretedIntent,
            "Status: " + response.evidence.finalStatus,
            "Capabilities: " + response.evidence.capabilitiesInvoked.join(", "),
          ].join("\n");
      setMessages(m => [...m, { role: "agent", content: text }]);
      setLastResponse(response);
    } catch (err) {
      setMessages(m => [...m, { role: "agent", content: "Error: " + (err instanceof Error ? err.message : "Unknown") }]);
    } finally { setIsLoading(false); }
  }, [input, user.workspaceId, user.id, user.roles, supabase]);

  useEffect(() => { const inp = document.getElementById("agent-input") as HTMLInputElement; if (inp) inp.focus(); }, []);

  const renderMessage = (msg: { role: "user" | "agent"; content: string }, i: number) => {
    return (
      <div key={i} className="mb-3">
        <p className="text-right text-sm text-muted-foreground mb-1">{new Date().toLocaleTimeString()}</p>
        <p className="p-3 rounded">{msg.content}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-6">Supreme Agent</h1>
      <div className="h-48 overflow-y-auto mb-6 border rounded-b bg-muted/50 p-4">
        {messages.map(renderMessage)}
      </div>
      {lastResponse && (
        <div className="mt-4 p-3" style={{ background: "rgba(34, 197, 94, 0.2)" }}>
          <strong>Execution:</strong> {lastResponse.evidence.finalStatus === "completed" ? "Completed" : lastResponse.evidence.finalStatus}
          {" | "}
          <strong>Intent:</strong> {lastResponse.evidence.interpretedIntent}
          {" | "}
          <strong>Capabilities:</strong> {lastResponse.evidence.capabilitiesInvoked.join(", ")}
          {lastResponse.evidence.verification.discrepancies.length > 0 && (
            <div className="mt-1" style={{ color: "#b91c1c" }}>
              <strong>Errors:</strong> {lastResponse.evidence.verification.discrepancies.join("; ")}
            </div>
          )}
          {lastResponse.synthesis && (
            <details className="mt-2" style={{ background: "rgba(255,255,255,0.6)", padding: "0.5rem", borderRadius: "4px" }}>
              <summary>Evidence / Details</summary>
              <p style={{ fontSize: "12px", margin: "0.25rem 0" }}>
                Confidence: {Math.round(lastResponse.synthesis.confidence * 100)}% · Priority: {lastResponse.synthesis.priority}
              </p>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "11px", maxHeight: "14rem", overflow: "auto", margin: 0 }}>
                {JSON.stringify({
                  facts: lastResponse.synthesis.facts,
                  signals: lastResponse.synthesis.signals,
                  risks: lastResponse.synthesis.risks,
                  opportunities: lastResponse.synthesis.opportunities,
                  recommendations: lastResponse.synthesis.recommendations,
                  nextBestActions: lastResponse.synthesis.nextBestActions,
                  limitations: lastResponse.synthesis.limitations,
                  evidence: lastResponse.synthesis.evidence,
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
      <div className="flex gap-3">
        <input id="agent-input" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a command" disabled={isLoading} className="flex-1 border rounded w-64 py-2" />
        <button onClick={handleSend} disabled={isLoading} className="border rounded px-4 py-2 bg-primary text-white">{isLoading ? "Sending!" : "Send"}</button>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/app/supreme-agent')({
  ssr: false,
    beforeLoad: async () => {
    // `getSession()` can reject (transient network failure or an unrecoverable
    // token state) instead of resolving to null. An unhandled rejection here
    // red-screens the page via the route error boundary. Fail safe: re-route to
    // sign-in (mirrors src/routes/app.supreme-intelligence.tsx).
    let session: Session | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data.session ?? null;
    } catch {
      throw redirect({ to: "/auth" });
    }
    if (!session?.access_token) throw redirect({ to: "/auth" });
    let workspaceId = null;
    try { workspaceId = await getCurrentWorkspaceId(supabase); } catch (e) { console.error(e); }
    if (!workspaceId) throw redirect({ to: "/fort" });
    const user = session.user;
    if (!user) throw redirect({ to: "/auth" });
    // DB-backed roles (public.user_roles). Roles are NOT written into JWT
    // app_metadata/user_metadata in this project — the DB user_roles table is
    // the only source of truth (see useAuth + role-middleware requireRoles,
    // whose tests forbid reading app_metadata/user_metadata). Resolving roles
    // here keeps the Agent capability gate on the same DB-backed values the
    // rest of the platform enforces.
    //
    // GUARDED: a transient Supabase failure on this select must not propagate
    // out of beforeLoad as an unhandled rejection (red screen / stuck loader —
    // the failure mode reproduced live). Fail safe: degrade to roleless and let
    // the page-level role gate decide the landing — never crash the loader.
    let roles: string[] = [];
    try {
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (roleError) throw roleError;
      roles = ((roleRows ?? []) as { role: string }[]).map((r) => r.role);
    } catch (error) {
      console.error("[Supreme Agent] role resolution failed:", error);
    }
    return { user: { id: user.id, workspaceId, roles } };
  },
  component: SupremeAgentPage,
});