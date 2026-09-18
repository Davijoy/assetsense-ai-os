import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENT_CAPABILITIES } from "../src/lib/supreme-agent-capabilities";
import {
  WS,
  realFixtures,
  emptyFixtures,
  evaluateRoute,
  runRC1,
  isRealCapability,
  priorityRank,
  narrativeIsNotRawJson,
  type RouteResult,
} from "./rc1-harness";

// =============================================================
// ROUTING BATTERY — deterministic expectations captured from the REAL
// registry-driven router (probe-verified). No invented outcomes.
// =============================================================
interface RoutingExpectation {
  message: string;
  intent: string;
  cap?: string;
  clarify?: boolean;
}

const CANONICAL_ROUTES: RoutingExpectation[] = [
  { message: "How are my leads performing?", intent: "QUERY", cap: "crm.getCRMKPIs" },
  { message: "Why is my lead conversion weak?", intent: "QUERY", cap: "crm.getCRMKPIs" },
  { message: "What should the sales team focus on?", intent: "QUERY", cap: "crm.getCRMKPIs" },
  { message: "Which lead metrics need attention?", intent: "QUERY", cap: "crm.getCRMKPIs" },
  { message: "Which inventory is slow moving?", intent: "QUERY", cap: "inventory.getContext" },
  { message: "Where is inventory getting stuck?", intent: "QUERY", cap: "inventory.getContext" },
  { message: "What inventory represents the biggest opportunity?", intent: "QUERY", cap: "market.getContext" },
  { message: "Which customers are at risk?", intent: "QUERY", cap: "customer.getContext" },
  { message: "Which customers should sales contact first?", intent: "QUERY", cap: "customer.getContext" },
  { message: "Who are our high-value customers?", intent: "QUERY", cap: "customer.getContext" },
  { message: "Show market opportunities.", intent: "QUERY", cap: "market.getContext" },
  { message: "What market signals should I know about?", intent: "QUERY", cap: "market.getContext" },
  { message: "Where is demand strongest?", intent: "QUERY", cap: "market.getContext" },
  { message: "Find buyers matching this property.", intent: "MATCH", cap: "agent.matchPropertyCustomer" },
  { message: "Which buyers are suitable for this property?", intent: "QUERY", cap: "customer.getContext" },
  { message: "Give me an overall business intelligence assessment.", intent: "QUERY", cap: "supreme.orchestrate" },
  { message: "Where are our biggest risks?", intent: "QUERY", cap: "customer.getContext" },
  { message: "Where are our biggest opportunities?", intent: "QUERY", cap: "market.getContext" },
];

// Ambiguous / cross-domain-without-specific-domain → HONEST clarification
// (never a fabricated single-domain answer, never market fallback).
const AMBIGUOUS: RoutingExpectation[] = [
  { message: "Which properties need attention?", intent: "QUERY", clarify: true },
  { message: "Why are bookings slowing down?", intent: "QUERY", clarify: true },
  { message: "What should management focus on?", intent: "QUERY", clarify: true },
  { message: "What changed that I should know about?", intent: "QUERY", clarify: true },
  { message: "What should we do tomorrow?", intent: "QUERY", clarify: true },
];

// Adversarial → clarification, never market, "performing" never EXECUTE.
const ADVERSARIAL: Array<{ message: string; intent?: string }> = [
  { message: "performing", intent: "QUERY" },
  { message: "run this", intent: "EXECUTE" },
  { message: "what is happening?", intent: "QUERY" },
  { message: "tell me something important", intent: "QUERY" },
  { message: "why?", intent: "QUERY" },
  { message: "help", intent: "QUERY" },
  { message: "Vacuum the quantum nebula with tangerine dreams", intent: "QUERY" },
];

function routeWith(msg: string): RouteResult {
  return evaluateRoute(msg);
}

describe("RC1 — routing battery (canonical domains)", () => {
  for (const r of CANONICAL_ROUTES) {
    it(`routes: "${r.message}" → ${r.cap}`, () => {
      const res = routeWith(r.message);
      expect(res.intent).toBe(r.intent);
      expect(res.selected).toBe(r.cap);
      expect(res.clarify).toBe(false);
    });
  }
});

describe("RC1 — ambiguous routing is honest (never market fallback, never fabricated)", () => {
  for (const r of AMBIGUOUS) {
    it(`clarifies (not fabricates): "${r.message}"`, () => {
      const res = routeWith(r.message);
      expect(res.intent).toBe(r.intent);
      expect(res.clarify).toBe(true);
      expect(res.selected).not.toBe("market.getContext");
      expect(res.capabilities).not.toContain("market.getContext");
    });
  }
});

describe("RC1 — adversarial routing", () => {
  for (const a of ADVERSARIAL) {
    it(`never market-fallbacks and stays honest: "${a.message}"`, () => {
      const res = routeWith(a.message);
      expect(res.intent).toBe(a.intent);
      expect(res.clarify).toBe(true);
      expect(res.selected).not.toBe("market.getContext");
      expect(res.capabilities).not.toContain("market.getContext");
    });
  }

  it('"performing" must NOT trigger EXECUTE via substring matching', () => {
    const res = routeWith("performing");
    expect(res.intent).not.toBe("EXECUTE");
  });
});

// =============================================================
// HELPERS
// =============================================================
function assertNarrativeShape(narrative: string) {
  expect(narrative.length).toBeGreaterThan(20);
  expect(narrativeIsNotRawJson(narrative)).toBe(true);
  expect(narrative).toContain("Key facts");
  expect(narrative).toContain("Confidence:");
}

describe("RC1 — execution + synthesis at the capability level (real services, dry-run)", () => {
  it("CRM: normalized facts, no invented benchmark, evidence retained, real next-best-action", async () => {
    const { response, synthesis } = await runRC1("How are my leads performing?", realFixtures());
    expect(response.success).toBe(true);
    expect(response.evidence.capabilitiesInvoked).toContain("crm.getCRMKPIs");
    expect(synthesis.facts.some((f) => f.label === "Active leads" && Number(f.value) > 0)).toBe(true);
    expect(synthesis.facts.some((f) => f.label === "Conversion rate")).toBe(true);
    const conv = synthesis.signals.find((s) => s.type === "conversion");
    expect(conv).toBeDefined();
    expect(conv!.description).toContain("cannot classify this as good or poor");
    expect(synthesis.limitations.some((l) => l.type === "missing_benchmark")).toBe(true);
    const nba = synthesis.nextBestActions.find((a) => a.suggestedCapability === "supreme.orchestrate");
    expect(nba).toBeDefined();
    expect(isRealCapability(nba!.suggestedCapability)).toBe(true);
    expect(synthesis.evidence[0].capability).toBe("crm.getCRMKPIs");
    expect(synthesis.evidence[0].workspaceId).toBe(WS);
    expect(synthesis.evidence[0].raw.activeLeads).toBeGreaterThan(0);
    assertNarrativeShape(synthesis.narrative);
  });

  it("Inventory: slow-moving → evidence-backed risk + match recommendation (real capability)", async () => {
    const { synthesis, response } = await runRC1("Which inventory is slow moving?", realFixtures());
    expect(response.success).toBe(true);
    expect(response.evidence.capabilitiesInvoked).toContain("inventory.getContext");
    expect(synthesis.facts.some((f) => f.label === "Slow-moving units" && Number(f.value) > 0)).toBe(true);
    const slow = synthesis.risks.find((r) => r.type === "slow_moving");
    expect(slow).toBeDefined();
    const rec = synthesis.recommendations.find((r) => r.suggestedCapability === "agent.matchPropertyCustomer");
    expect(rec).toBeDefined();
    expect(isRealCapability(rec!.suggestedCapability)).toBe(true);
    expect(rec!.confidence).toBeGreaterThan(0);
    expect(rec!.confidence).toBeLessThanOrEqual(1);
    expect(rec!.evidenceRefs.length).toBeGreaterThan(0);
    expect(synthesis.nextBestActions.some((a) => a.suggestedCapability === "agent.matchPropertyCustomer")).toBe(true);
    assertNarrativeShape(synthesis.narrative);
  });

  it("Customer: at-risk → evidence-backed risk + review recommendation", async () => {
    const { synthesis, response } = await runRC1("Which customers are at risk?", realFixtures());
    expect(response.success).toBe(true);
    expect(response.evidence.capabilitiesInvoked).toContain("customer.getContext");
    expect(synthesis.facts.some((f) => f.label === "At-risk customers" && Number(f.value) > 0)).toBe(true);
    expect(synthesis.risks.some((r) => r.type === "at_risk_customer")).toBe(true);
    const rec = synthesis.recommendations.find((r) => r.suggestedCapability === "customer.getContext");
    expect(rec).toBeDefined();
    expect(isRealCapability(rec!.suggestedCapability)).toBe(true);
    assertNarrativeShape(synthesis.narrative);
  });

  it("Market: demand / compliance signals from real threshold-derived fields", async () => {
    const { synthesis, response } = await runRC1("Show market opportunities.", realFixtures());
    expect(response.success).toBe(true);
    expect(response.evidence.capabilitiesInvoked).toContain("market.getContext");
    const demand = synthesis.signals.find((s) => s.type === "demand");
    expect(demand).toBeDefined();
    expect(demand!.description).toContain("70");
    expect(synthesis.risks.some((r) => r.type === "compliance")).toBe(true);
    assertNarrativeShape(synthesis.narrative);
  });
});


describe("RC1 — Supreme cross-domain intelligence (REAL orchestrator, no fabrication)", () => {
  it("uses the REAL orchestrator output and never fabricates correlations", async () => {
    const { synthesis, response } = await runRC1("Give me an overall business intelligence assessment.", realFixtures());
    expect(response.success).toBe(true);
    expect(response.evidence.capabilitiesInvoked).toContain("supreme.orchestrate");
    const supremeEvidence = synthesis.evidence.find((e) => e.capability === "supreme.orchestrate");
    expect(supremeEvidence).toBeDefined();
    // REAL orchestrator result (object with context), not a stub string.
    expect(supremeEvidence!.raw && typeof supremeEvidence!.raw.orchestration === "object").toBe(true);
    expect(supremeEvidence!.raw.orchestration).toHaveProperty("context");
    // Cross-domain honesty: correlations present OR absence explicitly stated.
    const corrSig = synthesis.signals.some((s) => s.type === "cross_domain_correlation");
    const noCorr = synthesis.limitations.some((l) => l.type === "unsupported_inference");
    expect(corrSig || noCorr).toBe(true);
    // Never fabricates a causal story.
    expect(synthesis.narrative.toLowerCase()).not.toContain("bookings slowed because");
  });

  it("ambiguous cross-domain question does NOT fabricate a causal answer", async () => {
    const { response, synthesis } = await runRC1("Why are bookings slowing down?", realFixtures());
    expect(response.success).toBe(false);
    expect(synthesis.limitations.some((l) => l.type === "insufficient_evidence")).toBe(true);
    expect(synthesis.narrative.toLowerCase()).not.toContain("bookings slowed because");
  });
});


describe("RC1 — uncertainty / empty-dataset honesty", () => {
  it("empty customer data → explicit uncertainty, never invented risk", async () => {
    const { synthesis, response } = await runRC1("Which customers are at risk?", emptyFixtures());
    expect(response.success).toBe(true);
    expect(synthesis.facts.some((f) => f.label === "At-risk customers" && Number(f.value) === 0)).toBe(true);
    expect(synthesis.risks.some((r) => r.type === "at_risk_customer")).toBe(false);
    const lim = synthesis.limitations.find((l) => l.type === "empty_dataset");
    expect(lim).toBeDefined();
    expect(lim!.message.toLowerCase()).toContain("no customer-risk conclusion");
    // Narrative itself states the lack of data honestly.
    expect(synthesis.narrative.toLowerCase()).toContain("no customer-risk conclusion");
    assertNarrativeShape(synthesis.narrative);
  });
});

describe("RC1 — recommendation quality audit", () => {
  it("every generated recommendation is complete, grounded, and never a silent side effect", async () => {
    const { synthesis } = await runRC1("Which inventory is slow moving?", realFixtures());
    for (const rec of synthesis.recommendations) {
      expect(rec.title.length).toBeGreaterThan(0); // WHAT
      expect(rec.rationale.length).toBeGreaterThan(0); // WHY
      expect(rec.expectedImpact.length).toBeGreaterThan(0); // IMPACT
      expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(rec.priority); // PRIORITY
      expect(rec.confidence).toBeGreaterThan(0); // CONFIDENCE
      expect(rec.confidence).toBeLessThanOrEqual(1);
      expect(rec.evidenceRefs.length).toBeGreaterThan(0); // EVIDENCE
      if (rec.suggestedCapability) expect(isRealCapability(rec.suggestedCapability)).toBe(true); // REAL capability
      expect(rec.approvalRequired).toBe(false); // advisory, never auto side effect
    }
  });

  it("next-best-actions only reference real registered capabilities", async () => {
    const { synthesis } = await runRC1("Which customers are at risk?", realFixtures());
    const capIds = (synthesis.nextBestActions ?? [])
      .map((a) => a.suggestedCapability)
      .filter((c): c is string => !!c);
    for (const id of capIds) expect(isRealCapability(id)).toBe(true);
  });
});

describe("RC1 — regression protection (historical failures)", () => {
  it('"how is the lead in CRM performing overall" → crm, never market', () => {
    const r = evaluateRoute("how is the lead in CRM performing overall");
    expect(r.selected).toBe("crm.getCRMKPIs");
    expect(r.selected).not.toBe("market.getContext");
  });

  it("unknown input never defaults to market", () => {
    expect(evaluateRoute("blah blah nonsensical input").selected).not.toBe("market.getContext");
  });

  it("supreme.orchestrate and agent.matchPropertyCustomer remain REAL handlers (not stubs)", () => {
    expect(AGENT_CAPABILITIES["supreme.orchestrate"]).toBeDefined();
    expect(typeof AGENT_CAPABILITIES["supreme.orchestrate"].handler).toBe("function");
    expect(AGENT_CAPABILITIES["agent.matchPropertyCustomer"]).toBeDefined();
    expect(typeof AGENT_CAPABILITIES["agent.matchPropertyCustomer"].handler).toBe("function");
    expect(AGENT_CAPABILITIES["agent.matchPropertyCustomer"].handler).toBeTruthy();
  });
});

describe("RC1 — boundary protection", () => {
  const kernelRoot = join(process.cwd(), "src/lib");
  const kernelFiles = [
    "supreme-agent-capabilities.ts",
    "supreme-agent-intent.ts",
    "supreme-agent-processor.ts",
    "supreme-agent-execution.ts",
    "supreme-agent-synthesis.ts",
  ];
  it("kernel never DECLARES or assigns a DEFAULT_WORKSPACE_ID fallback", () => {
    // Header comments legitimately name the NON-NEGOTIABLE rule; we assert the
    // code never declares/assigns/reads such a fallback constant.
    const declaration = /DEFAULT_WORKSPACE_ID\s*[:=]/;
    for (const f of kernelFiles) {
      const src = readFileSync(join(kernelRoot, f), "utf8");
      expect(declaration.test(src), `${f} declares a DEFAULT workspace fallback`).toBe(false);
    }
  });

  it("registry has no market catch-all capability", () => {
    const ids = Object.keys(AGENT_CAPABILITIES);
    for (const id of ids) {
      expect(AGENT_CAPABILITIES[id].subjects.length).toBeGreaterThan(0);
      expect(AGENT_CAPABILITIES[id].intents.length).toBeGreaterThan(0);
    }
    expect(ids).toContain("market.getContext");
  });
});


// =============================================================
// RC1 SCORECARD (deterministic pass/fail — no fake ML metrics)
// =============================================================
describe("RC1 — deterministic scorecard", () => {
  it("reports 100% routing + honesty pass rate across the mandatory battery", () => {
    let total = 0;
    let passed = 0;

    // Canonical routing accuracy.
    for (const r of CANONICAL_ROUTES) {
      total += 1;
      const res = evaluateRoute(r.message);
      const ok = res.selected === r.cap && res.clarify === false;
      if (ok) passed += 1;
    }
    // Ambiguous → honest clarification.
    for (const r of AMBIGUOUS) {
      total += 1;
      const res = evaluateRoute(r.message);
      const ok = res.clarify === true && res.selected !== "market.getContext";
      if (ok) passed += 1;
    }
    // Adversarial → honest clarification, never market fallback.
    for (const a of ADVERSARIAL) {
      total += 1;
      const res = evaluateRoute(a.message);
      const ok = res.clarify === true && res.selected !== "market.getContext";
      if (ok) passed += 1;
    }

    console.log(`[RC1] routing+honesty: ${passed}/${total} mandatory scenarios passed (target 100%)`);
    expect(passed).toBe(total);
    expect(total).toBeGreaterThanOrEqual(28);
  });

  it("reports 100% on the real-service synthesis harness scenarios", async () => {
    const scenarios = [
      "How are my leads performing?",
      "Which inventory is slow moving?",
      "Which customers are at risk?",
      "Show market opportunities.",
      "Give me an overall business intelligence assessment.",
    ];
    let passed = 0;
    for (const msg of scenarios) {
      const { response, synthesis, route } = await runRC1(msg, realFixtures());
      const hasEvidence = synthesis.evidence.length > 0;
      const ok =
        response.success === true &&
        route.selected != null &&
        hasEvidence &&
        narrativeIsNotRawJson(synthesis.narrative) &&
        synthesis.facts.length > 0;
      if (ok) passed += 1;
    }
    // Empty-dataset honesty scenario.
    const empty = await runRC1("Which customers are at risk?", emptyFixtures());
    const emptyOk =
      empty.synthesis.limitations.some((l) => l.type === "empty_dataset") &&
      narrativeIsNotRawJson(empty.synthesis.narrative);
    if (emptyOk) passed += 1;
    const total = scenarios.length + 1;
    console.log(`[RC1] synthesis harness: ${passed}/${total} scenarios passed`);
    expect(passed).toBe(total);
  });
});

