/**
 * SUPREME AGENT KERNEL — Intent Interpreter + Task Planner (Registry-Driven)
 * Sentinel Fort
 *
 * NON-NEGOTIABLE: B1, B3, B4 preserved. Server-side only. DB roles only.
 *
 * DEPENDENCY BOUNDARY: routing is scored purely from capability METADATA
 * (./supreme-agent-capability-meta), never from the executable registry. The
 * planner needs intents, subject vocabulary, priority, domain and plan
 * dependencies — all of which are metadata. Importing the handler registry here
 * would drag every intelligence service, repository and server function into
 * any client module that routes a prompt (e.g. the Sentinel Companion in the
 * global AppShell). Handlers are resolved later, server-side, by the processor.
 * See tests/appshell-dependency-boundary.test.ts.
 */
import { AGENT_CAPABILITY_META } from "./supreme-agent-capability-meta";

// =============================================================
// INTENT INTERPRETER
// =============================================================

import type { AgentDomain, AgentIntent, AgentReasoningMode } from "./supreme-agent-types";
// Re-export shared types for backwards-compatible importers.
export type { AgentDomain, AgentIntent, AgentReasoningMode } from "./supreme-agent-types";

export interface AgentEntities {
  workspaceId?: string;
  /** Tokenized subject terms extracted from the message. */
  topicTokens: string[];
  /** Normalized multi-word subject phrases found in the message. */
  subjectPhrases: string[];
  /** Deterministic reasoning mode classified from the user's question structure.
   *  Does NOT replace intent; intent = what the user wants, reasoning mode =
   *  what kind of intellectual work the question demands.
   */
  reasoningMode: AgentReasoningMode;
}

/** Interprets a user message into an AgentIntent + semantic entities */
export function interpretIntent(message: string): { intent: AgentIntent; entities: AgentEntities } {
    const entities: AgentEntities = {
    workspaceId: undefined,
    topicTokens: [],
    subjectPhrases: [],
    reasoningMode: "RETRIEVE",
  };

  if (message.length === 0) return { intent: "QUERY", entities };

  // Extract workspaceId if present
  const wsMatch = message.match(/workspace\s+([a-f0-9-]{36})/i);
  if (wsMatch) {
    entities.workspaceId = wsMatch[1];
  }
  const cleanMsg = message.replace(wsMatch ? wsMatch[0] : "", "").trim().toLowerCase();

  // ---- Extract topic tokens (word-boundary tokens) ----
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "to", "of", "and", "for",
    "with", "in", "on", "at", "by", "as", "that", "this", "it", "but", "or",
    "not",
  ]);
  const tokens = cleanMsg
    .split(/\W+/)
    .filter((t) => t.length > 0 && !stopWords.has(t))
    .map((t) => t.toLowerCase());
  entities.topicTokens = tokens;

  // ---- Extract subject phrases (multi-word sequences) ----
  const phrasePatterns: Record<string, RegExp> = {
    market: /\b(market|trend|opportunity|demand|price|pricing)\b/gi,
    inventory: /\b(inventory|unit|stock|unsold|available)\b/gi,
    crm: /\b(crm|lead|pipeline|conversion|deal)\b/gi,
    customer: /\b(customer|buyer|contact|engagement|churn)\b/gi,
    supreme: /\b(supreme|overall|assessment|business|cross domain)\b/gi,
  };
  for (const [, pattern] of Object.entries(phrasePatterns)) {
    const matches = cleanMsg.match(pattern);
    if (matches) {
      entities.subjectPhrases.push(matches[0].toLowerCase());
    }
  }
  // ---- Determine reasoning mode (clause/token-aware, NOT naive substring matching) ----
  entities.reasoningMode = determineReasoningMode(cleanMsg, entities.subjectPhrases);


  // ---- Intent classification ----
  // 1. EXECUTE only for explicit action verbs, NOT substrings like "performing"
  const executePatterns = [/\b(run|execute|launch|initiate|start|deploy)\b/];
  if (executePatterns.some((pat) => pat.test(cleanMsg))) return { intent: "EXECUTE", entities };

  // 2. MATCH if property/customer matching language
  if (/\b(match|matching)\b/.test(cleanMsg)) return { intent: "MATCH", entities };

  // 3. RECOMMEND if recommendation/suggestion language
  if (/\b(recommend|suggest|advise)\b/.test(cleanMsg)) return { intent: "RECOMMEND", entities };

  // 4. SEARCH if find/search language
  if (/\b(find|search|look.for)\b/.test(cleanMsg)) return { intent: "SEARCH", entities };

  // 5. ANALYZE if analysis language
  if (/\b(analyze|analysis|assess|evaluate)\b/.test(cleanMsg)) return { intent: "ANALYZE", entities };

  // 6. QUERY for question shapes + get-with-domain + show + how-is
  const hasQuestionWord = /\b(how|what|which|why|where|when)\b/.test(cleanMsg);
  const getWithDomain = /\bget\b\s+(market|inventory|crm|customer|supreme)\b/i.test(cleanMsg);
  const hasShowPattern = /\b(show.me|list|display|view)\b/.test(cleanMsg);
  const hasHowIs = /\bhow.is\b/.test(cleanMsg);

  if (hasQuestionWord || getWithDomain || hasShowPattern || hasHowIs) {
    return { intent: "QUERY", entities };
  }

  // DEFAULT: QUERY
  return { intent: "QUERY", entities };
}


// =============================================================
// TASK PLANNER (Registry-Driven)
// =============================================================

export interface AgentStep {
  id: string;
  capability: string;
  domain: "market" | "inventory" | "customer" | "crm" | "supreme";
  intent: "READ" | "SEARCH" | "MATCH" | "FILTER" | "SCORE";
  arguments: any;
  approvalRequired: boolean;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
}

/** Execution plan produced by the task planner */
export interface AgentPlan {
  id: string;
  createdAt: string;
  steps: AgentStep[];
  intent: AgentIntent;
  status:
    | "pending"
    | "planning"
    | "executing"
    | "waiting_for_approval"
    | "verifying"
    | "completed"
    | "failed"
    | "partial";
}

/** Lightweight morphological normalizer for subject matching. */
function normalizeTerm(t: string): string {
  const l = t.toLowerCase();
  if (l.length <= 3) return l;
  if (l.endsWith("ies")) return l.slice(0, -3) + "y";
  if (l.endsWith("oes")) return l.slice(0, -2);
  if (l.endsWith("es")) return l.slice(0, -2);
  if (l.endsWith("s")) return l.slice(0, -1);
  return l;
}

/**
 * Routing confidence threshold.
 * A capability must score >= this to be selected.
 * If no capability reaches this threshold, return clarification.
 * market.getContext is NEVER a universal fallback.
 */
const ROUTING_THRESHOLD = 3;

/** Result of routing — either a selected capability or a clarification request */
export interface PlanResult {
  plan: AgentPlan;
  intent: AgentIntent;
  selectedCapability: string | null;
  /** True if no capability reached the routing threshold */
  clarification: boolean;
  /** Human-readable explanation for the fallback case */
  reason?: string;
}

/**
 * Registry-driven task planner.
 *
 * Selection algorithm:
 * 1. Score each capability against the interpreted intent + subject vocabulary
 * 2. intentScore: 3 if capability.intents includes the intent, else 0
 * 3. subjectTokenOverlap: count of capability.subjects in entities.topicTokens
 * 4. subjectPhraseOverlap: count of capability.subjectPhrases in entities.subjectPhrases
 * 5. specificity: capability.priority ?? 1
 * 6. Rank candidates by combined score descending
 * 7. Select the highest-scoring candidate above ROUTING_THRESHOLD
 * 8. Build steps from capability.planDependencies (or single step if none)
 * 9. Fallback: if none reach threshold, return clarification (NEVER market)
 */
export function createPlan(
  intent: AgentIntent,
  entities: AgentEntities,
  dryRun: boolean = false
): PlanResult {
  const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = new Date().toISOString();

  // SCORE each candidate capability against intent + subject overlap
  type Candidate = {
    id: string;
    intentScore: number;
    overlap: number;
    specificity: number;
  };

  const candidates: Candidate[] = Object.entries(AGENT_CAPABILITY_META).map(
    ([id, cap]) => {
      let intentScore = 0;
      if (cap.intents.includes(intent)) intentScore += 3;
      const normTokens = (entities.topicTokens || []).map(normalizeTerm);
      const tokenOverlap = cap.subjects.filter((t) =>
        normTokens.includes(normalizeTerm(t))
      ).length;
      const phraseOverlap = (cap.subjectPhrases || []).filter((p) =>
        (entities.subjectPhrases || []).includes(p.toLowerCase())
      ).length;
      const overlap = tokenOverlap + phraseOverlap;
      const specificity = cap.priority ?? 1;
      return { id, intentScore, overlap, specificity };
    }
  );

  // Rank by combined score descending
  candidates.sort(
    (a, b) =>
      b.intentScore + b.overlap + b.specificity -
      (a.intentScore + a.overlap + a.specificity)
  );

  // Pick the top candidate above threshold
  const top = candidates[0];
  const combinedScore =
    (top?.intentScore ?? 0) + (top?.overlap ?? 0) + (top?.specificity ?? 0);

  // Selection requires BOTH confidence threshold AND subject-domain evidence
  // (intent match alone must never auto-select — unknown topics must clarify).
  if (top && top.overlap >= 1 && combinedScore >= ROUTING_THRESHOLD) {
    const chosen = top.id;
    const cap = AGENT_CAPABILITY_META[chosen];
    if (!cap) {
      return {
        plan: { id: planId, createdAt, steps: [], intent, status: "failed" },
        intent,
        selectedCapability: null,
        clarification: true,
        reason: "Selected capability not found in registry",
      };
    }

    // Build steps from planDependencies, or single step
    const steps: AgentStep[] = [];
    if (cap.planDependencies && cap.planDependencies.length > 0) {
      for (const dep of cap.planDependencies) {
        const depCap = AGENT_CAPABILITY_META[dep];
        if (depCap) {
          steps.push({
            id: `step-${Date.now()}-${dep}`,
            capability: dep,
            domain: depCap.domain,
            intent: "READ",
            arguments: { workspaceId: entities.workspaceId, dryRun },
            approvalRequired: false,
            status: "pending",
          });
        }
      }
      // Final step is the capability itself
      steps.push({
        id: `step-final-${Date.now()}`,
        capability: chosen,
        domain: cap.domain,
        intent: "SCORE",
        arguments: { workspaceId: entities.workspaceId, dryRun },
        approvalRequired: false,
        status: "pending",
      });
    } else {
      steps.push({
        id: `step-1-${Date.now()}`,
        capability: chosen,
        domain: cap.domain,
        intent: "READ",
        arguments: { workspaceId: entities.workspaceId, dryRun },
        approvalRequired: false,
        status: "pending",
      });
    }

    const plan: AgentPlan = {
      id: planId,
      createdAt,
      steps,
      intent,
      status: "pending",
    };

    return {
      plan,
      intent,
      selectedCapability: chosen,
      clarification: false,
    };
  }

  // Fallback: no capability matched — NEVER defaults to market.getContext
  const clarificationPlan: AgentPlan = {
    id: planId,
    createdAt,
    steps: [],
    intent,
    status: "failed",
  };

  return {
    plan: clarificationPlan,
    intent,
    selectedCapability: null,
    clarification: true,
    reason:
      "No capability matched the request. " +
      "Please clarify the domain or intent (e.g., CRM, market, inventory, customer, or supreme intelligence).",
    };
}

// =============================================================
// REASONING MODE DETERMINATION
// =============================================================

/** Classifies the user's question into a reasoning mode based on clause-aware
 *  analysis of the question structure. Does NOT replace intent; intent = what
 *  the user wants, reasoning mode = what kind of intellectual work the question
 *  demands. Uses token/phrase patterns, NOT naive substring matching.
 */
function determineReasoningMode(cleanMsg: string, subjectPhrases: string[]): AgentReasoningMode {
  const msg = cleanMsg;

  // DIAGNOSE: causal/why questions that ask for cause/effect
  const diagnosePatterns = [
    /\b(why|cause|reason|behind|driven by)\b/,
    /\b(poor|low|weak|slow|high|strong|increase|decrease)\b/,
  ];
  if (diagnosePatterns.some((pat) => pat.test(msg))) {
    // But exclude: "how are my leads performing" -> RETRIEVE, not DIAGNOSE
    // "performing" alone must NEVER be DIAGNOSE
    if (!(/\bperforming\b/.test(msg) && !/\b(why|cause|reason)\b/.test(msg))) {
      return "DIAGNOSE";
    }
  }

  // ANALYZE: examine, assess, evaluate patterns
  const analyzePatterns = [
    /\b(analyze|analysis|assess|evaluate|examine|review|appraise)\b/,
  ];
  if (analyzePatterns.some((pat) => pat.test(msg))) {
    return "ANALYZE";
  }

  // RECOMMEND: suggestion/advisory patterns
  const recommendPatterns = [
    /\b(should|recommend|suggest|advice|guidance|what ought|what should)\b/,
  ];
  if (recommendPatterns.some((pat) => pat.test(msg))) {
    return "RECOMMEND";
  }

  // DECIDE: action decision patterns
  const decidePatterns = [
    /\b(which action|decide|decision|choose|option|rank)\b/,
  ];
  if (decidePatterns.some((pat) => pat.test(msg))) {
    return "DECIDE";
  }

  // CORRELATE: relationship/detection patterns
  const correlatePatterns = [
    /\b(related|correlation|connection|link|impact|effect|vs|compare)\b/,
  ];
  if (correlatePatterns.some((pat) => pat.test(msg))) {
    return "CORRELATE";
  }

  // RETRIEVE: default for state-of-being questions, "how is", "show me"
  // Check for retrieve-like patterns last (they are the most common)
  const retrieveIndicators = [
    /\b(how is|how are|show me|what is|current|present|status)\b/,
    /\b(leads?|pipeline|conversion|inventory|customers?|market|performance)\b/,
  ];
  const isRetrieveLike = retrieveIndicators.some((pat) => pat.test(msg));

  // If the message is a question starting with "how" or "what" about a known domain,
  // it's RETRIEVE unless it has DIAGNOSE/ANALYZE/CORRELATE markers
  if (/^\s*(how|what)\b/.test(msg) || subjectPhrases.some((p) => /\b(leads?|pipeline|conversion|inventory|customer)\b/.test(p))) {
    if (!/\b(why|cause|reason|analyze|analysis|related|correlation|should|which action|decide|choose|option|rank)\b/i.test(msg)) {
      return "RETRIEVE";
    }
  }

  // Fallback: RETRIEVE for any remaining query-type messages
  return "RETRIEVE";
}

// ============================================================
// END OF REASONING MODE DETERMINATION
// ============================================================

// =============================================================
// UNIVERSAL HELPFUL FALLBACK — out-of-context / conversational
// requests get a natural, helpful answer instead of a bare rejection.
//
// Deterministic, vocabulary-driven (NOT one-off phrase templates),
// no execution, no data access, no RBAC change and no fabrication.
// It is consumed by sentinel-companion (client, metadata-only) and by
// the request processor (server) so that BOTH text and voice surface
// the same helpful behaviour when routing cannot confidently match a
// capability. Routing itself is NEVER modified by this module.
// =============================================================

export type FallbackTone =
  | "conversational"
  | "advisory"
  | "ambiguous"
  | "unsupported_action"
  | "generic";

const FALLBACK_GREETINGS = [
  "hello", "hi", "hey", "howdy", "yo", "thanks", "thank you", "thankyou",
  "welcome", "good morning", "good afternoon", "good evening", "good night",
  "bye", "goodbye", "namaste", "hola",
];

const FALLBACK_HELP_PHRASES = [
  "what can you do", "what do you do", "how do you work", "what are you",
  "who are you", "how can you help", "help me", "help", "capabilities",
  "get started", "guide me", "show me around",
];

/** Domain vocabulary used ONLY for advisory guidance. No data is read. */
const FALLBACK_DOMAIN_TERMS = [
  "crm", "lead", "pipeline", "conversion", "deal", "opportunity",
  "market", "demand", "price", "pricing", "trend",
  "inventory", "unit", "stock", "unsold", "project",
  "customer", "buyer", "prospect", "churn", "risk",
  "property", "land", "plot", "apartment", "villa", "house", "builder", "listing",
  "rent", "rental", "rera", "registration", "loan", "budget",
  "supreme", "intelligence", "assessment", "business", "overall",
];

/** Advisory language — answer generally, then guide toward context. */
const FALLBACK_ADVISORY_TERMS = [
  "connect", "how to", "steps", "process", "guide", "advice", "tips",
  "documents", "understand", "explain",
];

/** Write/execute action language. Never executed; surfaced honestly. */
const FALLBACK_ACTION_TERMS = [
  "send", "email", "call", "message", "whatsapp", "sms", "contact",
  "update", "create", "add", "insert", "delete", "remove", "cancel",
  "approve", "reject", "schedule", "book", "pay", "invest", "launch",
  "publish", "notify", "invite", "assign", "reach out",
];

const FALLBACK_QUESTION_RE =
  /\b(how|what|which|why|when|where|can|could|should|would|is|are|does)\b/i;

function fallbackHasWord(message: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(message);
}

function fallbackExtractTopics(message: string): string[] {
  const m = message.toLowerCase();
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const term of FALLBACK_DOMAIN_TERMS) {
    if (seen.has(term)) continue;
    if (fallbackHasWord(m, term)) {
      seen.add(term);
      topics.push(term);
    }
    if (topics.length >= 2) break;
  }
  return topics;
}

/**
 * Classify an out-of-context request into a helpful fallback tone so the
 * response can be matched to what the user actually asked.
 */
export function classifyFallback(message: string): FallbackTone {
  const m = message.trim().toLowerCase();
  if (!m) return "generic";

  const topics = fallbackExtractTopics(m);
  const hasDomain = topics.length > 0;
  const hasQuestion = FALLBACK_QUESTION_RE.test(m);
  const hasAction = FALLBACK_ACTION_TERMS.some((t) => fallbackHasWord(m, t));

  // 1. Help / capability request → conversational intro.
  if (FALLBACK_HELP_PHRASES.some((p) => m.includes(p)) && !hasDomain) {
    return "conversational";
  }
  // 2. Greeting small-talk (no domain, no action, short message).
  if (
    !hasDomain &&
    !hasAction &&
    m.split(/\s+/).length <= 12 &&
    FALLBACK_GREETINGS.some((g) => fallbackHasWord(m, g))
  ) {
    return "conversational";
  }
  // 3. Explicit write/execute language with no routable domain → explain the
  //    boundary and the closest useful alternative. Never fake success.
  if (hasAction && !hasDomain) {
    return "unsupported_action";
  }
  // 4. Any domain-bearing question or advisory phrasing → general guidance.
  if (
    hasDomain &&
    (hasQuestion || FALLBACK_ADVISORY_TERMS.some((t) => m.includes(t)))
  ) {
    return "advisory";
  }
  // 5. Question shape but no domain → ambiguous clarification.
  if (hasQuestion) {
    return "ambiguous";
  }
  // 6. Domain vocabulary present as a statement → advisory guidance.
  if (hasDomain) {
    return "advisory";
  }
  return "generic";
}

/** Compose the helpful natural-language response for a fallback tone. */
export function composeFallbackText(message: string): string {
  switch (classifyFallback(message)) {
    case "conversational":
      return (
        "I'm here to help you run your business. I can research and explain your CRM " +
        "leads and pipeline, market opportunities, inventory, customer posture, or run an " +
        "overall Supreme Intelligence assessment with evidence — all server-verified and " +
        "workspace-scoped. Try asking: \"How are my leads performing?\" or " +
        "\"Give me an overall business intelligence assessment.\""
      );
    case "advisory": {
      const topics = fallbackExtractTopics(message);
      const topic = topics.join(" and ") || "real estate";
      return (
        `That's a good question on ${topic}. Let me give you a considered, general view ` +
        `rather than turn you away: for workspace-specific analysis I need the actual context ` +
        `— a project, property, unit, lead or customer — so I can use live, workspace-scoped ` +
        `data and explain the reasoning with evidence. For example you could ask ` +
        `"Find investors matching this property" or "How are my leads performing?". ` +
        `Any outreach or update step beyond analysis is approval-gated and uses the ` +
        `application's real communication modules.`
      );
    }
    case "ambiguous":
      return (
        "I want to make sure I point you at the right intelligence. Are you asking about " +
        "CRM leads and pipeline, market opportunities, inventory, customers, an overall " +
        "Supreme assessment, or a specific property/unit/lead? A useful example would be: " +
        "\"How are my leads performing?\"."
      );
    case "unsupported_action":
      return (
        "That describes an action I don't execute directly — external sends, updates and " +
        "launches are approval-gated and depend on a real, configured communication or " +
        "campaign module, so I will never pretend a message was sent. What I CAN do right " +
        "now is the underlying research and preparation with evidence: matching customers " +
        "to a property, drafting a campaign, or analysing impact. Would you like me to " +
        "prepare it? Nothing would be sent or updated without your approval."
      );
    case "generic":
    default:
      return (
        "I want to help, but I couldn't match that request to a domain. I work with CRM " +
        "leads and pipeline, market opportunities, inventory, customers and overall " +
        "Supreme Intelligence — or a specific property/unit/lead. Try \"Which inventory " +
        "is slow moving?\" or \"How are my leads performing?\"."
      );
  }
}

// =============================================================
// FAST PATH DETECTOR
// =============================================================

export interface FastPathMatch {
  isFast: boolean;
  type?: "greeting" | "identity" | "workspace_id" | "workspace_role" | "status_summary" | "basic_data" | "simplicity";
}

/**
 * Evaluates whether a query is a Fast Path conversational, factual, status, or identity inquiry.
 * Fast Path answers immediately with live workspace context in < 50ms without invoking the full
 * multi-domain planning pipeline.
 */
export function isFastPathQuery(message: string): FastPathMatch {
  const m = message.trim().toLowerCase().replace(/[.,!?;:]+/g, " ");
  if (!m) return { isFast: false };

  // 1. Greetings & Conversational check (e.g. "Hello, supreme. How are you doing today?", "Hi there", "Good morning")
  const isGreeting =
    /\b(hi|hello|hey|good\s+(morning|afternoon|evening)|howdy|greetings)\b/i.test(m) ||
    /\bhow\s+are\s+you(\s+doing)?\b/i.test(m) ||
    /\b(how\s+do\s+you\s+do|nice\s+to\s+meet\s+you)\b/i.test(m);

  // Exclude explicit analytical queries that mention specific domain keywords
  const hasDomainKeyword = /\b(inventory|crm|leads|pipeline|market|pricing|revenue|conversion|properties|units|deals)\b/i.test(m);

  if (isGreeting && !hasDomainKeyword) {
    return { isFast: true, type: "greeting" };
  }

  // 2. Identity / Capabilities ("Who are you?", "What can you do?", "Tell me about yourself")
  if (
    /\b(who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|tell\s+me\s+about\s+yourself|what\s+is\s+supreme|how\s+do\s+you\s+work|what\s+is\s+your\s+name)\b/i.test(m)
  ) {
    return { isFast: true, type: "identity" };
  }

  // 3. Workspace Role / Identity ("What is my role?", "What is my workspace role?", "Who am I?")
  if (
    /\b(role|persona|permissions)\b/i.test(m) ||
    /\b(who\s+am\s+i|what\s+is\s+my\s+role|show\s+my\s+role)\b/i.test(m)
  ) {
    return { isFast: true, type: "workspace_role" };
  }

  // 4. Workspace ID ("What is my workspace ID?", "Which workspace am I in?")
  if (
    /\bworkspace\s+id\b/i.test(m) ||
    /\b(what\s+is\s+my\s+workspace|which\s+workspace(\s+am\s+i\s+in)?|show\s+my\s+workspace)\b/i.test(m)
  ) {
    return { isFast: true, type: "workspace_id" };
  }

  // 5. Status / Summary ("What is the current status?", "Give me a summary")
  if (
    /\b(current\s+status|system\s+status|workspace\s+status|give\s+me\s+a\s+summary|workspace\s+summary|quick\s+status)\b/i.test(m)
  ) {
    return { isFast: true, type: "status_summary" };
  }

  // 6. Basic Data Counts ("What projects do I have?", "What leads do I have?")
  if (
    /\b(what\s+projects\s+do\s+i\s+have|how\s+many\s+projects|what\s+leads\s+do\s+i\s+have|how\s+many\s+leads|list\s+my\s+projects|show\s+my\s+projects|show\s+my\s+leads|count\s+of\s+leads)\b/i.test(m)
  ) {
    return { isFast: true, type: "basic_data" };
  }

  // 7. Simplicity ("Explain this simply", "Make it simple")
  if (
    /\b(explain\s+this\s+simply|make\s+it\s+simple|summarize\s+simply|in\s+simple\s+words)\b/i.test(m)
  ) {
    return { isFast: true, type: "simplicity" };
  }

  return { isFast: false };
}