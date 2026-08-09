/**
 * Supreme Intelligence Orchestrator Dashboard
 * 
 * UI component for viewing and managing cross-domain intelligence orchestration,
 * proof scenarios, and approval workflows.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  runSupremeOrchestration, 
  runProofScenario, 
  processApprovalDecision,
  getOrchestrationStatus,
  getApprovalRequestStatus,
  type OrchestrationRequest,
  type ProofScenarioRequest,
  type ApprovalDecisionRequest,
  type OrchestrationResponse,
  type ProofScenarioResponse,
  type ApprovalDecisionResponse,
} from "@/lib/supreme-orchestrator.functions";
import type { OrchestrationResult, ProofScenarioOutput, CoordinatedRecommendation, ApprovalRequest } from "@/business-intelligence/supreme/types";

/** Dashboard state */
interface DashboardState {
  activeTab: "orchestration" | "proof-scenario" | "approvals" | "history";
  lastOrchestration: OrchestrationResult | null;
  lastProofScenario: ProofScenarioOutput | null;
  pendingApprovals: ApprovalRequest[];
  isLoading: boolean;
  error: string | null;
}

/** Orchestration tab component */
function OrchestrationTab({ 
  onRunOrchestration, 
  lastResult, 
  isLoading 
}: { 
  onRunOrchestration: (dryRun: boolean) => Promise<void>;
  lastResult: OrchestrationResult | null;
  isLoading: boolean;
}) {
  const [dryRun, setDryRun] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cross-Domain Orchestration</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Dry Run Mode</span>
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <button
          onClick={() => onRunOrchestration(dryRun)}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running Orchestration...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {dryRun ? "Run Dry Run" : "Run Full Orchestration"}
            </>
          )}
        </button>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
          {dryRun 
            ? "Dry run simulates orchestration without creating approval requests or sending notifications"
            : "Full orchestration will create approval requests and send notifications to stakeholders"}
        </p>
      </div>

      {lastResult && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Last Orchestration Result</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Decisions" value={lastResult.decisions.length} icon="📋" />
            <StatCard title="Recommendations" value={lastResult.recommendations.length} icon="💡" />
            <StatCard title="Correlations" value={lastResult.correlations.length} icon="🔗" />
            <StatCard title="Approval Requests" value={lastResult.approvalRequests.length} icon="✅" />
          </div>

          {lastResult.decisions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h4 className="font-medium mb-3">Coordinated Decisions</h4>
              <div className="space-y-2">
                {lastResult.decisions.map((decision) => (
                  <DecisionCard key={decision.decisionId} decision={decision} />
                ))}
              </div>
            </div>
          )}

          {lastResult.recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h4 className="font-medium mb-3">Coordinated Recommendations</h4>
              <div className="space-y-2">
                {lastResult.recommendations.map((rec) => (
                  <RecommendationCard key={rec.recommendationId} recommendation={rec} />
                ))}
              </div>
            </div>
          )}

          {lastResult.correlations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h4 className="font-medium mb-3">Cross-Domain Correlations</h4>
              <div className="space-y-2">
                {lastResult.correlations.map((corr) => (
                  <CorrelationCard key={corr.id} correlation={corr} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Main Supreme Intelligence Dashboard Component */
export function SupremeIntelligenceDashboard({
  onRunOrchestration,
  onRunProofScenario,
  onApprove,
  onReject,
  lastOrchestration,
  lastProofScenario,
  pendingApprovals,
  isLoading,
}: {
  onRunOrchestration: (dryRun: boolean) => Promise<void>;
  onRunProofScenario: (request: any) => Promise<void>;
  onApprove: (requestId: string, recommendationId: string) => Promise<void>;
  onReject: (requestId: string, recommendationId: string, reason: string) => Promise<void>;
  lastOrchestration: OrchestrationResult | null;
  lastProofScenario: ProofScenarioOutput | null;
  pendingApprovals: ApprovalRequest[];
  isLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"orchestration" | "proof-scenario" | "approvals" | "history">("orchestration");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg border p-1">
        <button
          onClick={() => setActiveTab("orchestration")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "orchestration"
              ? "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          Orchestration
        </button>
        <button
          onClick={() => setActiveTab("proof-scenario")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "proof-scenario"
              ? "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          Proof Scenario
        </button>
        <button
          onClick={() => setActiveTab("approvals")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "approvals"
              ? "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          Approvals {pendingApprovals.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-600 text-white rounded-full">
              {pendingApprovals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "orchestration" && (
        <OrchestrationTab
          onRunOrchestration={onRunOrchestration}
          lastResult={lastOrchestration}
          isLoading={isLoading}
        />
      )}
      {activeTab === "proof-scenario" && (
        <ProofScenarioTab
          onRunProofScenario={onRunProofScenario}
          lastResult={lastProofScenario}
          isLoading={isLoading}
        />
      )}
      {activeTab === "approvals" && (
        <ApprovalsTab
          pendingApprovals={pendingApprovals}
          onApprove={onApprove}
          onReject={onReject}
          isLoading={isLoading}
        />
      )}
      {activeTab === "history" && (
        <HistoryTab
          orchestrations={lastOrchestration ? [lastOrchestration] : []}
          proofScenarios={lastProofScenario ? [lastProofScenario] : []}
        />
      )}
    </div>
  );
}

/** Proof Scenario tab component */
function ProofScenarioTab({ 
  onRunProofScenario, 
  lastResult, 
  isLoading 
}: { 
  onRunProofScenario: (request: ProofScenarioRequest) => Promise<void>;
  lastResult: ProofScenarioOutput | null;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    customerId: "",
    customerCity: "",
    customerPropertyType: "",
    leadId: "",
    assetIds: "",
    dryRun: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRunProofScenario({
      workspaceId: "default-workspace", // In real app, get from context
      customerId: formData.customerId,
      customerCity: formData.customerCity,
      customerPropertyType: formData.customerPropertyType,
      leadId: formData.leadId || undefined,
      assetIds: formData.assetIds ? formData.assetIds.split(",").map(s => s.trim()) : undefined,
      dryRun: formData.dryRun,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Proof Scenario: Customer at Risk + Matching Inventory + Market Momentum</h2>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer ID *</label>
            <input
              type="text"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              placeholder="CUST-12345"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer City *</label>
            <input
              type="text"
              value={formData.customerCity}
              onChange={(e) => setFormData({ ...formData, customerCity: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              placeholder="Mumbai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Property Type *</label>
            <select
              value={formData.customerPropertyType}
              onChange={(e) => setFormData({ ...formData, customerPropertyType: e.target.value })}
              required
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">Select property type</option>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lead ID (optional)</label>
            <input
              type="text"
              value={formData.leadId}
              onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              placeholder="LEAD-67890"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Asset IDs (comma-separated, optional)</label>
          <input
            type="text"
            value={formData.assetIds}
            onChange={(e) => setFormData({ ...formData, assetIds: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            placeholder="ASSET-001, ASSET-002, ASSET-003"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.dryRun}
            onChange={(e) => setFormData({ ...formData, dryRun: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Dry Run Mode</span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running Proof Scenario...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formData.dryRun ? "Run Proof Scenario (Dry Run)" : "Run Proof Scenario"}
            </>
          )}
        </button>
      </form>

      {lastResult && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Proof Scenario Result</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatusCard 
              title="Customer at Risk" 
              value={lastResult.customerAtRisk ? "YES" : "NO"} 
              status={lastResult.customerAtRisk ? "warning" : "success"} 
            />
            <StatusCard 
              title="CRM Weak Engagement" 
              value={lastResult.crmWeakEngagement ? "YES" : "NO"} 
              status={lastResult.crmWeakEngagement ? "warning" : "success"} 
            />
            <StatusCard 
              title="Matching Inventory" 
              value={lastResult.matchingInventoryAvailable ? "YES" : "NO"} 
              status={lastResult.matchingInventoryAvailable ? "success" : "warning"} 
            />
            <StatusCard 
              title="Market Momentum" 
              value={lastResult.marketPositiveMomentum ? "POSITIVE" : "NEGATIVE"} 
              status={lastResult.marketPositiveMomentum ? "success" : "warning"} 
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <h4 className="font-medium mb-3">Evidence Chain</h4>
            <div className="space-y-2">
              {lastResult.evidenceChain.map((evidence, index) => (
                <div key={index} className="text-sm p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="font-medium">{evidence.factor}</div>
                  <div className="text-gray-600 dark:text-gray-300">
                    Value: {JSON.stringify(evidence.value)} | Impact: {evidence.impact} | Confidence: {(evidence.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lastResult.coordinatedRecommendation && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h4 className="font-medium mb-3">Coordinated Recommendation</h4>
              <RecommendationCard recommendation={lastResult.coordinatedRecommendation} />
            </div>
          )}

          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className={lastResult.approvalRequired ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
              {lastResult.approvalRequired ? "⚠️ Approval Required" : "✅ Auto-Approved"}
            </span>
            <span className="text-sm text-gray-500">Dry Run: {lastResult.dryRun ? "Yes" : "No"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Approvals tab component */
function ApprovalsTab({ 
  pendingApprovals, 
  onApprove, 
  onReject, 
  isLoading 
}: { 
  pendingApprovals: ApprovalRequest[];
  onApprove: (requestId: string, recommendationId: string) => Promise<void>;
  onReject: (requestId: string, recommendationId: string, reason: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Pending Approvals ({pendingApprovals.length})</h2>

      {pendingApprovals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="mt-2">No pending approval requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((request) => (
            <ApprovalRequestCard
              key={request.requestId}
              request={request}
              isExpanded={expandedRequest === request.requestId}
              onToggle={() => setExpandedRequest(expandedRequest === request.requestId ? null : request.requestId)}
              onApprove={() => onApprove(request.requestId, request.recommendationId)}
              onReject={(reason) => onReject(request.requestId, request.recommendationId, reason)}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** History tab component */
function HistoryTab({ 
  orchestrations, 
  proofScenarios 
}: { 
  orchestrations: OrchestrationResult[];
  proofScenarios: ProofScenarioOutput[];
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Orchestration History</h2>
      
      {orchestrations.length === 0 && proofScenarios.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No history available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orchestrations.map((orch) => (
            <div key={orch.orchestrationId} className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Orchestration: {orch.orchestrationId}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(orch.generatedAt).toLocaleString()} | 
                    {orch.dryRun ? "Dry Run" : "Live"} | 
                    {orch.trace.durationMs}ms
                  </p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {orch.decisions.length} decisions, {orch.recommendations.length} recs
                </span>
              </div>
            </div>
          ))}
          
          {proofScenarios.map((scenario) => (
            <div key={scenario.correlationId} className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Proof Scenario: {scenario.scenario}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(scenario.generatedAt).toLocaleString()} | 
                    {scenario.dryRun ? "Dry Run" : "Live"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${scenario.customerAtRisk ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                    Customer at Risk: {scenario.customerAtRisk ? "Yes" : "No"}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${scenario.approvalRequired ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}>
                    {scenario.approvalRequired ? "Approval Required" : "Auto-Approved"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 text-center">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
}

function StatusCard({ title, value, status }: { title: string; value: string; status: "success" | "warning" }) {
  const colors = {
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    warning: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 text-center">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className={`text-lg font-bold px-3 py-1 rounded ${colors[status]}`}>{value}</div>
    </div>
  );
}

function DecisionCard({ decision }: { decision: any }) {
  const severityColors = {
    CRITICAL: "bg-red-100 text-red-800 border-red-200",
    HIGH: "bg-orange-100 text-orange-800 border-orange-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
    LOW: "bg-green-100 text-green-800 border-green-200",
  };
  
  return (
    <div className={`p-3 rounded border ${severityColors[decision.severity as keyof typeof severityColors] || "bg-gray-100 text-gray-800"}`}>
      <div className="flex items-start justify-between">
        <div>
          <h5 className="font-medium">{decision.title}</h5>
          <p className="text-sm mt-1">{decision.explanation}</p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-white/50">Confidence: {(decision.confidence * 100).toFixed(0)}%</span>
            <span className="px-2 py-0.5 rounded bg-white/50">Segment: {decision.affectedSegment}</span>
          </div>
        </div>
        <span className="px-2 py-1 text-xs font-medium rounded">{decision.severity}</span>
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: CoordinatedRecommendation }) {
  const priorityColors = {
    CRITICAL: "bg-red-100 text-red-800 border-red-200",
    HIGH: "bg-orange-100 text-orange-800 border-orange-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
    LOW: "bg-green-100 text-green-800 border-green-200",
  };
  
  return (
    <div className={`p-3 rounded border ${priorityColors[recommendation.priority]}`}>
      <div className="flex items-start justify-between">
        <div>
          <h5 className="font-medium">{recommendation.title}</h5>
          <p className="text-sm mt-1">{recommendation.businessReason}</p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-white/50">Confidence: {(recommendation.confidence * 100).toFixed(0)}%</span>
            <span className="px-2 py-0.5 rounded bg-white/50">Action: {recommendation.recommendedAction}</span>
            <span className="px-2 py-0.5 rounded bg-white/50">Impact: {recommendation.expectedImpact}</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Domains: {recommendation.sourceDomains.join(", ")}
          </div>
        </div>
        <div className="text-right">
          <span className="px-2 py-1 text-xs font-medium rounded">{recommendation.priority}</span>
          {recommendation.approvalRequirement.required && (
            <span className="block mt-1 px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-800">
              Approval Required
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CorrelationCard({ correlation }: { correlation: any }) {
  return (
    <div className="p-3 rounded border bg-blue-50 dark:bg-blue-900/20">
      <div className="flex items-start justify-between">
        <div>
          <h5 className="font-medium">{correlation.description}</h5>
          <p className="text-sm mt-1">{correlation.businessReason}</p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-white/50">Type: {correlation.type}</span>
            <span className="px-2 py-0.5 rounded bg-white/50">Confidence: {(correlation.confidence * 100).toFixed(0)}%</span>
            <span className="px-2 py-0.5 rounded bg-white/50">Domains: {correlation.domains.join(", ")}</span>
          </div>
        </div>
        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
          Correlation
        </span>
      </div>
    </div>
  );
}

function ApprovalRequestCard({ 
  request, 
  isExpanded, 
  onToggle, 
  onApprove, 
  onReject, 
  isLoading 
}: { 
  request: ApprovalRequest;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h4 className="font-medium">{request.title}</h4>
          <p className="text-sm text-gray-500 mt-1">{request.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-2 py-1 text-xs rounded-full ${
            request.status === "pending" ? "bg-yellow-100 text-yellow-800" :
            request.status === "approved" ? "bg-green-100 text-green-800" :
            "bg-red-100 text-red-800"
          }`}>
            {request.status}
          </span>
          <span className="text-sm text-gray-500">
            Expires: {new Date(request.expiresAt).toLocaleString()}
          </span>
          <svg 
            className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div>
            <h5 className="font-medium mb-2">Proposed Actions</h5>
            <div className="space-y-2">
              {request.proposedActions.map((action) => (
                <div key={action.actionId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium capitalize">{action.type.replace("_", " ")}</span>
                      <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                      <p className="text-xs text-gray-400">Target: {action.targetEntity} ({action.targetEntityType})</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${action.requiresHumanApproval ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}>
                      {action.requiresHumanApproval ? "Requires Approval" : "Auto-Approved"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="font-medium mb-2">Evidence</h5>
            <div className="space-y-2">
              {request.evidence.map((evidence, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                  <div className="font-medium">{evidence.factor}</div>
                  <div className="text-gray-600 dark:text-gray-300">
                    Value: {JSON.stringify(evidence.value)} | Impact: {evidence.impact} | Confidence: {(evidence.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
            <span className="text-sm text-gray-500">
              Approvals: {request.approvalsReceived}/{request.requiredApprovals}
            </span>
          </div>
        </div>
      )}

      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Reject Approval Request</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              required
              className="w-full px-3 py-2 border rounded-lg mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowRejectDialog(false); setRejectReason(""); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onReject(rejectReason);
                  setShowRejectDialog(false);
                  setRejectReason("");
                }}
                disabled={isLoading || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
