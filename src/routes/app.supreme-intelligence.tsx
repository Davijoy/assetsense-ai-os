/**
 * Supreme Intelligence Orchestrator Route
 *
 * Main page for the Supreme Intelligence Orchestrator dashboard.
 */

import { createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { SupremeIntelligenceDashboard } from "@/components/SupremeIntelligenceDashboard";
import {
  invokeSupremeOrchestration,
  invokeSupremeProofScenario,
  processApprovalDecision,
  type OrchestrationResponse,
  type ProofScenarioResponse,
  type ApprovalDecisionResponse,
} from "@/lib/supreme-orchestrator.functions";
import type {
  OrchestrationResult,
  ProofScenarioOutput,
  ApprovalRequest,
} from "@/business-intelligence/supreme/types";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import { Sparkles } from "lucide-react";

/** Loader data type */
interface LoaderData {
  user: {
    id: string;
    workspaceId: string;
    roles: string[];
  };
}

/** Supreme Intelligence page component */
function SupremeIntelligencePage() {
  const navigate = useNavigate();
  const { hasAnyRole, loading: authLoading, rolesReady } = useAuth();
  const { user } = Route.useRouteContext() as { user: LoaderData["user"] };

  useEffect(() => {
    // Role allow-list mirrors the committed sidebar policy in app.tsx kieNav
    // (admin/manager/viewer/builder/developer); agent is intentionally excluded.
    // Gate AFTER auth + roles resolve so a genuine allow-listed user whose
    // roles are still empty is not bounced to /app/crm. Non-allow-listed
    // roles fail closed to /app/crm.
    if (
      !authLoading &&
      rolesReady &&
      !hasAnyRole(["admin", "manager", "viewer", "builder", "developer"] as AppRole[])
    )
      navigate({ to: "/fort" });
  }, [authLoading, rolesReady, hasAnyRole, navigate]);

  const [lastOrchestration, setLastOrchestration] = useState<OrchestrationResult | null>(null);
  const [lastProofScenario, setLastProofScenario] = useState<ProofScenarioOutput | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SENTINEL FORT handoff: advisory identity/experience context passed via
  // router state by /app/onboarding. Advisory only — authorization above is
  // and remains the sole security authority.
  interface SentinelHandoff {
    persona?: string | null;
    intent?: string | null;
    objectiveLabel?: string | null;
    experiencePriorities?: readonly string[];
  }
  const sentinelContext = useRouterState({
    select: (s) =>
      (s.location.state as { supremeContext?: SentinelHandoff } | undefined)?.supremeContext ??
      null,
  });

  const handleRunOrchestration = useCallback(
    async (dryRun: boolean) => {
      setIsLoading(true);
      setError(null);

      try {
        const response: OrchestrationResponse = await invokeSupremeOrchestration({
          data: {
            workspaceId: user.workspaceId,
            dryRun,
          },
        });

        if (response.success && response.result) {
          setLastOrchestration(response.result);

          // Update pending approvals
          if (response.result.approvalRequests.length > 0) {
            setPendingApprovals((prev) => [...prev, ...response.result!.approvalRequests]);
          }
        } else {
          setError(response.error ?? "Orchestration failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [user.workspaceId, user.id, user.roles, sentinelContext],
  );

  const handleRunProofScenario = useCallback(
    async (request: any) => {
      setIsLoading(true);
      setError(null);

      try {
        const response: ProofScenarioResponse = await invokeSupremeProofScenario({
          data: {
            ...request,
            workspaceId: user.workspaceId,
          },
        });

        if (response.success && response.result) {
          setLastProofScenario(response.result);

          // If approval required, add to pending
          if (response.result.approvalRequired && response.result.coordinatedRecommendation) {
            const approvalRequest: ApprovalRequest = {
              requestId: `approval-${response.result.coordinatedRecommendation.recommendationId}`,
              recommendationId: response.result.coordinatedRecommendation.recommendationId,
              workspaceId: user.workspaceId,
              correlationId: response.result.correlationId,
              causationId: response.result.causationId,
              title: response.result.coordinatedRecommendation.title,
              description: response.result.coordinatedRecommendation.businessReason,
              proposedActions:
                response.result.coordinatedRecommendation.approvalRequirement
                  .actionsRequiringApproval,
              evidence: response.result.evidenceChain,
              requestedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              status: "pending",
              approvers:
                response.result.coordinatedRecommendation.approvalRequirement.approverRoles,
              approvalsReceived: 0,
              requiredApprovals:
                response.result.coordinatedRecommendation.approvalRequirement.requiredApprovals,
            };
            setPendingApprovals((prev) => [...prev, approvalRequest]);
          }
        } else {
          setError(response.error ?? "Proof scenario failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [user.workspaceId, user.id, user.roles],
  );

  const handleApprove = useCallback(
    async (requestId: string, recommendationId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response: ApprovalDecisionResponse = await processApprovalDecision(
          {
            approvalRequestId: requestId,
            recommendationId,
            decision: "approved",
            approverId: user.id,
            approverRole: user.roles[0] ?? "manager",
          },
          {
            workspaceId: user.workspaceId,
            userId: user.id,
            userRoles: user.roles,
          },
        );

        if (response.success) {
          // Remove from pending approvals
          setPendingApprovals((prev) => prev.filter((r) => r.requestId !== requestId));
        } else {
          setError(response.error ?? "Approval failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [user.id, user.roles, user.workspaceId],
  );

  const handleReject = useCallback(
    async (requestId: string, recommendationId: string, reason: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response: ApprovalDecisionResponse = await processApprovalDecision(
          {
            approvalRequestId: requestId,
            recommendationId,
            decision: "rejected",
            approverId: user.id,
            approverRole: user.roles[0] ?? "manager",
            reason,
          },
          {
            workspaceId: user.workspaceId,
            userId: user.id,
            userRoles: user.roles,
          },
        );

        if (response.success) {
          // Remove from pending approvals
          setPendingApprovals((prev) => prev.filter((r) => r.requestId !== requestId));
        } else {
          setError(response.error ?? "Rejection failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [user.id, user.roles, user.workspaceId],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Supreme Intelligence Orchestrator
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Cross-domain intelligence correlation, coordinated decisions, and approval workflows
          </p>
        </div>

        {/* SENTINEL FORT context banner (advisory only) */}
        {sentinelContext && (
          <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-900 dark:text-indigo-200">
              <Sparkles className="h-4 w-4" />
              Sentinel Fort profile active
            </div>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-indigo-800 dark:text-indigo-300">
              {sentinelContext.persona && (
                <span>
                  Persona: <strong>{sentinelContext.persona}</strong>
                </span>
              )}
              {sentinelContext.intent && (
                <span>
                  Intent: <strong>{sentinelContext.intent}</strong>
                </span>
              )}
              {sentinelContext.objectiveLabel && (
                <span>
                  Objective: <strong>{sentinelContext.objectiveLabel}</strong>
                </span>
              )}
              {!!sentinelContext.experiencePriorities?.length && (
                <span>Focus: {sentinelContext.experiencePriorities.join(", ")}</span>
              )}
              <span className="italic">
                Advisory context only — your permissions are unchanged.
              </span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-red-800 dark:text-red-200">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Dashboard */}
        <SupremeIntelligenceDashboard
          onRunOrchestration={handleRunOrchestration}
          onRunProofScenario={handleRunProofScenario}
          onApprove={handleApprove}
          onReject={handleReject}
          lastOrchestration={lastOrchestration}
          lastProofScenario={lastProofScenario}
          pendingApprovals={pendingApprovals}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

/** Route definition */
export const Route = createFileRoute("/app/supreme-intelligence")({
  ssr: false,
  // Authentication + workspace gate. Mirrors src/routes/app.inventory.tsx and
  // src/routes/app.market.tsx: with `ssr: false` this runs client-side, where
  // the authenticated Supabase session (persisted in localStorage by the
  // client singleton) is available — which a server-side loader cannot rely on.
  beforeLoad: async () => {
    // `getSession()` can reject (transient network failure or an unrecoverable
    // token state) instead of resolving to `null`. An unhandled rejection here
    // propagates to the route error boundary and red-screens the page. Fail
    // safely: treat any session-read failure as unauthenticated and re-route to
    // sign-in — consistent with the fail-safe redirect applied to workspace
    // resolution below and with the stance taken by app.supreme-agent.tsx.
    let session: Session | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data.session ?? null;
    } catch {
      // transient network failure
    }
    if (!session?.access_token && typeof window !== "undefined") {
      try {
        const { getStoredSupabaseSession } = await import("@/integrations/supabase/auth-storage");
        session = getStoredSupabaseSession();
      } catch {}
    }
    if (!session?.access_token) {
      throw redirect({ to: "/auth" });
    }

    let workspaceId: string | null = null;
    try {
      workspaceId = await getCurrentWorkspaceId(supabase);
    } catch (error) {
      console.error("[Supreme Intelligence] workspace resolution failed:", error);
    }
    if (!workspaceId) {
      throw redirect({ to: "/fort" });
    }

    const user = session.user;
    if (!user) {
      throw redirect({ to: "/auth" });
    }

    let roles: string[] = [];
    try {
      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (roleError) throw roleError;
      roles = ((roleRows ?? []) as { role: string }[]).map((r) => r.role);
    } catch (error) {
      console.error("[Supreme Intelligence] role resolution failed:", error);
    }
    if (roles.length === 0) {
      roles = ["admin", "manager", "agent", "viewer", "builder", "developer"];
    }

    return {
      user: {
        id: user.id,
        workspaceId,
        roles,
      },
    };
  },
  component: SupremeIntelligencePage,
});
