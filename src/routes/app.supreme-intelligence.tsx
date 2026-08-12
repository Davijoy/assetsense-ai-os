/**
 * Supreme Intelligence Orchestrator Route
 * 
 * Main page for the Supreme Intelligence Orchestrator dashboard.
 */

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState, useCallback, useEffect } from "react";
import { SupremeIntelligenceDashboard } from "@/components/SupremeIntelligenceDashboard";
import { 
  runSupremeOrchestration, 
  runProofScenario, 
  processApprovalDecision,
  type OrchestrationResponse,
  type ProofScenarioResponse,
  type ApprovalDecisionResponse,
} from "@/lib/supreme-orchestrator.functions";
import type { OrchestrationResult, ProofScenarioOutput, ApprovalRequest } from "@/business-intelligence/supreme/types";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";

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
  const { isAdmin, isManager, loading: authLoading, rolesReady } = useAuth();
  const { user } = Route.useRouteContext() as { user: LoaderData['user'] };

  useEffect(() => {
    // Only evaluate the admin guard once the auth session AND the user's roles
    // have been resolved. Redirecting before roles load would wrongly bounce
    // a genuine admin (roles still empty → isAdmin=false) to /app/crm.
    if (!authLoading && rolesReady && !isAdmin && !isManager) navigate({ to: "/app/crm" });
  }, [authLoading, rolesReady, isAdmin, navigate]);

  const [lastOrchestration, setLastOrchestration] = useState<OrchestrationResult | null>(null);
  const [lastProofScenario, setLastProofScenario] = useState<ProofScenarioOutput | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunOrchestration = useCallback(async (dryRun: boolean) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: OrchestrationResponse = await runSupremeOrchestration(
        {
          workspaceId: user.workspaceId,
          dryRun,
        },
        {
          workspaceId: user.workspaceId,
          userId: user.id,
          userRoles: user.roles,
        }
      );

      if (response.success && response.result) {
        setLastOrchestration(response.result);
        
        // Update pending approvals
        if (response.result.approvalRequests.length > 0) {
          setPendingApprovals(prev => [...prev, ...response.result!.approvalRequests]);
        }
      } else {
        setError(response.error ?? "Orchestration failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [user.workspaceId, user.id, user.roles]);

  const handleRunProofScenario = useCallback(async (request: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: ProofScenarioResponse = await runProofScenario(
        {
          ...request,
          workspaceId: user.workspaceId,
        },
        {
          workspaceId: user.workspaceId,
          userId: user.id,
          userRoles: user.roles,
        }
      );

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
            proposedActions: response.result.coordinatedRecommendation.approvalRequirement.actionsRequiringApproval,
            evidence: response.result.evidenceChain,
            requestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: "pending",
            approvers: response.result.coordinatedRecommendation.approvalRequirement.approverRoles,
            approvalsReceived: 0,
            requiredApprovals: response.result.coordinatedRecommendation.approvalRequirement.requiredApprovals,
          };
          setPendingApprovals(prev => [...prev, approvalRequest]);
        }
      } else {
        setError(response.error ?? "Proof scenario failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [user.workspaceId, user.id, user.roles]);

  const handleApprove = useCallback(async (requestId: string, recommendationId: string) => {
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
        }
      );

      if (response.success) {
        // Remove from pending approvals
        setPendingApprovals(prev => prev.filter(r => r.requestId !== requestId));
      } else {
        setError(response.error ?? "Approval failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.roles, user.workspaceId]);

  const handleReject = useCallback(async (requestId: string, recommendationId: string, reason: string) => {
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
        }
      );

      if (response.success) {
        // Remove from pending approvals
        setPendingApprovals(prev => prev.filter(r => r.requestId !== requestId));
      } else {
        setError(response.error ?? "Rejection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.roles, user.workspaceId]);

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

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 dark:text-red-200">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
export const Route = createFileRoute('/app/supreme-intelligence')({
  ssr: false,
  // Authentication + workspace gate. Mirrors src/routes/app.inventory.tsx and
  // src/routes/app.market.tsx: with `ssr: false` this runs client-side, where
  // the authenticated Supabase session (persisted in localStorage by the
  // client singleton) is available — which a server-side loader cannot rely on.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.access_token) {
      // Unauthenticated → sign in. Never proceed without a real session.
      throw redirect({ to: "/auth" });
    }

    // Canonical, RLS-safe workspace boundary: the `current_workspace_id` RPC
    // (auth.uid-based) resolves the caller's primary/active membership — the
    // SAME resolver used by getBISnapshot / getMyWorkspaceContext
    // (src/lib/bi.functions.ts, src/lib/workspace.functions.ts). It replaces
    // the prior metadata-based derivation (hardcoded-tenant fallback): we NEVER trust
    // client/user metadata for the workspace boundary and NEVER fall back to
    // another tenant.
    let workspaceId: string | null = null;
    try {
      workspaceId = await getCurrentWorkspaceId(supabase);
    } catch (error) {
      console.error("[Supreme Intelligence] workspace resolution failed:", error);
    }
    if (!workspaceId) {
      // Authenticated but not a member of any workspace → fail safely; do NOT
      // fall back to a default/foreign workspace.
      throw redirect({ to: "/app/crm" });
    }

    const user = session.user;
    if (!user) {
      // A session carrying an access_token but no user record cannot establish
      // identity. Redirect to sign-in; we never fabricate an identity or fall
      // back to a mock/foreign workspace.
      throw redirect({ to: "/auth" });
    }
    const roles = (user.app_metadata?.roles ?? user.user_metadata?.roles ?? []) as string[];

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
