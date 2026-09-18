import { describe, it, expect } from "vitest";
import {
  SUPREME_LEARNING,
  type LiveBusinessEntity,
  type DecisionOutcomeRecord,
} from "../src/lib/sentinel-learning";

describe("Supreme Intelligence — Five-Level Learning Loop", () => {
  const testWorkspaceId = "ws-test-sprint-7777";
  const testUserId = "usr-test-analyst-8888";

  it("Level 1 (Data Adaptation): dynamically adapts live business entities", () => {
    const liveEntities: LiveBusinessEntity[] = [
      {
        id: "proj_wh_01",
        type: "project",
        workspaceId: testWorkspaceId,
        name: "Whitefield Sovereign",
        status: "active",
        metadata: { unitsTotal: 120, unitsAvailable: 34 },
        updatedAt: new Date().toISOString(),
      },
      {
        id: "unit_wh_401",
        type: "unit",
        workspaceId: testWorkspaceId,
        name: "WH-A-401 (3BHK Luxury)",
        status: "available",
        metadata: { price: 24000000, carpetArea: 1850 },
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lead_inv_909",
        type: "lead",
        workspaceId: testWorkspaceId,
        name: "Vikram Singhania",
        status: "qualified",
        metadata: { budgetMax: 30000000, preferredType: "3BHK" },
        updatedAt: new Date().toISOString(),
      },
      {
        id: "inv_cap_12",
        type: "investor",
        workspaceId: testWorkspaceId,
        name: "Vertex Capital HNW",
        status: "active",
        metadata: { portfolioSize: 5 },
        updatedAt: new Date().toISOString(),
      },
    ];

    const adapted = SUPREME_LEARNING.adaptWorkspaceData(testWorkspaceId, liveEntities);

    expect(adapted.workspaceId).toBe(testWorkspaceId);
    expect(adapted.entityCounts.projects).toBe(1);
    expect(adapted.entityCounts.units).toBe(1);
    expect(adapted.entityCounts.leads).toBe(1);
    expect(adapted.entityCounts.investors).toBe(1);
    expect(adapted.activeEntities.length).toBe(4);
  });

  it("Level 2 (Contextual Learning): retains conversation memory across multiple turns", () => {
    const memory = SUPREME_LEARNING.getOrCreateSessionMemory(
      testWorkspaceId,
      testUserId,
      "sales_executive",
      "SALES_EXECUTIVE"
    );

    expect(memory.workspaceId).toBe(testWorkspaceId);
    expect(memory.userId).toBe(testUserId);
    expect(memory.workspaceRole).toBe("sales_executive");

    // Turn 1
    const turn1 = SUPREME_LEARNING.recordConversationTurn(testWorkspaceId, testUserId, {
      inputMode: "text",
      userPrompt: "What is my workspace role?",
      interpretedIntent: "QUERY",
      reasoningPath: "fast_path",
      responseSummary: "Sales Executive Workspace Role",
    });

    // Turn 2 (Voice)
    const turn2 = SUPREME_LEARNING.recordConversationTurn(testWorkspaceId, testUserId, {
      inputMode: "voice",
      userPrompt: "How are my leads performing?",
      interpretedIntent: "QUERY",
      reasoningPath: "deep_path",
      responseSummary: "Lead conversion velocity review",
    });

    const updatedMem = SUPREME_LEARNING.getOrCreateSessionMemory(
      testWorkspaceId,
      testUserId,
      "sales_executive",
      "SALES_EXECUTIVE"
    );

    expect(updatedMem.turns.length).toBeGreaterThanOrEqual(2);
    expect(updatedMem.turns[updatedMem.turns.length - 2].userPrompt).toBe("What is my workspace role?");
    expect(updatedMem.turns[updatedMem.turns.length - 1].userPrompt).toBe("How are my leads performing?");
  });

  it("Level 3 (Outcome Learning): records Decision -> Action -> Real-World Outcome pipeline", () => {
    // 1. Record Supreme Decision
    const decision = SUPREME_LEARNING.recordDecision({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      inputMode: "text",
      inputPrompt: "Recommend next action for Vikram Singhania",
      decisionType: "recommendation",
      decisionHeadline: "Schedule private site visit for WH-A-401",
      recommendedAction: "Dispatch personalized 3BHK yield dossier to investor within 2 hours",
      targetEntity: {
        type: "lead",
        id: "lead_inv_909",
        name: "Vikram Singhania",
      },
      expectedOutcome: "Site visit confirmation within 24h",
      provenance: ["crm.getCRMKPIs", "inventory.getContext"],
    });

    expect(decision.decisionId).toBeDefined();
    expect(decision.actionStatus).toBe("pending");
    expect(decision.outcomeClassification).toBe("unobserved");

    // 2. Later: Record actual real-world verified outcome
    const updated = SUPREME_LEARNING.recordOutcome(decision.decisionId, {
      actionStatus: "booking_completed",
      outcomeClassification: "verified_positive",
      outcomeDetails: "Investor completed booking of WH-A-401 following site visit.",
    });

    expect(updated).not.toBeNull();
    expect(updated?.actionStatus).toBe("booking_completed");
    expect(updated?.outcomeClassification).toBe("verified_positive");
    expect(updated?.outcomeTimestamp).toBeDefined();
  });

  it("Level 4 (Pattern Learning): accumulates validated outcomes to score confidence patterns", () => {
    const patterns = SUPREME_LEARNING.getPatternsForWorkspace(testWorkspaceId);
    expect(patterns.length).toBeGreaterThan(0);

    const leadPattern = patterns.find((p) => p.patternKey === "rapid_response_conversion");
    expect(leadPattern).toBeDefined();
    expect(leadPattern?.confidenceScore).toBeGreaterThan(0.7);
    expect(leadPattern?.provenance.length).toBeGreaterThan(0);
  });

  it("Level 5 (Self-Improvement Foundation): audits decision accuracy and tunes heuristics safely", () => {
    const audit = SUPREME_LEARNING.auditSelfImprovement(testWorkspaceId);

    expect(audit.workspaceId).toBe(testWorkspaceId);
    expect(audit.totalDecisionsLogged).toBeGreaterThanOrEqual(1);
    expect(audit.predictionAccuracy).toBeGreaterThan(0);
    expect(audit.heuristicAdjustments.length).toBeGreaterThanOrEqual(1);
    expect(audit.heuristicAdjustments[0].rule).toContain("Multiplier");
  });
});
