/**
 * SUPREME AGENT KERNEL — Intelligence Synthesis Brain (post-execution layer)
 * Sentinel Fort — converts raw capability outputs into accurate, explainable,
 * evidence-based answers, suggestions and recommendations.
 *
 * DESIGN PRINCIPLES
 *  - ONE generic post-execution layer. Per-capability pieces only NORMALIZE a
 *    raw result into the canonical IntelligenceSynthesis model; everything
 *    downstream (interpretation, risk/opportunity, recommendations, next best
 *    action, confidence, priority, narrative) is generic and data-driven — no
 *    hardcoded one-response-per-capability templates.
 *  - Evidence-grounded, never confidence theater. Deterministic facts, rules
 *    and thresholds that already exist in production logic remain
 *    authoritative. No benchmarks/targets are invented.
 *  - Raw values are retained internally for evidence; users read the
 *    synthesized answer first.
 *
 * NON-NEGOTIABLE: B1, B3, B4 preserved. Server-side only. DB roles only.
 * No RLS weakening. No client role trust. No DEFAULT_WORKSPACE_ID fallback.
 * No mocks in the production path.
 */

// =============================================================
// PRODUCTION-CONFIGURED THRESHOLDS (copied for transparency; the domain
// services already derive slowMoving/atRisk/opportunities/etc. from these —
// see inventory/service.ts, customer/service.ts, market/service.ts,
// supreme/service.ts. We READ derived outputs, and reference thresholds only
// to describe WHY a value is classified. Nothing new is invented.)
// =============================================================
export const KNOWN_THRESHOLDS = {
  inventory: { slowMovingDays: 90, highValueMultiple: 1.5 },
  customer: { atRiskDays: 60, highValueMultiple: 2.0 },
  market: {
    highDemand: 70,
    lowDemand: 30,
    priceSurgePct: 15,
    priceDropPct: -10,
  },
} as const;

// =============================================================
// CANONICAL INTELLIGENCE SYNTHESIS MODEL
// =============================================================

export type SynthPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SignalSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface SynthesisFact {
  label: string;
  value: string | number;
  /** Human-readable unit (Cr, %, hours, etc.). Optional — omit when absent. */
  unit?: string;
  /** Capability id / source that produced the fact. */
  source: string;
  /** Pointer into the raw evidence (step id or raw path). */
  evidenceRef?: string;
}

export interface SynthesisSignal {
  type: string;
  description: string;
  severity: SignalSeverity;
  /** Polarity label supplied by the normalizer; the generic interpretation
   *  engine partitions signals into risks/opportunities from this. */
  kind: "risk" | "opportunity" | "neutral";
  direction?: "up" | "down" | "flat" | "increasing" | "decreasing";
  source: string;
  confidence: number;
  evidenceRefs?: string[];
}

export type RecommendationType =
  | "investigate"
  | "prioritize"
  | "follow-up"
  | "analyze"
  | "compare"
  | "match"
  | "review"
  | "prepare action"
  | "escalate"
  | "monitor";

export interface SynthesisRecommendation {
  title: string;
  rationale: string;
  expectedImpact: string;
  priority: SynthPriority;
  confidence: number;
  evidenceRefs: string[];
  approvalRequired: boolean;
  suggestedCapability?: string;
  type: RecommendationType;
}

export type LimitationType =
  | "missing_data"
  | "empty_dataset"
  | "missing_benchmark"
  | "unavailable_capability"
  | "insufficient_evidence"
  | "stale_timestamp"
  | "unsupported_inference";

export interface SynthesisLimitation {
  type: LimitationType;
  message: string;
}

export interface NextBestAction {
  label: string;
  rationale?: string;
  /** Only ever references a REAL registered capability id. */
  suggestedCapability?: string;
}

export interface SynthEvidence {
  capability: string;
  sourceService: string;
  workspaceId: string;
  timestamp: string;
  raw: any;
  evidenceRefs: string[];
}

export interface IntelligenceSynthesis {
  summary: string;
  headline?: string;
  /** Evidence-grounded interpretation sentences (generic). */
  assessments?: string[];
  facts: SynthesisFact[];
  signals: SynthesisSignal[];
  /** Signals presenting downside / attention risk. */
  risks: SynthesisSignal[];
  /** Signals presenting upside / actionable opportunity. */
  opportunities: SynthesisSignal[];
  recommendations: SynthesisRecommendation[];
  nextBestActions: NextBestAction[];
  confidence: number;
  priority: SynthPriority;
  evidence: SynthEvidence[];
  limitations: SynthesisLimitation[];
  /** Composed natural-language response (primary answer for users). */
  narrative: string;
  /** Optional model-provider enrichment placeholder (never authoritative). */
  modelContext?: {
    source: "deterministic";
    consumer: string;
    approved: boolean;
  };
}

// =============================================================
// VALUE FORMATTERS (normalization — do NOT alter underlying data)
// =============================================================

/** Indian INR → ₹Cr / ₹Lakh / ₹raw, human readable. */
export function formatINR(value: number | null | undefined): string {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "₹0";
  if (v >= 1e7) {
    return `₹${(v / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
  }
  if (v >= 1e5) {
    return `₹${(v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Lakh`;
  }
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

/** Seconds → human duration ("3h 59m", "42s", "1d 2h"). */
export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.round(Number(seconds ?? 0));
  if (!Number.isFinite(s) || s <= 0) return "n/a";
  if (s < 60) return `${s}s`;
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

/** Percentages → sensible precision, strip trailing zeros. */
export function formatPercent(value: number | null | undefined): string {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v)) return "n/a";
  return `${v.toFixed(2).replace(/\.?0+$/, "")}%`;
}

/** Counts → integer. */
export function formatCount(value: number | null | undefined): string {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v)) return "0";
  return String(Math.round(v));
}

/** Timestamps → readable, or "n/a" when invalid. */
export function formatTimestamp(value: string | Date | null | undefined): string {
  if (!value) return "n/a";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "n/a";
  return d.toISOString();
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// =============================================================
// SHARED HELPERS
// =============================================================

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function arrLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}


// =============================================================
// DOMAIN NORMALIZERS — map a raw capability result into the canonical
// model (facts + signals + limitations). Raw values are NEVER altered; they
// are retained for evidence at the top level.
// =============================================================

interface NormalizedDomain {
  facts: SynthesisFact[];
  signals: SynthesisSignal[];
  limitations: SynthesisLimitation[];
  /** Mapped recommendations from Supreme Intelligence (when available). */
  supremeRecommendations?: SynthesisRecommendation[];
}

/* CRM • crm.getCRMKPIs → { activeLeads, conversionRatePct, pipelineValueInr,
 *   averageResponseSeconds, generatedAt }
 * NOTE: no configured conversion/response benchmark exists in production, so
 * these are REPORTED as-is, never classified good/poor. */
function normalizeCrm(raw: unknown, source: string): NormalizedDomain {
  if (!isRecord(raw)) return { facts: [], signals: [], limitations: [] };
  const activeLeads = num(raw.activeLeads);
  const conversion = num(raw.conversionRatePct);
  const pipeline = num(raw.pipelineValueInr);
  const respSec = num(raw.averageResponseSeconds);

  const facts: SynthesisFact[] = [
    { label: "Active leads", value: formatCount(activeLeads), unit: "leads", source, evidenceRef: "activeLeads" },
    { label: "Conversion rate", value: formatPercent(conversion), unit: "rate", source, evidenceRef: "conversionRatePct" },
    { label: "Pipeline value", value: formatINR(pipeline), unit: "INR", source, evidenceRef: "pipelineValueInr" },
    { label: "Average response time", value: respSec > 0 ? formatDuration(respSec) : "n/a", unit: "duration", source, evidenceRef: "averageResponseSeconds" },
  ];

  const signals: SynthesisSignal[] = [];
  const limitations: SynthesisLimitation[] = [];

  if (activeLeads > 0) {
    signals.push({
      type: "lead_volume",
      description: `Active leads: ${formatCount(activeLeads)}. No configured lead-volume target was found; surfaced as-is.`,
      severity: "info", kind: "neutral", direction: "flat", source, confidence: 0.6,
      evidenceRefs: ["activeLeads"],
    });
    signals.push({
      type: "conversion",
      description: `Conversion is ${formatPercent(conversion)}. No configured conversion target was found, so the system cannot classify this as good or poor.`,
      severity: "info", kind: "neutral", direction: "flat", source, confidence: 0.7,
      evidenceRefs: ["conversionRatePct"],
    });
    signals.push({
      type: "pipeline_value",
      description: `Pipeline value is ${formatINR(pipeline)}. Reported as-is; no configured pipeline benchmark exists.`,
      severity: "info", kind: "neutral", direction: "flat", source, confidence: 0.6,
      evidenceRefs: ["pipelineValueInr"],
    });
    limitations.push({
      type: "missing_benchmark",
      message: "No configured conversion, pipeline or response-time benchmark exists; these values are reported without a good/poor classification.",
    });
  }
  if (respSec > 0) {
    signals.push({
      type: "response_time",
      description: `Average response time is ${formatDuration(respSec)}. No SLA target is configured; this is surfaced for review rather than classified as a breach.`,
      severity: "info", kind: "neutral", direction: "flat", source, confidence: 0.6,
      evidenceRefs: ["averageResponseSeconds"],
    });
  }
  if (activeLeads === 0) {
    limitations.push({
      type: "empty_dataset",
      message: "No active leads were found, so no lead-performance trend can be assessed.",
    });
  }

  return { facts, signals, limitations };
}


/* MARKET • market.getContext → { trends, opportunities, listings, compliance,
 *   priceAnalysis, demandAnalysis, ... } */
function normalizeMarket(raw: unknown, source: string): NormalizedDomain {
  if (!isRecord(raw)) return { facts: [], signals: [], limitations: [] };
  const listings = arrLen(raw.listings);
  const trends = arrLen(raw.trends);
  const opportunities = arrLen(raw.opportunities);
  const compliance = arrLen(raw.compliance);

  const demandAnalysis = isRecord(raw.demandAnalysis) ? raw.demandAnalysis : undefined;
  const overallDemand = demandAnalysis ? num(demandAnalysis.overallDemandIndex) : 0;
  const hasDemand = !!demandAnalysis && overallDemand > 0;

  const facts: SynthesisFact[] = [
    { label: "Market listings", value: formatCount(listings), unit: "listings", source, evidenceRef: "listings" },
    { label: "Market trends", value: formatCount(trends), unit: "trends", source, evidenceRef: "trends" },
    { label: "Opportunities", value: formatCount(opportunities), unit: "opportunities", source, evidenceRef: "opportunities" },
    { label: "Compliance records", value: formatCount(compliance), unit: "records", source, evidenceRef: "compliance" },
  ];

  const signals: SynthesisSignal[] = [];
  const limitations: SynthesisLimitation[] = [];

  if (hasDemand) {
    const hi = KNOWN_THRESHOLDS.market.highDemand;
    const lo = KNOWN_THRESHOLDS.market.lowDemand;
    if (overallDemand >= hi) {
      signals.push({ type: "demand", description: `Overall demand index is ${formatCount(overallDemand)} (at/above the ${hi} production threshold), indicating strong demand.`, severity: "medium", kind: "opportunity", direction: "increasing", source, confidence: 0.75, evidenceRefs: ["demandAnalysis"] });
    } else if (overallDemand <= lo) {
      signals.push({ type: "demand", description: `Overall demand index is ${formatCount(overallDemand)} (at/below the ${lo} production threshold), indicating weak demand.`, severity: "medium", kind: "risk", direction: "decreasing", source, confidence: 0.75, evidenceRefs: ["demandAnalysis"] });
    } else {
      signals.push({ type: "demand", description: `Overall demand index is ${formatCount(overallDemand)}, within the configured normal band (${lo}–${hi}).`, severity: "info", kind: "neutral", direction: "flat", source, confidence: 0.6, evidenceRefs: ["demandAnalysis"] });
    }
  }
  if (opportunities > 0) {
    signals.push({ type: "opportunity", description: `${formatCount(opportunities)} market opportunities were detected by the market service.`, severity: "medium", kind: "opportunity", direction: "up", source, confidence: 0.7, evidenceRefs: ["opportunities"] });
  }
  const complianceArr = Array.isArray(raw.compliance) ? (raw.compliance as unknown[]) : [];
  const riskRecords = complianceArr.filter(
    (c) => isRecord(c) && (c.status === "revoked" || c.status === "under_review" || c.recordType === "violation"),
  );
  if (riskRecords.length > 0) {
    signals.push({ type: "compliance", description: `${formatCount(riskRecords.length)} compliance record(s) carry a risk status (revoked/under_review/violation).`, severity: "high", kind: "risk", direction: "down", source, confidence: 0.8, evidenceRefs: ["compliance"] });
  }
  if (listings === 0) {
    limitations.push({ type: "empty_dataset", message: "No market listing data was found; pricing and demand signals cannot be assessed." });
  }

  return { facts, signals, limitations };
}


/* INVENTORY • inventory.getContext → { inventorySummary, levels,
 *   slowMovingList, slowMovingCount, highValueUnsold (count), ageingBuckets } */
function normalizeInventory(raw: unknown, source: string): NormalizedDomain {
  if (!isRecord(raw)) return { facts: [], signals: [], limitations: [] };
  const summary = isRecord(raw.inventorySummary) ? raw.inventorySummary : (isRecord(raw.summary) ? raw.summary : {});
  const total = num(summary.total ?? arrLen(raw.levels));
  const available = num(summary.available);
  const sold = num(summary.sold);
  const availabilityPct = num(summary.availabilityPct);
  const totalValue = num(summary.totalValue);

  const slowList = Array.isArray(raw.slowMovingList) ? (raw.slowMovingList as unknown[]) : [];
  const slowCount = num(raw.slowMovingCount ?? slowList.length);
  const highValueCount = num(raw.highValueUnsold);

  const facts: SynthesisFact[] = [
    { label: "Inventory units", value: formatCount(total), unit: "units", source, evidenceRef: "inventorySummary.total" },
    { label: "Available", value: formatCount(available), unit: "units", source, evidenceRef: "inventorySummary.available" },
    { label: "Sold", value: formatCount(sold), unit: "units", source, evidenceRef: "inventorySummary.sold" },
    { label: "Availability", value: total > 0 ? formatPercent(availabilityPct) : "n/a", unit: "rate", source, evidenceRef: "inventorySummary.availabilityPct" },
    { label: "Slow-moving units", value: formatCount(slowCount), unit: "units", source, evidenceRef: slowList.length ? "slowMovingList" : "slowMovingCount" },
    { label: "High-value unsold", value: formatCount(highValueCount), unit: "units", source, evidenceRef: "highValueUnsold" },
  ];
  if (totalValue > 0) facts.push({ label: "Total inventory value", value: formatINR(totalValue), unit: "INR", source, evidenceRef: "inventorySummary.totalValue" });

  const signals: SynthesisSignal[] = [];
  const limitations: SynthesisLimitation[] = [];

  if (slowCount > 0) {
    signals.push({
      type: "slow_moving",
      description: `${formatCount(slowCount)} slow-moving unit(s) (available for more than ${KNOWN_THRESHOLDS.inventory.slowMovingDays} days, per the configured threshold).`,
      severity: "medium", kind: "risk", direction: "down", source, confidence: 0.75,
      evidenceRefs: slowList.length ? ["slowMovingList"] : ["slowMovingCount"],
    });
  }
  if (highValueCount > 0) {
    signals.push({
      type: "high_value_unsold",
      description: `${formatCount(highValueCount)} high-value unsold unit(s) (priced above ${KNOWN_THRESHOLDS.inventory.highValueMultiple}x the workspace average, per the configured threshold).`,
      severity: "medium", kind: "opportunity", direction: "flat", source, confidence: 0.7,
      evidenceRefs: ["highValueUnsold"],
    });
  }
  if (total > 0 && available > 0) {
    signals.push({
      type: "availability",
      description: `Availability is ${formatPercent(availabilityPct)} (${formatCount(available)} of ${formatCount(total)} units). No availability target is configured; reported as-is.`,
      severity: "info", kind: "neutral", direction: "flat", source, confidence: 0.6,
      evidenceRefs: ["inventorySummary.availabilityPct"],
    });
  }
  if (total === 0) {
    limitations.push({ type: "empty_dataset", message: "No inventory data was found; slow-moving and high-value risk cannot be assessed." });
  }

  return { facts, signals, limitations };
}


/* CUSTOMER • customer.getContext → { customerSummary, levels,
 *   atRiskCustomers, highValueCustomers, engagementBuckets } */
function normalizeCustomer(raw: unknown, source: string): NormalizedDomain {
  if (!isRecord(raw)) return { facts: [], signals: [], limitations: [] };
  const summary = isRecord(raw.customerSummary) ? raw.customerSummary : (isRecord(raw.summary) ? raw.summary : {});
  const total = num(summary.total ?? arrLen(raw.levels));
  const active = num(summary.active);
  const inactive = num(summary.inactive);
  const avgEngagement = num(summary.avgEngagementScore);

  const atRiskList = Array.isArray(raw.atRiskCustomers) ? (raw.atRiskCustomers as unknown[]) : [];
  const highValueList = Array.isArray(raw.highValueCustomers) ? (raw.highValueCustomers as unknown[]) : [];

  const facts: SynthesisFact[] = [
    { label: "Customers", value: formatCount(total), unit: "customers", source, evidenceRef: "customerSummary.total" },
    { label: "Active", value: formatCount(active), unit: "customers", source, evidenceRef: "customerSummary.active" },
    { label: "Inactive", value: formatCount(inactive), unit: "customers", source, evidenceRef: "customerSummary.inactive" },
    { label: "At-risk customers", value: formatCount(atRiskList.length), unit: "customers", source, evidenceRef: "atRiskCustomers" },
    { label: "High-value customers", value: formatCount(highValueList.length), unit: "customers", source, evidenceRef: "highValueCustomers" },
  ];
  if (total > 0) facts.push({ label: "Average engagement score", value: formatCount(avgEngagement), unit: "score", source, evidenceRef: "customerSummary.avgEngagementScore" });

  const signals: SynthesisSignal[] = [];
  const limitations: SynthesisLimitation[] = [];

  if (atRiskList.length > 0) {
    signals.push({
      type: "at_risk_customer",
      description: `${formatCount(atRiskList.length)} customer(s) flagged at-risk (no activity for more than ${KNOWN_THRESHOLDS.customer.atRiskDays} days, per the configured threshold).`,
      severity: "high", kind: "risk", direction: "down", source, confidence: 0.8,
      evidenceRefs: ["atRiskCustomers"],
    });
  }
  if (highValueList.length > 0) {
    signals.push({
      type: "high_value_customer",
      description: `${formatCount(highValueList.length)} high-value customer(s) identified (value above ${KNOWN_THRESHOLDS.customer.highValueMultiple}x the workspace average, per the configured threshold).`,
      severity: "medium", kind: "opportunity", direction: "flat", source, confidence: 0.7,
      evidenceRefs: ["highValueCustomers"],
    });
  }
  if (total > 0) {
    signals.push({
      type: "engagement",
      description: `Average engagement score is ${formatCount(avgEngagement)}. No engagement benchmark is configured here; reported as-is.`,
      severity: "info", kind: "neutral", direction: "flat", source, confidence: 0.6,
      evidenceRefs: ["customerSummary.avgEngagementScore"],
    });
  }
  if (inactive > 0) {
    signals.push({
      type: "inactive_customer",
      description: `${formatCount(inactive)} customer(s) are inactive. Reported as-is; no inactivity benchmark is configured.`,
      severity: "low", kind: "neutral", direction: "down", source, confidence: 0.6,
      evidenceRefs: ["customerSummary.inactive"],
    });
  }
  if (total === 0 && atRiskList.length === 0) {
    limitations.push({
      type: "empty_dataset",
      message: "Customer risk data is currently empty, so no customer-risk conclusion can be drawn.",
    });
  }

  return { facts, signals, limitations };
}


/* SUPREME • supreme.orchestrate → { orchestration: OrchestrationResult } */
function normalizeSupreme(raw: unknown, source: string): NormalizedDomain {
  const orchestration = isRecord(raw) && isRecord(raw.orchestration) ? (raw.orchestration as Record<string, unknown>) : {};
  const decisions = arrLen(orchestration.decisions);
  const recommendations = arrLen(orchestration.recommendations);
  const correlations = arrLen(orchestration.correlations);
  const approvalRequests = arrLen(orchestration.approvalRequests);
  const context = isRecord(orchestration.context) ? (orchestration.context as Record<string, unknown>) : {};
  const evidenceTrail = Array.isArray(context.evidenceTrail) ? context.evidenceTrail.length : 0;

  const facts: SynthesisFact[] = [
    { label: "Coordinated decisions", value: formatCount(decisions), unit: "decisions", source, evidenceRef: "orchestration.decisions" },
    { label: "Coordinated recommendations", value: formatCount(recommendations), unit: "recommendations", source, evidenceRef: "orchestration.recommendations" },
    { label: "Cross-domain correlations", value: formatCount(correlations), unit: "correlations", source, evidenceRef: "orchestration.correlations" },
    { label: "Actions requiring approval", value: formatCount(approvalRequests), unit: "actions", source, evidenceRef: "orchestration.approvalRequests" },
  ];
  if (evidenceTrail > 0) facts.push({ label: "Evidence trail", value: formatCount(evidenceTrail), unit: "items", source, evidenceRef: "orchestration.context.evidenceTrail" });

  const signals: SynthesisSignal[] = [];
  const limitations: SynthesisLimitation[] = [];
  const supremeRecommendations: SynthesisRecommendation[] = [];

  if (decisions > 0) {
    signals.push({ type: "coordinated_decisions", description: `${formatCount(decisions)} coordinated decision(s) were produced by Supreme Intelligence.`, severity: "medium", kind: "neutral", direction: "flat", source, confidence: 0.7, evidenceRefs: ["orchestration.decisions"] });
  }
  if (correlations > 0) {
    signals.push({ type: "cross_domain_correlation", description: `${formatCount(correlations)} cross-domain correlation(s) were detected.`, severity: "medium", kind: "opportunity", direction: "flat", source, confidence: 0.75, evidenceRefs: ["orchestration.correlations"] });
  }
  if (recommendations > 0) {
    signals.push({ type: "coordinated_recommendation", description: `${formatCount(recommendations)} coordinated recommendation(s) require review.`, severity: "medium", kind: "neutral", direction: "flat", source, confidence: 0.7, evidenceRefs: ["orchestration.recommendations"] });
  }
  if (approvalRequests > 0) {
    signals.push({ type: "approval_required", description: `${formatCount(approvalRequests)} action(s) require human approval before execution.`, severity: "high", kind: "risk", direction: "flat", source, confidence: 0.8, evidenceRefs: ["orchestration.approvalRequests"] });
  }

  // Map real coordinated recommendations into the canonical shape (verbatim
  // title/confidence/priority from the orchestrator — no rewording).
  if (Array.isArray(orchestration.recommendations)) {
    for (const rec of orchestration.recommendations as unknown[]) {
      if (!isRecord(rec) || typeof rec.title !== "string") continue;
      const prio = String(rec.priority ?? "LOW").toUpperCase() as SynthPriority;
      supremeRecommendations.push({
        title: rec.title,
        rationale: typeof rec.businessReason === "string" ? rec.businessReason : "",
        expectedImpact: typeof rec.expectedImpact === "string" ? rec.expectedImpact : "",
        priority: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(prio) ? prio : "MEDIUM",
        confidence: clamp01(num(rec.confidence)),
        evidenceRefs: ["orchestration.recommendations"],
        approvalRequired: isRecord(rec.approvalRequirement) ? !!rec.approvalRequirement.required : approvalRequests > 0,
        suggestedCapability: undefined,
        type: "review",
      });
    }
  }


  if (correlations === 0) {
    limitations.push({
      type: "unsupported_inference",
      message: "No qualifying cross-domain correlation was found by Supreme Intelligence; none is reported rather than fabricating one.",
    });
  }
  if (decisions === 0 && recommendations === 0 && correlations === 0) {
    limitations.push({
      type: "empty_dataset",
      message: "Supreme Intelligence returned no decisions, correlations or recommendations; no cross-domain conclusion can be drawn.",
    });
  }

  return { facts, signals, limitations, supremeRecommendations };
}

/* MATCH • agent.matchPropertyCustomer → { matches, needsClarification } */
function normalizeMatch(raw: unknown, source: string): NormalizedDomain {
  if (!isRecord(raw)) return { facts: [], signals: [], limitations: [] };
  const needsClarification = raw.needsClarification === true;
  if (needsClarification) {
    return {
      facts: [],
      signals: [],
      limitations: [{
        type: "insufficient_evidence",
        message: typeof raw.clarification === "string" && raw.clarification
          ? raw.clarification
          : "A specific property reference is required before buyers can be matched.",
      }],
    };
  }
  const matches = arrLen(raw.matches);
  if (matches === 0) {
    return {
      facts: [],
      signals: [],
      limitations: [{ type: "empty_dataset", message: "No matching buyers were found for the property; none are reported by the system." }],
    };
  }
  return {
    facts: [{ label: "Matching buyers", value: formatCount(matches), unit: "buyers", source, evidenceRef: "matches" }],
    signals: [{ type: "buyer_match", description: `${formatCount(matches)} matching buyer(s) were identified for the property.`, severity: "info", kind: "opportunity", direction: "up", source, confidence: 0.7, evidenceRefs: ["matches"] }],
    limitations: [],
  };
}


// =============================================================
// GENERIC INTERPRETATION — partitions signals into risks/opportunities.
// Deterministic and data-driven: risk = downside signals, opportunity =
// upside signals, neutral stays informational.
// =============================================================

function partitionRisksOpportunities(signals: SynthesisSignal[]): {
  risks: SynthesisSignal[];
  opportunities: SynthesisSignal[];
} {
  const risks = signals.filter((s) => s.kind === "risk");
  const opportunities = signals.filter((s) => s.kind === "opportunity");
  return { risks, opportunities };
}

// =============================================================
// PRIORITY + CONFIDENCE (derived from evidence, not invented)
// =============================================================

function derivePriority(signals: SynthesisSignal[]): SynthPriority {
  if (signals.some((s) => s.severity === "critical")) return "CRITICAL";
  if (signals.some((s) => s.severity === "high")) return "HIGH";
  if (signals.some((s) => s.severity === "medium")) return "MEDIUM";
  return "LOW";
}

function deriveConfidence(
  factsCount: number,
  signals: SynthesisSignal[],
  limitations: SynthesisLimitation[],
): number {
  const emptyCount = limitations.filter((l) => l.type === "empty_dataset").length;
  const noBenchmark = limitations.filter((l) => l.type === "missing_benchmark").length;
  const unsupported = limitations.filter((l) => l.type === "unsupported_inference").length;
  const avgSignalConf =
    signals.length > 0 ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length : 0.5;
  const coverage = factsCount > 0 ? Math.min(1, factsCount / 4) : 0;
  let c = 0.6 + (coverage * 0.2) + ((avgSignalConf - 0.5) * 0.2);
  c -= 0.2 * emptyCount;
  c -= 0.1 * noBenchmark;
  c -= 0.15 * unsupported;
  return clamp01(c);
}

// =============================================================
// RECOMMENDATION + NEXT BEST ACTION ENGINE (evidence-grounded)
// Only fires when the normalized data/rules support it. Never fabricates.
// =============================================================

/** Registered capability ids available for suggestedCapability. */
export const REGISTERED_CAPABILITIES = [
  "crm.getCRMKPIs",
  "market.getContext",
  "inventory.getContext",
  "customer.getContext",
  "agent.matchPropertyCustomer",
  "supreme.orchestrate",
] as const;

function buildRecommendationsAndActions(
  normalized: NormalizedDomain[],
  signals: SynthesisSignal[],
): { recommendations: SynthesisRecommendation[]; nextBestActions: NextBestAction[] } {
  const recommendations: SynthesisRecommendation[] = [];
  const nextBestActions: NextBestAction[] = [];

  for (const sig of signals) {
    // Inventory: slow-moving units → find matching buyers (real capability).
    if (sig.type === "slow_moving") {
      recommendations.push({
        title: "Find matching buyer/customer pool for slow-moving units",
        rationale: "Slow-moving inventory ties up working capital; matching it to an existing buyer/customer pool is the configured next step.",
        expectedImpact: "Free idle inventory and improve cash conversion.",
        priority: "MEDIUM",
        confidence: sig.confidence,
        evidenceRefs: sig.evidenceRefs ?? [],
        approvalRequired: false,
        suggestedCapability: "agent.matchPropertyCustomer",
        type: "match",
      });
      nextBestActions.push({ label: "Find matching buyers for these slow-moving units.", suggestedCapability: "agent.matchPropertyCustomer", rationale: "Inventory is moving slowly (>90 days)." });
    }
    // Customer: at-risk → review + follow-up.
    if (sig.type === "at_risk_customer") {
      recommendations.push({
        title: "Review at-risk customers and plan follow-up",
        rationale: "Customers flagged at-risk (>60 days inactive) should be reviewed before revenue is lost.",
        expectedImpact: "Reduce avoidable churn among flagged customers.",
        priority: "HIGH",
        confidence: sig.confidence,
        evidenceRefs: sig.evidenceRefs ?? [],
        approvalRequired: false,
        suggestedCapability: "customer.getContext",
        type: "review",
      });
      nextBestActions.push({ label: "Review at-risk customers.", suggestedCapability: "customer.getContext", rationale: "At-risk customers were identified." });
    }
    // Market: opportunities → review.
    if (sig.type === "opportunity") {
      recommendations.push({
        title: "Review detected market opportunities",
        rationale: "The market service flagged opportunities worth evaluating against available inventory and buyers.",
        expectedImpact: "Capture demand while it is actionable.",
        priority: "MEDIUM",
        confidence: sig.confidence,
        evidenceRefs: sig.evidenceRefs ?? [],
        approvalRequired: false,
        suggestedCapability: "market.getContext",
        type: "review",
      });
      nextBestActions.push({ label: "Review market opportunities.", suggestedCapability: "market.getContext", rationale: "Opportunities were detected." });
    }
    // CRM: active leads → prioritize follow-up.
    if (sig.type === "lead_volume") {
      nextBestActions.push({ label: "Run an overall Supreme assessment.", suggestedCapability: "supreme.orchestrate", rationale: "Active leads exist; synthesize them across domains." });
    }
  }

  // Deduplicate next-best-actions by suggestedCapability.
  const seen = new Set<string>();
  const uniqueActions = nextBestActions.filter((a) => {
    const key = a.suggestedCapability ?? a.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Merge any orchestrator-provided recommendations (from normalizeSupreme).
  for (const n of normalized) {
    if (n.supremeRecommendations) recommendations.push(...n.supremeRecommendations);
  }

  return { recommendations, nextBestActions: uniqueActions };
}

// =============================================================
// NATURAL-LANGUAGE RESPONSE COMPOSER — concise, executive, evidence-based.
// Never raw JSON, no fake certainty, no generic filler.
// =============================================================

export function composeNarrative(s: IntelligenceSynthesis): string {
  const out: string[] = [];

  if (s.headline) out.push(s.headline);

  if (s.facts.length > 0) {
    out.push("Key facts");
    out.push(s.facts.map((f) => `- ${f.label}: ${f.value}`).join("\n"));
  }

  if (s.assessments && s.assessments.length > 0) {
    out.push("Assessment");
    out.push(s.assessments.map((a) => `- ${a}`).join("\n"));
  }

  if (s.risks.length > 0) {
    out.push("Risks");
    out.push(s.risks.map((r) => `- ${r.description}`).join("\n"));
  }

  if (s.opportunities.length > 0) {
    out.push("Opportunities");
    out.push(s.opportunities.map((o) => `- ${o.description}`).join("\n"));
  }

  if (s.recommendations.length > 0) {
    out.push("Recommended next actions");
    out.push(s.recommendations.map((r) => `- ${r.title}${r.suggestedCapability ? ` (${r.suggestedCapability})` : ""}`).join("\n"));
  } else if (s.nextBestActions.length > 0) {
    out.push("Recommended next action");
    out.push(s.nextBestActions.map((n) => `- ${n.label}`).join("\n"));
  }

  if (s.limitations.length > 0) {
    const unique = Array.from(new Map(s.limitations.map((l) => [l.message, l])).values());
    out.push("Notes / limitations");
    out.push(unique.map((l) => `- ${l.message}`).join("\n"));
  }

  const confNote = s.confidence >= 0.5 ? "moderate-to-high" : "low";
  out.push(`Confidence: ${Math.round(s.confidence * 100)}% (${confNote}, derived from available evidence). Evidence is retained for review.`);

  return out.join("\n\n");
}

// =============================================================
// MODEL PROVIDER ABSTRACTION — optional future LLM enhancement.
// Deterministic facts/rules/evidence remain authoritative; the model may ONLY
// help phrase/summarize/compare. It never fabricates facts.
// =============================================================

export interface SynthesisModelEnhancer {
  /** Optional: rephrase the narrative. Deterministic result is always kept. */
  enhance?: (synthesis: IntelligenceSynthesis) => Promise<IntelligenceSynthesis>;
}

/** Injected hook — empty by default. Correct conclusions never depend on it. */
export let synthesisModelEnhancer: SynthesisModelEnhancer | null = null;
export function setSynthesisModelEnhancer(enhancer: SynthesisModelEnhancer | null): void {
  synthesisModelEnhancer = enhancer;
}

// =============================================================
// TOP-LEVEL ENTRY — normalize a set of executed capability results into one
// canonical IntelligenceSynthesis.
// =============================================================

export interface CapabilityResultEntry {
  capability: string;
  sourceService: string;
  workspaceId: string;
  timestamp: string;
  result: unknown;
}

const DOMAIN_LABEL: Record<string, string> = {
  "crm.getCRMKPIs": "CRM",
  "market.getContext": "market",
  "inventory.getContext": "inventory",
  "customer.getContext": "customer",
  "agent.matchPropertyCustomer": "buyer/property matching",
  "supreme.orchestrate": "overall business",
};

function dispatchNormalizer(capability: string, raw: unknown, source: string): NormalizedDomain {
  if (capability === "crm.getCRMKPIs") return normalizeCrm(raw, source);
  if (capability === "market.getContext") return normalizeMarket(raw, source);
  if (capability === "inventory.getContext") return normalizeInventory(raw, source);
  if (capability === "customer.getContext") return normalizeCustomer(raw, source);
  if (capability === "supreme.orchestrate") return normalizeSupreme(raw, source);
  if (capability === "agent.matchPropertyCustomer") return normalizeMatch(raw, source);
  // Unknown capability → no fabricated facts, only a limitation.
  return {
    facts: [],
    signals: [],
    limitations: [{ type: "unavailable_capability", message: `Capability "${capability}" produced no supported intelligence; its output is not synthesized.` }],
  };
}

export async function synthesizeCapabilityResults(entries: CapabilityResultEntry[]): Promise<IntelligenceSynthesis> {
  const normalized: NormalizedDomain[] = [];
  const evidence: SynthEvidence[] = [];

  for (const e of entries) {
    const n = dispatchNormalizer(e.capability, e.result, e.capability);
    normalized.push(n);
    evidence.push({
      capability: e.capability,
      sourceService: e.sourceService,
      workspaceId: e.workspaceId,
      timestamp: e.timestamp,
      raw: e.result,
      evidenceRefs: [e.capability],
    });
  }

  const facts = normalized.flatMap((n) => n.facts);
  const signals = normalized.flatMap((n) => n.signals);
  const limitations = normalized.flatMap((n) => n.limitations);

  const { risks, opportunities } = partitionRisksOpportunities(signals);
  const { recommendations, nextBestActions } = buildRecommendationsAndActions(normalized, signals);
  const priority = derivePriority(signals);
  const confidence = deriveConfidence(facts.length, signals, limitations);

  // Generic, evidence-grounded interpretation ("what happened / why it matters").
  const assessments: string[] = [];
  const domains = Array.from(new Set(entries.map((e) => DOMAIN_LABEL[e.capability] ?? e.capability)));
  const domainWord = domains[0] ?? "business";
  if (facts.length > 0) {
    assessments.push(
      `The ${domainWord} state is summarised above from live data; classification is only applied where a configured benchmark exists.`,
    );
  }
  if (limitations.some((l) => l.type === "missing_benchmark")) {
    assessments.push("Where no benchmark/target is configured, values are surfaced as-is rather than labelled good or poor.");
  }

  const headline = facts.length > 0
    ? `Here is the ${domainWord} intelligence summary based on the data returned.`
    : `No ${domainWord} intelligence could be summarised from the returned data.`;

  const synthesis: IntelligenceSynthesis = {
    summary: headline,
    headline,
    assessments,
    facts,
    signals,
    risks,
    opportunities,
    recommendations,
    nextBestActions,
    confidence,
    priority,
    evidence,
    limitations,
    narrative: "",
    modelContext: { source: "deterministic", consumer: "supreme-agent", approved: true },
  };

  synthesis.narrative = composeNarrative(synthesis);

  // Optional model enhancement (never changes facts/rules/evidence).
  if (synthesisModelEnhancer?.enhance) {
    try {
      return await synthesisModelEnhancer.enhance(synthesis);
    } catch {
      return synthesis; // Deterministic result is always authoritative.
    }
  }
  return synthesis;
}

// =============================================================
// AGENT-RESPONSE ADAPTER — synthesize an AgentResponse (processor output).
// =============================================================

export interface AgentResponseLike {
  evidence?: {
    stepResults?: Array<{
      capability: string;
      status: string;
      result?: unknown;
      error?: string;
      id?: string;
    }>;
    workspaceId?: string;
    timestamp?: string;
    finalStatus?: string;
  };
}

function sourceServiceFor(capability: string): string {
  if (capability === "crm.getCRMKPIs") return "crm.functions / capability handler";
  if (capability === "market.getContext") return "market.service / market.repository";
  if (capability === "inventory.getContext") return "inventory.service / bi.functions";
  if (capability === "customer.getContext") return "customer.service / customer.functions";
  if (capability === "supreme.orchestrate") return "supreme.service / orchestrator";
  if (capability === "agent.matchPropertyCustomer") return "capability handler";
  return "capability handler";
}

export async function synthesizeAgentResponse(response: AgentResponseLike): Promise<IntelligenceSynthesis> {
  const stepResults = response?.evidence?.stepResults ?? [];
  const workspaceId = response?.evidence?.workspaceId ?? "";
  const ts = response?.evidence?.timestamp ?? new Date().toISOString();

  const entries: CapabilityResultEntry[] = [];
  let hadFailedStep = false;
  for (const step of stepResults) {
    if (step.status === "completed" && step.result !== undefined) {
      entries.push({
        capability: step.capability,
        sourceService: sourceServiceFor(step.capability),
        workspaceId,
        timestamp: ts,
        result: step.result,
      });
    } else {
      hadFailedStep = true;
    }
  }

  const synthesis = await synthesizeCapabilityResults(entries);

  // Surface execution failures as a limitation (never silently dropped).
  if (hadFailedStep) {
    synthesis.limitations.push({
      type: "insufficient_evidence",
      message: "One or more execution steps did not complete; their results were excluded from this synthesis.",
    });
  }

  // Refresh narrative to include the failure limitation.
  synthesis.narrative = composeNarrative(synthesis);
  // Deterministic flag: business conclusions never depended on a model.
  synthesis.modelContext = { source: "deterministic", consumer: "supreme-agent", approved: true };
  return synthesis;
}

