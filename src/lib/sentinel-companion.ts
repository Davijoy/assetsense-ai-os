/**
 * SENTINEL FORT — deterministic companion request resolver.
 *
 * The companion is NOT a second intelligence brain. It is a thin presentation
 * layer over the EXISTING Supreme Agent routing. This resolver reuses the real
 * `interpretIntent` + `createPlan` + capability registry to:
 *   - classify the prompt's intent
 *   - select a REAL registered capability (when one confidently matches)
 *   - otherwise return an explicit clarification (never a fabricated answer)
 *
 * It performs NO execution, NO reads, NO data access and NO authorization. It
 * only answers "what would Supreme Intelligence route this to?" so the UI can
 * respond honestly: show the matched capability, its human description, the
 * approval/role posture, and let the user continue into the real intelligence
 * surface. That keeps the companion a doorway — never a fake brain.
 *
 * DEPENDENCY BOUNDARY: this module reads capability METADATA only
 * (./supreme-agent-capability-meta) — never the executable handler registry.
 * The companion lives in the global AppShell, so importing the registry here
 * would pull every intelligence service, repository, orchestrator and
 * server function into the browser bundle for EVERY /app/* route. Real
 * execution reaches the server through the `execute` prop (a server function),
 * not through this module. See tests/appshell-dependency-boundary.test.ts.
 */
import {
  interpretIntent,
  createPlan,
  composeFallbackText,
  isFastPathQuery,
  type AgentIntent,
} from "./supreme-agent-intent";
import {
  AGENT_CAPABILITY_META,
  checkCapabilityRoles,
  classifyApproval,
} from "./supreme-agent-capability-meta";

export type CompanionDisposition = "match" | "needs_clarify" | "unsupported";

export interface CompanionResolution {
  /** Underlying interpreted intent, or null when the message is empty. */
  intent: AgentIntent | null;
  /** Register a REAL registered capability matched the prompt. */
  capabilityId: string | null;
  /** Human label for the selected capability (derived from its id/domain). */
  capabilityLabel: string | null;
  /** The capability's own description (never invented). */
  description: string | null;
  /** Approval/execution handling inferred from the capability metadata. */
  requiresApproval: boolean;
  /** Roles that grant this capability, per its registry declaration. */
  requiredRoles: string[];
  /** Whether the caller's DB-resolved roles satisfy the capability roles. */
  callerAllowed: boolean;
  /** disposition: "match" | "needs_clarify" | "unsupported" */
  disposition: CompanionDisposition;
  /** Human-facing reason for the disposition (used verbatim in the UI). */
  reason: string;
}

/** Deterministic human label from a capability id like "crm.getCRMKPIs". */
export function capabilityName(capabilityId: string): string {
  const token = capabilityId.split(".")[1] ?? capabilityId;
  return token
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Resolve a user's spoken or typed prompt into what the real routing registry
 * understands it as. `userRoles` are the caller's DB-resolved roles — used
 * ONLY to report whether the matched capability is callable, never to grant.
 */
export function resolveCompanionPrompt(
  message: string,
  userRoles: string[] = [],
): CompanionResolution {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      intent: null,
      capabilityId: null,
      capabilityLabel: null,
      description: null,
      requiresApproval: false,
      requiredRoles: [],
      callerAllowed: true,
      disposition: "unsupported",
      reason: "Say what you'd like to explore and I'll route it to the right intelligence.",
    };
  }

  const { intent, entities } = interpretIntent(trimmed);
  entities.workspaceId = undefined;
  const result = createPlan(intent, entities, true);

  if (result.clarification || !result.selectedCapability) {
    return {
      intent,
      capabilityId: null,
      capabilityLabel: null,
      description: null,
      requiresApproval: false,
      requiredRoles: [],
      callerAllowed: true,
      disposition: "needs_clarify",
      // Universal helpful fallback: answer general/conversational/domain
      // questions helpfully instead of a bare rejection. The raw routing
      // reason (result.reason) is preserved in evidence for diagnostics.
      reason: composeFallbackText(trimmed),
    };
  }

  const cap = AGENT_CAPABILITY_META[result.selectedCapability];
  const requiresApproval = classifyApproval(result.selectedCapability) === "required";
  const callerAllowed = cap ? checkCapabilityRoles(cap.requiredRoles, userRoles) : true;

  return {
    intent,
    capabilityId: result.selectedCapability,
    capabilityLabel: capabilityName(result.selectedCapability),
    description: cap?.description ?? null,
    requiresApproval,
    requiredRoles: cap?.requiredRoles ?? [],
    callerAllowed,
    disposition: "match",
    reason: cap
      ? `Routed to ${capabilityName(result.selectedCapability)}. ${
          requiresApproval ? "This action is approval-gated before execution." : "This is a read-only intelligence surface."
        }`
      : "Matched a registered capability but its metadata is missing.",
  };
}

/** True only when at least one capability with dryRunSupport may be surfaced. */
export function companionHasRoutable(
  capabilities: ReadonlyArray<{ id: string }>,
  userRoles: string[],
): boolean {
  return capabilities.some((c) => {
    const cap = AGENT_CAPABILITY_META[c.id];
    return Boolean(cap?.dryRunSupport && canCallRole(cap.requiredRoles, userRoles));
  });
}

/** Role intersection check — presence of at least one shared role. */
export function canCallRole(required: string[], userRoles: string[]): boolean {
  return required.some((r) => userRoles.includes(r));
}

/**
 * Deterministic suggested-prompt for a REAL registered capability id. Maps
 * only capabilities that exist in the registry; unknown ids return null. This
 * is a route suggestion — the prompt is handed back to the real router.
 */
const PROMPT_TEMPLATES: Record<string, string> = {
  "crm.getCRMKPIs": "How are my leads performing?",
  "inventory.getContext": "Which inventory is moving slowly?",
  "market.getContext": "Show me market opportunities.",
  "customer.getContext": "Which customers are at risk?",
  "supreme.orchestrate": "Give me an overall business intelligence assessment.",
  "agent.matchPropertyCustomer": "Find buyers matching this property.",
};

export function suggestedPrompt(capabilityId: string): string | null {
  return PROMPT_TEMPLATES[capabilityId] ?? null;
}

/** A suggested inquiry chip: the prompt to run + the real capability behind it. */
export interface CompanionSuggestion {
  /** The exact prompt handed to the real router when clicked. */
  prompt: string;
  /** Human label for the real registered capability that would run. */
  capability: string;
}

/** Contextual chips for a Fort — real, role-filtered, non-fabricated. */
export function companionSuggestions(
  capabilities: readonly string[],
): CompanionSuggestion[] {
  return capabilities
    .map((id): CompanionSuggestion | null => {
      const prompt = suggestedPrompt(id);
      return prompt ? { prompt, capability: capabilityName(id) } : null;
    })
    .filter((s): s is CompanionSuggestion => s !== null);
}
// =============================================================
// EXECUTION RESULT — the answer a real run produces.
// =============================================================

/** Disposition of a real Agent execution, as surfaced in the companion. */
export type CompanionExecutionDisposition =
  | "match"
  | "needs_clarify"
  | "unsupported"
  | "insufficient_data"
  | "unauthorized";

export interface CompanionExecutionResult {
  disposition: CompanionExecutionDisposition;
  /** True when a capability reached the routing threshold. */
  matched: boolean;
  /** Real registered capability that ran (null when none). */
  capabilityId: string | null;
  /** Human label for the matched capability. */
  capabilityLabel: string | null;
  /** Natural-language answer (synthesized narrative) or honest fallback. */
  answer: string;
  /** True only when the run produced a confirmed, verifiable result. */
  success: boolean;
  /** True only when a capability matched but returned no data. */
  insufficientData: boolean;
  /** True only when the caller's roles did not permit the capability. */
  unauthorized: boolean;
  /** Echo of the original request (evidence, not a claim). */
  question: string;
}

export interface AgentResponseLike {
  success: boolean;
  narrative?: string | null;
  evidence?: {
    finalStatus?: string;
    capabilitiesInvoked?: readonly string[];
    verification?: {
      status?: string;
      discrepancies?: readonly string[];
      confirmedResults?: readonly unknown[];
    };
  };
  synthesis?: { limitations?: readonly unknown[] } | null;
  requiresApproval?: boolean;
}

function resultConfirmed(response: AgentResponseLike): boolean {
  const rows = response.evidence?.verification?.confirmedResults;
  return Boolean(rows && rows.length > 0);
}

/**
 * Pure map from a REAL `processAgentRequest` response to what the companion
 * renders. This is how the companion translates real execution output — it
 * never invents data, capabilities, or answers. Extracted pure so it is
 * deterministically testable without a live capability/service.
 *
 * Dispositions (exactly one is true):
 *   - unsupported         no capability matched / malformed request
 *   - needs_clarify       routing asked the user for more specificity
 *   - insufficient_data   capability matched but returned zero confirmed rows
 *   - unauthorized        caller lacks a role the capability requires
 *   - match               real result exists → narrative rendered
 */
export function mapAgentResponseToCompanionResult(
  response: AgentResponseLike,
  question: string,
): CompanionExecutionResult {
  const questionStr = question.trim();
  const narrative = response.narrative?.trim() ?? "";
  const capabilityId = response.evidence?.capabilitiesInvoked?.[0] ?? null;
  const label = capabilityId ? capabilityName(capabilityId) : null;

  // Unauthorized: capability was invoked/listable but the run failed on roles.
  const stepFailedRoles =
    response.evidence?.verification?.discrepancies?.some((d) =>
      /insufficient_roles/i.test(d),
    ) ?? false;
  if (stepFailedRoles) {
    return {
      disposition: "unauthorized",
      matched: true,
      capabilityId,
      capabilityLabel: label,
      answer:
        narrative ||
        "That capability requires a role your account does not hold. Server-side authorization decides access — nothing here grants it.",
      success: false,
      insufficientData: false,
      unauthorized: true,
      question: capabilityStr(question, capabilityId),
    };
  }

  if (!capabilityId) {
    return {
      disposition: response.narrative ? "needs_clarify" : "unsupported",
      matched: false,
      capabilityId: null,
      capabilityLabel: null,
      answer:
        narrative ||
        "I couldn't route that to a capability. Add a domain — market, inventory, CRM, customer, or a specific property/lead.",
      success: false,
      insufficientData: false,
      unauthorized: false,
      question: questionStr,
    };
  }

  if (!resultConfirmed(response)) {
    return {
      disposition: "insufficient_data",
      matched: true,
      capabilityId,
      capabilityLabel: label,
      answer:
        "I don't have enough data to answer that yet. The capability is real, but no records matched the request.",
      success: false,
      insufficientData: true,
      unauthorized: false,
      question: `${questionStr} [${capabilityId}]`,
    };
  }

  return {
    disposition: "match",
    matched: true,
    capabilityId,
    capabilityLabel: label,
    answer: narrative || "I found the intelligence you asked about, but no narrative was produced.",
    success: true,
    insufficientData: false,
    unauthorized: false,
    question: `${questionStr} [${capabilityId}]`,
  };
}

function capabilityStr(question: string, capabilityId: string | null): string {
  return capabilityId ? `${question} [${capabilityId}]` : question;
}