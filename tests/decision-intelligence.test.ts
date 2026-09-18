/**
 * Comprehensive Tests for Sentinel Decision Intelligence Framework (Level 4)
 */
import { describe, it, expect } from "vitest";
import {
  resolveDecisionContext,
  signalTone,
  compareEntities,
  answerContextualQuery,
  type DecisionSignal,
} from "../src/lib/decision-intelligence";
import type { ActiveEntity } from "../src/lib/active-entity";

describe("DECISION INTELLIGENCE — signal tone mapping", () => {
  it("maps positive signals to emerald", () => {
    expect(signalTone("STRONG BUY")).toBe("emerald");
    expect(signalTone("BUY")).toBe("emerald");
    expect(signalTone("FAVOURABLE")).toBe("emerald");
  });

  it("maps monitoring signals to amber", () => {
    expect(signalTone("WATCH")).toBe("amber");
    expect(signalTone("NEUTRAL")).toBe("amber");
  });

  it("maps risk signals to rose", () => {
    expect(signalTone("CAUTION")).toBe("rose");
    expect(signalTone("HIGH RISK")).toBe("rose");
  });

  it("maps insufficient data to slate", () => {
    expect(signalTone("INSUFFICIENT DATA")).toBe("slate");
  });
});

describe("DECISION INTELLIGENCE — object context: project, property, unit, lead, dealroom", () => {
  it("resolves project-level context with score-driven decision", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/marketplace",
      activeEntity: {
        type: "project",
        id: "proj-1",
        name: "Lodha Belmondo",
        module: "Project Intelligence",
        location: "Pirangut, Pune",
        price: "₹1.85 Cr",
        rawScore: 92,
        appreciation: "+14% YoY",
        status: "Ready",
        data: { "Developer": "Lodha Group" },
      },
    });

    expect(ctx.entityName).toBe("Lodha Belmondo");
    expect(ctx.keySignal).toBe("STRONG BUY");
    expect(ctx.confidence).toBe("HIGH");
    expect(ctx.factors.supporting.length).toBeGreaterThan(0);
  });

  it("resolves unit-level context: distinguishes PROJECT vs UNIT with floor-rise premium", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/marketplace",
      activeEntity: {
        type: "unit",
        id: "unit-1204",
        name: "Godrej Reserve — Tower B / Unit 1204",
        module: "Unit-Level Decision Intelligence",
        selectedProject: "Godrej Reserve",
        selectedTower: "Tower B",
        selectedUnit: "Unit 1204",
        unitNumber: "1204",
        floor: 12,
        facing: "East",
        configuration: "3 BHK",
        size: "1,850 sq ft",
        price: "₹2.14 Cr",
        location: "Devanahalli, Bengaluru",
        rawScore: 92,
        status: "Under Construction",
        data: {
          "Project": "Godrej Reserve",
          "Unit": "Unit 1204",
        },
      },
    });

    expect(ctx.entityType).toBe("unit");
    expect(ctx.entityName).toContain("Unit 1204");
    expect(ctx.data["Floor"]).toBe("Floor 12");
    expect(ctx.data["Orientation"]).toBe("East Facing");
    expect(ctx.data["Price / Sqft"]).toBeDefined();
    expect(ctx.data["Floor Premium"]).toBeDefined();
    expect(ctx.factors.supporting.some((f) => f.includes("East facing"))).toBe(true);
    expect(ctx.factors.caution.some((f) => f.includes("floor-rise premium"))).toBe(true);
    expect(ctx.risks.some((r) => r.category === "PRICE RISK")).toBe(true);
    expect(ctx.opportunities.some((o) => o.category === "INVENTORY SCARCITY")).toBe(true);
  });

  it("resolves lead-level context within CRM", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/crm",
      activeEntity: {
        type: "lead",
        id: "lead-01",
        name: "Arjun Patel (Lodha Belmondo)",
        module: "Lead Qualification Intelligence",
        location: "Pune",
        price: "₹1.9 Cr",
        rawScore: 94,
        status: "AI Qualified",
        data: { "Source": "AI Voice", "Budget": "₹1.9 Cr" },
      },
    });

    expect(ctx.entityName).toContain("Arjun Patel");
    expect(ctx.keySignal).toBe("STRONG BUY");
  });

  it("resolves dealroom-level context", () => {
    const ctx = resolveDecisionContext("/app/dealrooms");
    expect(ctx.module).toBe("Deal Room Intelligence");
    expect(ctx.keySignal).toBe("BUY");
    expect(ctx.data["Due Diligence"]).toBe("Cleared");
    expect(ctx.risks.length).toBeGreaterThanOrEqual(1);
    expect(ctx.opportunities.length).toBeGreaterThanOrEqual(1);
  });
});

describe("DECISION INTELLIGENCE — multi-factor comparison engine", () => {
  const entityA: ActiveEntity = {
    id: "prop-a",
    type: "property",
    name: "Godrej Reserve",
    module: "Marketplace",
    location: "Devanahalli, Bengaluru",
    price: "₹1.20 Cr",
    priceNumber: 12_000_000,
    size: "2,400 sqft",
    sizeSqft: 2400,
    rawScore: 92,
    score: 92,
    appreciation: "+22% YoY",
    appreciationPct: 22,
    status: "New Launch",
    data: {},
  };

  const entityB: ActiveEntity = {
    id: "prop-b",
    type: "property",
    name: "Prestige Lakeside",
    module: "Marketplace",
    location: "Varthur, Bengaluru",
    price: "₹2.40 Cr",
    priceNumber: 24_000_000,
    size: "2,210 sqft",
    sizeSqft: 2210,
    rawScore: 88,
    score: 88,
    appreciation: "+11% YoY",
    appreciationPct: 11,
    status: "Ready",
    data: {},
  };

  it("compares Entity A and Entity B across objective dimensions", () => {
    const comp = compareEntities(entityA, entityB);

    expect(comp.dimensions.length).toBeGreaterThanOrEqual(4);
    expect(comp.strongerOnA).toContain("Entry Price");
    expect(comp.strongerOnA).toContain("Price / Sqft");
    expect(comp.strongerOnA).toContain("Appreciation Momentum");
    expect(comp.strongerOnA).toContain("AI Investment Score");
    expect(comp.strongerOnB).toContain("Delivery Readiness");
    expect(comp.advantage).toBe("Entity A");
    expect(comp.decisionSignal).toBe("STRONG BUY");
    expect(comp.why).toContain("Godrej Reserve is stronger on");
  });

  it("resolves comparison mode in resolveDecisionContext", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/marketplace",
      activeEntity: entityA,
      comparisonEntity: entityB,
    });

    expect(ctx.module).toBe("Comparative Asset Intelligence");
    expect(ctx.comparison).toBeDefined();
    expect(ctx.comparison?.advantage).toBe("Entity A");
    expect(ctx.data["Advantage"]).toBe("Entity A");
    expect(ctx.factors.supporting.length).toBeGreaterThan(0);
    expect(ctx.factors.caution.length).toBeGreaterThan(0);
  });

  it("handles balanced trade-off (mixed advantage) as NEUTRAL", () => {
    const balancedA: ActiveEntity = { ...entityA, priceNumber: 20_000_000, rawScore: 85, score: 85, appreciationPct: 10 };
    const balancedB: ActiveEntity = { ...entityB, priceNumber: 20_000_000, rawScore: 85, score: 85, appreciationPct: 10 };

    const comp = compareEntities(balancedA, balancedB);
    expect(comp.advantage).toBe("NEUTRAL");
    expect(comp.decisionSignal).toBe("NEUTRAL");
  });
});

describe("DECISION INTELLIGENCE — contextual Q&A inheritance", () => {
  const unitContext = resolveDecisionContext({
    pathname: "/app/marketplace",
    activeEntity: {
      type: "unit",
      id: "unit-1204",
      name: "Godrej Reserve — Tower B / Unit 1204",
      module: "Unit-Level Decision Intelligence",
      selectedProject: "Godrej Reserve",
      selectedTower: "Tower B",
      selectedUnit: "Unit 1204",
      unitNumber: "1204",
      floor: 12,
      facing: "East",
      configuration: "3 BHK",
      size: "1,850 sq ft",
      price: "₹2.14 Cr",
      rawScore: 92,
      status: "Under Construction",
      data: {},
    },
  });

  it("answers 'Is this expensive?' using unit floor-rise premium and price/sqft", () => {
    const ans = answerContextualQuery("Is this expensive?", unitContext);
    expect(ans.interpretedIntent).toContain("asking price");
    expect(ans.answer).toContain("₹2.14 Cr");
    expect(ans.answer).toContain("floor-rise premium");
    expect(ans.evidence.length).toBeGreaterThan(0);
  });

  it("answers 'What is the biggest risk?' by extracting highest severity risk", () => {
    const ans = answerContextualQuery("What is the biggest risk?", unitContext);
    expect(ans.interpretedIntent).toContain("primary structural and operational risks");
    expect(ans.answer).toContain("PRICE RISK");
    expect(ans.evidence.length).toBeGreaterThan(0);
  });

  it("answers 'Why are you saying favourable?' with explainable factors", () => {
    const ans = answerContextualQuery("Why are you saying favourable?", unitContext);
    expect(ans.interpretedIntent).toContain("FAVOURABLE");
    expect(ans.answer).toContain("FAVOURABLE");
  });

  it("answers 'What should I check before deciding?' with actionable diligence", () => {
    const ans = answerContextualQuery("What should I check before deciding?", unitContext);
    expect(ans.interpretedIntent).toContain("due-diligence considerations");
    expect(ans.answer).toContain("view corridor");
  });

  it("answers 'Which is better?' when comparing two assets", () => {
    const compContext = resolveDecisionContext({
      pathname: "/app/marketplace",
      activeEntity: {
        id: "a",
        type: "property",
        name: "Asset A",
        module: "Marketplace",
        priceNumber: 10_000_000,
        score: 95,
        appreciationPct: 20,
        data: {},
      },
      comparisonEntity: {
        id: "b",
        type: "property",
        name: "Asset B",
        module: "Marketplace",
        priceNumber: 15_000_000,
        score: 80,
        appreciationPct: 10,
        data: {},
      },
    });

    const ans = answerContextualQuery("Which is better?", compContext);
    expect(ans.answer).toContain("Asset A");
    expect(ans.evidence.some((e) => e.includes("Advantage: Entity A"))).toBe(true);
  });
});

describe("DECISION INTELLIGENCE — data states (complete, partial, empty, stale)", () => {
  it("resolves INSUFFICIENT DATA when inventory snapshot is empty", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/inventory",
      biSnapshot: null,
    });

    expect(ctx.keySignal).toBe("INSUFFICIENT DATA");
    expect(ctx.confidence).toBe("INSUFFICIENT DATA");
    expect(ctx.dataClassification).toBe("INSUFFICIENT DATA");
    expect(ctx.risks.some((r) => r.category === "DATA RISK")).toBe(true);
  });

  it("computes CAUTION when inventory snapshot has at-risk clusters", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/inventory",
      biSnapshot: {
        intelligence: {
          inventorySummary: { total: 100, sold: 40, available: 60, absorptionPct: 40 },
        },
        kpis: { sales_velocity_days: 45 },
        regions: [
          { name: "Tower A", growth: 50 },
          { name: "Tower B", growth: 40 },
        ],
      },
    });

    expect(ctx.keySignal).toBe("CAUTION");
    expect(ctx.decision).toBe("RISK DETECTED");
    expect(ctx.confidence).toBe("HIGH");
    expect(ctx.dataClassification).toBe("LIVE DATA");
    expect(ctx.data["At-Risk Clusters"]).toBe("2");
  });

  it("computes HEALTHY ABSORPTION when inventory absorption is healthy", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/inventory",
      biSnapshot: {
        intelligence: {
          inventorySummary: { total: 200, sold: 160, available: 40, absorptionPct: 80 },
        },
        kpis: { sales_velocity_days: 18 },
        regions: [{ name: "Tower Alpha", growth: 95 }],
      },
    });

    expect(ctx.keySignal).toBe("FAVOURABLE");
    expect(ctx.decision).toBe("HEALTHY ABSORPTION");
    expect(ctx.confidence).toBe("HIGH");
    expect(ctx.dataClassification).toBe("LIVE DATA");
  });

  it("computes live CRM conversion velocity", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/crm",
      crmKpis: {
        pipelineValueInr: 500_000_000,
        activeLeads: 450,
        conversionRatePct: 22.4,
        averageResponseSeconds: 95,
      },
    });

    expect(ctx.keySignal).toBe("FAVOURABLE");
    expect(ctx.confidence).toBe("HIGH");
    expect(ctx.dataClassification).toBe("LIVE DATA");
    expect(ctx.data["Conversion Rate"]).toBe("22.4%");
    expect(ctx.data["Avg Response Time"]).toBe("95s");
  });

  it("detects INSUFFICIENT DATA for zero CRM leads", () => {
    const ctx = resolveDecisionContext({
      pathname: "/app/crm",
      crmKpis: {
        pipelineValueInr: 0,
        activeLeads: 0,
        conversionRatePct: 0,
        averageResponseSeconds: 0,
      },
    });

    expect(ctx.keySignal).toBe("INSUFFICIENT DATA");
    expect(ctx.confidence).toBe("INSUFFICIENT DATA");
    expect(ctx.decision).toBe("NO ACTIVE LEADS");
  });

  it("falls back to SEEDED BENCHMARK with LOW confidence when CRM is unpopulated", () => {
    const ctx = resolveDecisionContext("/app/crm");
    expect(ctx.confidence).toBe("LOW");
    expect(ctx.dataClassification).toBe("SEEDED BENCHMARK");
  });
});

describe("DECISION INTELLIGENCE — context loss & unselected asset guardrails", () => {
  it("clarifies rather than hallucinating when 'Is this expensive?' is asked without an active entity", () => {
    const unselectedContext = resolveDecisionContext("/app/marketplace");
    const ans = answerContextualQuery("Is this expensive?", unselectedContext);

    expect(ans.answer).toContain("I don't currently have a specific property or unit selected");
    expect(ans.evidence).toContain("Active entity: None");
  });

  it("clarifies when 'What is the biggest risk?' is asked without an active entity", () => {
    const unselectedContext = resolveDecisionContext("/app/marketplace");
    const ans = answerContextualQuery("What is the biggest risk?", unselectedContext);

    expect(ans.answer).toContain("I don't currently have a specific property or unit selected");
    expect(ans.evidence).toContain("Active entity: None");
  });

  it("clarifies when 'What should I check before deciding?' is asked without an active entity", () => {
    const unselectedContext = resolveDecisionContext("/app/marketplace");
    const ans = answerContextualQuery("What should I check before deciding?", unselectedContext);

    expect(ans.answer).toContain("select a target asset or unit to inspect its specific title clearances");
    expect(ans.evidence).toContain("Active entity: None");
  });

  it("provides honest CATALOG READY signal on /app/marketplace with zero hardcoded STRONG BUY", () => {
    const ctx = resolveDecisionContext("/app/marketplace");
    expect(ctx.keySignal).toBe("NEUTRAL");
    expect(ctx.decision).toBe("CATALOG READY");
    expect(ctx.dataClassification).toBe("STATIC METADATA");
    expect(ctx.why).toContain("Marketplace catalog is ready. Select an individual property card");
  });
});

describe("DECISION INTELLIGENCE — decision reversal test (data-driven vs route-driven)", () => {
  it("dynamically reverses verdict from STRONG BUY to CAUTION when asset score drops from 92 to 45", () => {
    const propA = resolveDecisionContext({
      pathname: "/app/marketplace",
      activeEntity: {
        id: "prop-a",
        type: "property",
        name: "Asset A (Prime)",
        module: "Marketplace",
        rawScore: 92,
        appreciation: "+18% YoY",
        data: {},
      },
    });

    expect(propA.keySignal).toBe("STRONG BUY");
    expect(propA.risks[0]?.severity).toBe("LOW");

    // Switch to Property B on the exact same route
    const propB = resolveDecisionContext({
      pathname: "/app/marketplace",
      activeEntity: {
        id: "prop-b",
        type: "property",
        name: "Asset B (Distressed)",
        module: "Marketplace",
        rawScore: 45,
        appreciation: "-2% YoY",
        data: {},
      },
    });

    expect(propB.keySignal).toBe("CAUTION");
    expect(propB.risks[0]?.category).toBe("DEMAND RISK");
    expect(propB.risks[0]?.severity).toBe("HIGH");
    expect(propB.why).toContain("Score of 45/100 suggests monitoring absorption");
  });
});

describe("DECISION INTELLIGENCE — FORT experience and platform command", () => {
  it("resolves honest INSUFFICIENT DATA for /fort when no roles or telemetry exist", () => {
    const ctx = resolveDecisionContext({ pathname: "/fort" });
    expect(ctx.entityName).toBe("Sentinel Fort Group");
    expect(ctx.module).toBe("Sentinel Fort Experience");
    expect(ctx.dataClassification).toBe("INSUFFICIENT DATA");
    expect(ctx.confidence).toBe("INSUFFICIENT DATA");
    expect(ctx.keySignal).toBe("INSUFFICIENT DATA");
    expect(ctx.decision).toBe("SYSTEM TELEMETRY PENDING");
    expect(ctx.data["Telemetry State"]).toBe("Insufficient Data");
  });

  it("resolves role-grounded DERIVED DATA for /fort when member has verified roles", () => {
    const ctx = resolveDecisionContext({
      pathname: "/fort",
      roles: ["builder", "manager"],
    });
    expect(ctx.entityName).toBe("Sentinel Fort Group");
    expect(ctx.module).toBe("Sentinel Fort Experience");
    expect(ctx.dataClassification).toBe("DERIVED DATA");
    expect(ctx.confidence).toBe("MODERATE");
    expect(ctx.keySignal).toBe("FAVOURABLE");
    expect(ctx.decision).toBe("FORT WORKSPACE SYNCHRONIZED");
    expect(ctx.data["Command Authority"]).toBe("builder, manager");
    expect(ctx.data["Telemetry State"]).toBe("Partially Available");
  });

  it("resolves PLATFORM COMMAND ACTIVE for /fort/platform with admin authority", () => {
    const ctx = resolveDecisionContext({
      pathname: "/fort/platform",
      roles: ["admin"],
    });
    expect(ctx.entityName).toBe("Sentinel Fort Group");
    expect(ctx.module).toBe("Platform Fort Command");
    expect(ctx.dataClassification).toBe("DERIVED DATA");
    expect(ctx.decision).toBe("PLATFORM COMMAND ACTIVE");
    expect(ctx.data["Command Authority"]).toBe("admin");
    expect(ctx.data["Multi-Engine Coordination"]).toBe("Market × Inventory × Customer");
  });

  it("resolves LIVE DATA for /fort when full telemetry (biSnapshot + crmKpis) is loaded", () => {
    const ctx = resolveDecisionContext({
      pathname: "/fort",
      roles: ["admin"],
      biSnapshot: {
        marketSummary: { totalCorridors: 8 },
        intelligence: { inventorySummary: { totalUnits: 124 } },
      },
      crmKpis: { activeLeads: 55 },
    });
    expect(ctx.entityName).toBe("Sentinel Fort Group");
    expect(ctx.dataClassification).toBe("LIVE DATA");
    expect(ctx.confidence).toBe("HIGH");
    expect(ctx.decision).toBe("PLATFORM COMMAND ACTIVE");
    expect(ctx.why).toContain("8 corridors, 124 inventory units");
    expect(ctx.data["Telemetry State"]).toBe("Live & Synchronized");
  });

  it("preserves landing page (/) READY state and metadata", () => {
    const ctx = resolveDecisionContext({ pathname: "/" });
    expect(ctx.route).toBe("/");
    expect(ctx.entityName).toBe("Sentinel Fort Group");
    expect(ctx.module).toBe("Sentinel Operating System");
    expect(ctx.decision).toBe("READY");
    expect(ctx.keySignal).toBe("FAVOURABLE");
    expect(ctx.dataClassification).toBe("STATIC METADATA");
  });
});
