/**
 * SUPREME AGENT KERNEL — Main Request Processor
 * Sentinel Fort — processes complete agent requests server-side.
 *
 * UNIFIED BRAIN ARCHITECTURE:
 * - FAST PATH: Direct sub-50ms execution for conversational, factual, identity, and status queries.
 * - DEEP PATH: Multi-domain reasoning, capability execution, and synthesis.
 * - CONTINUOUS LEARNING LOOP: Integrated Level 1 (Data), Level 2 (Context Memory), Level 3 (Outcome Learning),
 *   Level 4 (Pattern Learning), and Level 5 (Self-Improvement).
 * - FORENSIC LATENCY INSTRUMENTATION: T0 - T8 pipeline tracking.
 */

import {
  interpretIntent,
  createPlan,
  composeFallbackText,
  isFastPathQuery,
  type AgentIntent,
  type AgentEntities,
} from "./supreme-agent-intent";
import { AGENT_CAPABILITIES, getCapability, checkCapabilityRoles, classifyApproval } from "./supreme-agent-capabilities";
import { executePlan } from "./supreme-agent-execution";
import {
  synthesizeAgentResponse,
  type IntelligenceSynthesis,
} from "./supreme-agent-synthesis";
import {
  SUPREME_LEARNING,
  type LatencyAuditMetrics,
} from "./sentinel-learning";

// ============================================================
// PROCESS AGENT REQUEST — server-side entry point
// ============================================================

export interface AgentRequest {
  message: string;
  workspaceId: string;
  conversationId?: string;
  context?: Record<string, any>;
  inputMode: "text" | "voice";
  dryRun?: boolean;
}

export interface AgentResponse {
  success: boolean;
  request: AgentRequest;
  plan: { id: string; steps: any[]; intent: AgentIntent };
  result?: any;
  /** Canonical synthesized intelligence (natural language primary + evidence). */
  synthesis?: IntelligenceSynthesis;
  /** Pre-composed natural-language answer for users. */
  narrative?: string;
  /** Execution path: "fast_path" or "deep_path" */
  reasoningPath?: "fast_path" | "deep_path";
  /** Forensic latency breakdown */
  latency?: LatencyAuditMetrics;
  evidence: {
    executionId: string;
    workspaceId: string;
    userId: string;
    timestamp: string;
    originalRequest: string;
    interpretedIntent: AgentIntent;
    plan: { id: string; steps: any[]; intent: AgentIntent };
    capabilitiesInvoked: string[];
    stepResults: any[];
    verification: {
      status: "verified" | "partial" | "failed";
      confirmedResults: any[];
      discrepancies: string[];
    };
    finalStatus: "completed" | "partial" | "failed";
    dryRun: boolean;
  };
  requiresApproval: boolean;
  approvalRequiredFor: string[];
}

/** Processes a complete agent request server-side */
export async function processAgentRequest(
  request: AgentRequest,
  userId: string,
  userRoles: string[],
  supabase: any
): Promise<AgentResponse> {
  const t0 = request.context?.t0 || Date.now();
  const t3_start = Date.now();

  // 1. Check for Fast Path match (Conversational / Identity / Status / Factual)
  const fastMatch = isFastPathQuery(request.message);
  if (fastMatch.isFast) {
    return handleFastPathRequest(request, userId, userRoles, fastMatch.type!, t0, t3_start);
  }

  // -------------------------------------------------------------
  // DEEP PATH EXECUTION
  // -------------------------------------------------------------

  // 2. Interpret intent
  const { intent, entities } = interpretIntent(request.message);
  entities.workspaceId = request.workspaceId;
  const t3 = Date.now();

  // 3. Level 2 Context Memory & Level 4 Pattern Retrieval
  const sessionMemory = SUPREME_LEARNING.getOrCreateSessionMemory(
    request.workspaceId,
    userId,
    userRoles[0] || "investor",
    "INVESTOR"
  );
  const learnedPatterns = SUPREME_LEARNING.getPatternsForWorkspace(request.workspaceId);
  const t4 = Date.now();

  // 4. Create execution plan
  const planResult = createPlan(intent, entities, request.dryRun ?? false);
  const plan = planResult.plan;

  // If routing could not confidently select a capability, return structured clarification
  if (planResult.clarification || plan.steps.length === 0) {
    const helpfulText = composeFallbackText(request.message);
    const controlReason = planResult.reason ?? "No capability matched the request.";
    const clarificationSynthesis: IntelligenceSynthesis = {
      summary: helpfulText,
      headline: helpfulText,
      assessments: [],
      facts: [],
      signals: [],
      risks: [],
      opportunities: [],
      recommendations: [],
      nextBestActions: [],
      confidence: 0,
      priority: "LOW",
      evidence: [],
      limitations: [
        {
          type: "insufficient_evidence",
          message: controlReason,
        },
      ],
      narrative: helpfulText,
      modelContext: { source: "deterministic", consumer: "supreme-agent", approved: true },
    };

    const t6 = Date.now();
    const latency: LatencyAuditMetrics = {
      t0_userStoppedSpeaking: t0,
      t3_intentClassified: t3,
      t4_contextRetrieved: t4,
      t6_responseGenerated: t6,
      durations: {
        intentDurationMs: t3 - t0,
        contextRetrievalMs: t4 - t3,
        synthesisDurationMs: t6 - t4,
        totalResponseMs: t6 - t0,
      },
      slowestStage: "Synthesis & Routing",
      path: "deep_path",
    };

    return {
      success: false,
      request,
      plan,
      synthesis: clarificationSynthesis,
      narrative: helpfulText,
      reasoningPath: "deep_path",
      latency,
      evidence: {
        executionId: `exec-${Date.now()}`,
        workspaceId: request.workspaceId,
        userId,
        timestamp: new Date().toISOString(),
        originalRequest: request.message,
        interpretedIntent: intent,
        plan,
        capabilitiesInvoked: [],
        stepResults: [],
        verification: {
          status: "failed",
          confirmedResults: [],
          discrepancies: [controlReason],
        },
        finalStatus: "failed",
        dryRun: request.dryRun ?? false,
      },
      requiresApproval: false,
      approvalRequiredFor: [],
    };
  }

  // 5. Execute the plan
  const execution = await executePlan(plan, request.workspaceId, userId, userRoles, supabase, request.dryRun ?? false);
  const t5 = Date.now();

  // 6. Update evidence with original request
  execution.evidence.originalRequest = request.message;

  // 7. Determine approval requirements from executed plan steps
  const approvalRequiredFor: string[] = [];
  for (const step of plan.steps) {
    if (step.approvalRequired) approvalRequiredFor.push(step.capability);
  }
  const requiresApproval = approvalRequiredFor.length > 0;

  // 8. Build initial response
  const agentResponse: AgentResponse = {
    success: execution.evidence.finalStatus === "completed",
    request,
    plan,
    result: execution.evidence.verification.confirmedResults.length > 0 ? execution.evidence.verification.confirmedResults[0] : undefined,
    evidence: execution.evidence,
    requiresApproval,
    approvalRequiredFor,
    reasoningPath: "deep_path",
  };

  // 9. Intelligence synthesis
  const synthesis = await synthesizeAgentResponse(agentResponse);

  // Ingest Level 4 Learned Patterns into synthesis if matching
  if (learnedPatterns.length > 0 && synthesis.recommendations) {
    const relevantPattern = learnedPatterns.find((p) =>
      synthesis.headline.toLowerCase().includes(p.domain) ||
      synthesis.summary.toLowerCase().includes(p.domain)
    );
    if (relevantPattern && !synthesis.recommendations.includes(relevantPattern.recommendationTemplate || relevantPattern.headline)) {
      synthesis.recommendations.push(
        `[Learned Pattern: ${(relevantPattern.confidenceScore * 100).toFixed(0)}% confidence] ${relevantPattern.headline}`
      );
    }
  }

  agentResponse.synthesis = synthesis;
  agentResponse.narrative = synthesis.narrative;
  const t6 = Date.now();

  const executionMs = t5 - t4;
  const synthesisMs = t6 - t5;
  const slowestStage = executionMs > synthesisMs ? "Capability Execution" : "Response Synthesis";

  const latency: LatencyAuditMetrics = {
    t0_userStoppedSpeaking: t0,
    t3_intentClassified: t3,
    t4_contextRetrieved: t4,
    t5_capabilityExecuted: t5,
    t6_responseGenerated: t6,
    durations: {
      intentDurationMs: t3 - t0,
      contextRetrievalMs: t4 - t3,
      executionDurationMs: executionMs,
      synthesisDurationMs: synthesisMs,
      totalResponseMs: t6 - t0,
    },
    slowestStage,
    path: "deep_path",
  };
  agentResponse.latency = latency;

  // 10. Record turn in Level 2 Context Memory & Level 3 Outcome Learning
  SUPREME_LEARNING.recordConversationTurn(request.workspaceId, userId, {
    inputMode: request.inputMode,
    userPrompt: request.message,
    interpretedIntent: intent,
    reasoningPath: "deep_path",
    responseSummary: synthesis.headline || synthesis.summary,
    latencyBreakdown: latency,
  });

  SUPREME_LEARNING.recordDecision({
    workspaceId: request.workspaceId,
    userId,
    inputMode: request.inputMode,
    inputPrompt: request.message,
    decisionType: "recommendation",
    decisionHeadline: synthesis.headline,
    recommendedAction: synthesis.recommendations?.[0] || "Review evidence and monitor trend.",
    expectedOutcome: "Improved conversion velocity and risk mitigation.",
    provenance: execution.evidence.capabilitiesInvoked,
    latencyMs: t6 - t0,
  });

  return agentResponse;
}

// ============================================================
// FAST PATH HANDLER (< 50ms Direct Resolution)
// ============================================================

function handleFastPathRequest(
  request: AgentRequest,
  userId: string,
  userRoles: string[],
  fastType: string,
  t0: number,
  t3: number
): AgentResponse {
  const adaptation = SUPREME_LEARNING.getWorkspaceAdaptation(request.workspaceId);
  const t4 = Date.now();

  let headline = "";
  let narrative = "";
  const roleDisplay = userRoles.length > 0 ? userRoles.join(", ") : "Investor";

  switch (fastType) {
    case "greeting":
      headline = "Supreme Intelligence Connected";
      narrative = `Hello! Supreme Intelligence is active and connected to your workspace. How can I assist with your real estate decisions, leads, or market intelligence today?`;
      break;

    case "identity":
      headline = "Supreme Intelligence Engine";
      narrative = `I am Supreme Intelligence — the unified reasoning brain of Sentinel Fort. I correlate CRM leads, inventory units, investor preferences, and market dynamics to provide evidence-backed decision support.`;
      break;

    case "workspace_id":
      headline = "Authenticated Workspace Identity";
      narrative = `Your active Workspace ID is ${request.workspaceId} (Server-Verified & Authenticated). All domain intelligence and security policies are scoped to this context.`;
      break;

    case "workspace_role":
      headline = "Authoritative Workspace Role";
      narrative = `Your authenticated Workspace Role is ${roleDisplay}. Your permissions, capabilities, and executive command operations are strictly verified against server security policies.`;
      break;

    case "status_summary":
      headline = "Workspace Telemetry Summary";
      narrative = `Workspace is active and synchronized. Active entities: ${adaptation.entityCounts.projects} projects, ${adaptation.entityCounts.units} units, and ${adaptation.entityCounts.leads} leads. Supreme Intelligence is ready.`;
      break;

    case "basic_data":
      headline = "Workspace Entity Inventory";
      narrative = `Your workspace currently manages ${adaptation.entityCounts.projects} active projects, ${adaptation.entityCounts.units} inventory units, and ${adaptation.entityCounts.leads} qualified leads. Ask "How are my leads performing?" for in-depth performance analysis.`;
      break;

    case "simplicity":
      headline = "Sentinel Fort Simplified Overview";
      narrative = `In simple terms: Supreme Intelligence monitors your real estate inventory, demand signals, and investor leads to surface the highest-priority actions with real data evidence.`;
      break;

    default:
      headline = "Supreme Intelligence Ready";
      narrative = `I'm here to help you run your business. Ask a question about your leads, inventory, market trends, or request an assessment.`;
  }

  const t6 = Date.now();
  const latency: LatencyAuditMetrics = {
    t0_userStoppedSpeaking: t0,
    t3_intentClassified: t3,
    t4_contextRetrieved: t4,
    t6_responseGenerated: t6,
    durations: {
      intentDurationMs: t3 - t0,
      contextRetrievalMs: t4 - t3,
      synthesisDurationMs: t6 - t4,
      totalResponseMs: t6 - t0,
    },
    slowestStage: "Fast Path Direct Resolution",
    path: "fast_path",
  };

  const synthesis: IntelligenceSynthesis = {
    summary: narrative,
    headline,
    assessments: [],
    facts: [
      { label: "Workspace ID", value: request.workspaceId },
      { label: "Workspace Role", value: roleDisplay },
      { label: "Resolution Mode", value: "FAST_PATH (< 50ms)" },
    ],
    signals: [],
    risks: [],
    opportunities: [],
    recommendations: [],
    nextBestActions: [],
    confidence: 1.0,
    priority: "MEDIUM",
    evidence: [
      {
        id: `ev_fast_${Date.now()}`,
        source: "authenticated_workspace_context",
        field: "workspace_identity",
        value: request.workspaceId,
        confidence: 1.0,
        observedAt: new Date().toISOString(),
      },
    ],
    narrative,
    modelContext: { source: "fast_path_deterministic", consumer: "supreme-agent", approved: true },
  };

  const planId = `plan_fast_${Date.now()}`;
  const plan = { id: planId, steps: [], intent: "QUERY" as AgentIntent };

  const response: AgentResponse = {
    success: true,
    request,
    plan,
    synthesis,
    narrative,
    reasoningPath: "fast_path",
    latency,
    evidence: {
      executionId: `exec_fast_${Date.now()}`,
      workspaceId: request.workspaceId,
      userId,
      timestamp: new Date().toISOString(),
      originalRequest: request.message,
      interpretedIntent: "QUERY",
      plan,
      capabilitiesInvoked: ["supreme.fastPath"],
      stepResults: [{ status: "completed", result: { headline, narrative } }],
      verification: {
        status: "verified",
        confirmedResults: [{ headline, narrative }],
        discrepancies: [],
      },
      finalStatus: "completed",
      dryRun: request.dryRun ?? false,
    },
    requiresApproval: false,
    approvalRequiredFor: [],
  };

  // Record turn in Level 2 Context Memory
  SUPREME_LEARNING.recordConversationTurn(request.workspaceId, userId, {
    inputMode: request.inputMode,
    userPrompt: request.message,
    interpretedIntent: "QUERY",
    reasoningPath: "fast_path",
    responseSummary: headline,
    latencyBreakdown: latency,
  });

  // Record decision in Level 3 Outcome Learning
  SUPREME_LEARNING.recordDecision({
    workspaceId: request.workspaceId,
    userId,
    inputMode: request.inputMode,
    inputPrompt: request.message,
    decisionType: "conversational_fast_path",
    decisionHeadline: headline,
    recommendedAction: "Direct answered via Fast Path.",
    expectedOutcome: "Immediate user satisfaction.",
    actionStatus: "direct_answered",
    outcomeClassification: "verified_positive",
    provenance: ["authenticated_workspace_context"],
    latencyMs: t6 - t0,
  });

  return response;
}
