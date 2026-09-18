import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "../src/lib/event-fabric/in-memory-event-bus";
import { InventoryIntelligenceService } from "../src/business-intelligence/inventory/service";
import { InventoryRiskEvaluator, INVENTORY_THRESHOLDS } from "../src/decision-engine/inventory/inventory-risk-evaluator";
import { InAppDispatcher } from "../src/communication-hub/in-app/in-app-dispatcher";
import { InAppNotificationProcessor } from "../src/communication-hub/in-app/in-app-processor";
import type { InventoryLevel, InventoryIntelligence } from "../src/business-intelligence/inventory/types";
import type { DecisionContext } from "../src/decision-engine/shared/decision-context";
import type { IInventoryRepository } from "../src/business-intelligence/inventory/repository";

// ── Test fixtures ──

function makeLevel(overrides: Partial<InventoryLevel> = {}): InventoryLevel {
  return {
    assetId: `prop-${Math.random().toString(36).slice(2, 8)}`,
    quantity: 1,
    unit: "unit",
    lastUpdated: new Date(),
    threshold: 1,
    status: "available",
    priceInr: 5000000,
    city: "Mumbai",
    name: "Test Property",
    propertyType: "3BHK",
    developer: "Test Developer",
    ...overrides,
  };
}

function makeMockRepository(levels: InventoryLevel[]): IInventoryRepository {
  return {
    async getLevels() { return levels; },
    async getMovements() { return []; },
    async updateLevel() {},
    async recordMovement() {},
  };
}

function makeDecisionContext(workspaceId = "ws-test"): DecisionContext {
  return {
    workspaceId,
    correlationId: "corr-test",
    causationId: "cause-test",
    intelligenceEvents: [],
    subjectType: "Inventory",
    subjectId: workspaceId,
    evaluatedAt: new Date().toISOString(),
    evidenceReferences: [],
    dataClassification: "internal",
    jurisdiction: "IN",
  };
}

// ── Tests ──

describe("Event Fabric", () => {
  let bus: InMemoryEventBus;

  beforeEach(() => {
    bus = new InMemoryEventBus();
  });

  it("publishes and subscribes to events", async () => {
    const received: any[] = [];
    const sub = { onEvent: async (e: any) => { received.push(e); } };
    bus.subscribe(sub, "TEST.Event");

    await bus.publish({
      metadata: { eventId: "1", eventType: "TEST.Event", eventVersion: "1.0", timestamp: new Date().toISOString(), workspaceId: "ws", classification: "DOMAIN", priority: "MEDIUM", source: { serviceName: "test" } },
      payload: { foo: "bar" },
    });

    expect(received).toHaveLength(1);
    expect(received[0].payload.foo).toBe("bar");
  });

  it("supports unsubscribe", async () => {
    const received: any[] = [];
    const sub = { onEvent: async (e: any) => { received.push(e); } };
    const id = bus.subscribe(sub, "TEST.*");

    await bus.publish({
      metadata: { eventId: "1", eventType: "TEST.Event", eventVersion: "1.0", timestamp: new Date().toISOString(), workspaceId: "ws", classification: "DOMAIN", priority: "MEDIUM", source: { serviceName: "test" } },
      payload: {},
    });

    bus.unsubscribe(id);

    await bus.publish({
      metadata: { eventId: "2", eventType: "TEST.Event", eventVersion: "1.0", timestamp: new Date().toISOString(), workspaceId: "ws", classification: "DOMAIN", priority: "MEDIUM", source: { serviceName: "test" } },
      payload: {},
    });

    expect(received).toHaveLength(1);
  });

  it("isolates handler failures", async () => {
    const received: any[] = [];
    const badSub = { onEvent: async () => { throw new Error("boom"); } };
    const goodSub = { onEvent: async (e: any) => { received.push(e); } };

    bus.subscribe(badSub, "TEST.Event");
    bus.subscribe(goodSub, "TEST.Event");

    await bus.publish({
      metadata: { eventId: "1", eventType: "TEST.Event", eventVersion: "1.0", timestamp: new Date().toISOString(), workspaceId: "ws", classification: "DOMAIN", priority: "MEDIUM", source: { serviceName: "test" } },
      payload: {},
    });

    expect(received).toHaveLength(1);
  });

  it("isolates workspaces", async () => {
    const received: any[] = [];
    const sub = { onEvent: async (e: any) => { received.push(e); } };
    bus.subscribe(sub, "TEST.*", "ws-A");

    await bus.publish({
      metadata: { eventId: "1", eventType: "TEST.Event", eventVersion: "1.0", timestamp: new Date().toISOString(), workspaceId: "ws-A", classification: "DOMAIN", priority: "MEDIUM", source: { serviceName: "test" } },
      payload: {},
    });

    await bus.publish({
      metadata: { eventId: "2", eventType: "TEST.Event", eventVersion: "1.0", timestamp: new Date().toISOString(), workspaceId: "ws-B", classification: "DOMAIN", priority: "MEDIUM", source: { serviceName: "test" } },
      payload: {},
    });

    expect(received).toHaveLength(1);
    expect(received[0].metadata.workspaceId).toBe("ws-A");
  });
});

describe("Inventory BI Aggregation", () => {
  it("calculates summary from levels", async () => {
    const levels = [
      makeLevel({ status: "available", priceInr: 5000000 }),
      makeLevel({ status: "available", priceInr: 3000000 }),
      makeLevel({ status: "sold", priceInr: 7000000 }),
      makeLevel({ status: "reserved", priceInr: 4000000 }),
      makeLevel({ status: "blocked", priceInr: 2000000 }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");

    expect(ctx.inventorySummary?.total).toBe(5);
    expect(ctx.inventorySummary?.available).toBe(2);
    expect(ctx.inventorySummary?.sold).toBe(1);
    expect(ctx.inventorySummary?.reserved).toBe(1);
    expect(ctx.inventorySummary?.blocked).toBe(1);
    expect(ctx.inventorySummary?.totalValue).toBe(21000000);
    expect(ctx.inventorySummary?.soldValue).toBe(7000000);
  });

  it("groups by city, status, and project", async () => {
    const levels = [
      makeLevel({ city: "Mumbai", status: "available", developer: "Lodha" }),
      makeLevel({ city: "Mumbai", status: "sold", developer: "Lodha" }),
      makeLevel({ city: "Pune", status: "available", developer: "Brigade" }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");

    expect(ctx.groupings?.byCity).toHaveLength(2);
    expect(ctx.groupings?.byStatus).toHaveLength(2);
    expect(ctx.groupings?.byProject).toHaveLength(2);
  });

  it("calculates ageing buckets", async () => {
    const oldDate = new Date(Date.now() - 100 * 86400000);
    const veryOldDate = new Date(Date.now() - 150 * 86400000);
    const recentDate = new Date();

    const levels = [
      makeLevel({ lastUpdated: recentDate }),
      makeLevel({ lastUpdated: oldDate }),
      makeLevel({ lastUpdated: veryOldDate }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");

    expect(ctx.ageingBuckets).toBeDefined();
    expect(ctx.ageingBuckets).toHaveLength(5);
    const over90 = (ctx.ageingBuckets ?? []).filter((b) => b.bucket.includes("91") || b.bucket.includes("120")).reduce((s, b) => s + b.count, 0);
    expect(over90).toBe(2);
  });

  it("identifies slow-moving inventory", async () => {
    const oldDate = new Date(Date.now() - 100 * 86400000);
    const levels = [
      makeLevel({ lastUpdated: oldDate, status: "available" }),
      makeLevel({ lastUpdated: new Date(), status: "available" }),
      makeLevel({ lastUpdated: oldDate, status: "sold" }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");

    expect(ctx.slowMoving).toHaveLength(1);
  });

  it("identifies high-value unsold inventory", async () => {
    const levels = [
      makeLevel({ status: "available", priceInr: 10000000 }),
      makeLevel({ status: "available", priceInr: 2000000 }),
      makeLevel({ status: "available", priceInr: 3000000 }),
      makeLevel({ status: "sold", priceInr: 15000000 }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");

    expect(ctx.highValueUnsold).toBeDefined();
    expect(ctx.highValueUnsold!.length).toBeGreaterThan(0);
    expect(ctx.highValueUnsold![0].priceInr).toBe(10000000);
  });
});

describe("Decision Engine", () => {
  it("detects excess available inventory", async () => {
    const levels = Array.from({ length: 10 }, () => makeLevel({ status: "available" }));
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");
    const evaluator = new InventoryRiskEvaluator();
    const decisions = await evaluator.evaluateIntelligence(ctx, makeDecisionContext());

    const excess = decisions.find((d) => d.decisionType === "ExcessAvailableInventory");
    expect(excess).toBeDefined();
    expect(excess!.severity).toBe("HIGH");
  });

  it("detects low absorption", async () => {
    const levels = [
      ...Array.from({ length: 8 }, () => makeLevel({ status: "available" })),
      makeLevel({ status: "sold" }),
      makeLevel({ status: "sold" }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");
    const evaluator = new InventoryRiskEvaluator();
    const decisions = await evaluator.evaluateIntelligence(ctx, makeDecisionContext());

    const lowAbs = decisions.find((d) => d.decisionType === "LowAbsorption");
    expect(lowAbs).toBeDefined();
  });

  it("detects ageing inventory", async () => {
    const oldDate = new Date(Date.now() - 130 * 86400000);
    const levels = [
      makeLevel({ lastUpdated: oldDate, status: "available" }),
      makeLevel({ lastUpdated: new Date(), status: "available" }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");
    const evaluator = new InventoryRiskEvaluator();
    const decisions = await evaluator.evaluateIntelligence(ctx, makeDecisionContext());

    const ageing = decisions.find((d) => d.decisionType === "InventoryAgeing");
    expect(ageing).toBeDefined();
    expect(ageing!.severity).toBe("CRITICAL");
  });

  it("returns healthy decision when no risks", async () => {
    const levels = [
      makeLevel({ status: "sold", city: "Mumbai" }),
      makeLevel({ status: "sold", city: "Pune" }),
      makeLevel({ status: "available", city: "Mumbai" }),
      makeLevel({ status: "available", city: "Pune" }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");
    const evaluator = new InventoryRiskEvaluator();
    const decisions = await evaluator.evaluateIntelligence(ctx, makeDecisionContext());

    const healthy = decisions.find((d) => d.decisionType === "HealthyInventory");
    expect(healthy).toBeDefined();
  });

  it("returns no-inventory decision for empty workspace", async () => {
    const service = new InventoryIntelligenceService(makeMockRepository([]));
    const ctx = await service.getContext("ws-test");
    const evaluator = new InventoryRiskEvaluator();
    const decisions = await evaluator.evaluateIntelligence(ctx, makeDecisionContext());

    const noInv = decisions.find((d) => d.decisionType === "NoInventory");
    expect(noInv).toBeDefined();
  });
});

describe("Communication Hub", () => {
  beforeEach(() => {
    InAppNotificationProcessor.clear();
  });

  it("delivers in-app notification", async () => {
    const dispatcher = new InAppDispatcher();
    const now = new Date().toISOString();
    const result = await dispatcher.dispatch({
      communicationId: "comm-test-1",
      workspaceId: "ws-test",
      correlationId: "corr-test",
      causationId: "cause-test",
      channel: "IN_APP_NOTIFICATION",
      recipients: [{ recipientId: "r1", contact: "admin@test", contactType: "role", optedOut: false, metadata: {} }],
      templateId: "test-tpl",
      locale: "en-US",
      priority: "HIGH",
      scheduledAt: now,
      consent: { required: false, type: "IMPLIED", method: "OTHER", grantedAt: now, revocable: true, withdrawn: false, version: "1.0", blanketConsent: true, coveredTypes: ["IN_APP_NOTIFICATION"], geographicalRestriction: false, allowedJurisdictions: ["IN"], language: "en-US", recorded: true },
      quietHoursPolicy: { enabled: false, startTime: "22:00", endTime: "06:00", timezone: "Asia/Kolkata", days: [0,1,2,3,4,5,6], allowUrgentOverride: true },
      retryPolicy: { enabled: true, maxAttempts: 3, baseDelayMs: 1000, backoffMultiplier: 2, maxDelayMs: 30000, jitter: true },
      humanReviewRequired: false,
      trackDelivery: true,
      trackOpens: false,
      trackClicks: false,
      channelConfig: {},
      isTest: false,
      metadata: { title: "Test Alert", message: "Test message", recipientRole: "admin" },
    });

    expect(result.status).toBe("DELIVERED");
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].success).toBe(true);

    const notifs = InAppNotificationProcessor.getNotifications("ws-test");
    expect(notifs).toHaveLength(1);
    expect(notifs[0].title).toBe("Test Alert");
  });

  it("suppresses for opted-out recipients", async () => {
    const dispatcher = new InAppDispatcher();
    const now = new Date().toISOString();
    const result = await dispatcher.dispatch({
      communicationId: "comm-test-2",
      workspaceId: "ws-test",
      correlationId: "corr-test",
      causationId: "cause-test",
      channel: "IN_APP_NOTIFICATION",
      recipients: [{ recipientId: "r1", contact: "admin@test", contactType: "role", optedOut: true, metadata: {} }],
      templateId: "test-tpl",
      locale: "en-US",
      priority: "LOW",
      scheduledAt: now,
      consent: { required: false, type: "IMPLIED", method: "OTHER", grantedAt: now, revocable: true, withdrawn: false, version: "1.0", blanketConsent: true, coveredTypes: ["IN_APP_NOTIFICATION"], geographicalRestriction: false, allowedJurisdictions: ["IN"], language: "en-US", recorded: true },
      quietHoursPolicy: { enabled: false, startTime: "22:00", endTime: "06:00", timezone: "Asia/Kolkata", days: [0,1,2,3,4,5,6], allowUrgentOverride: true },
      retryPolicy: { enabled: true, maxAttempts: 3, baseDelayMs: 1000, backoffMultiplier: 2, maxDelayMs: 30000, jitter: true },
      humanReviewRequired: false,
      trackDelivery: true,
      trackOpens: false,
      trackClicks: false,
      channelConfig: {},
      isTest: false,
      metadata: {},
    });

    expect(result.status).toBe("SUPPRESSED");
    expect(result.suppressed).toBe(true);
  });
});

describe("Workspace Isolation", () => {
  it("isolates intelligence by workspace", async () => {
    const levelsA = [makeLevel({ city: "Mumbai" })];
    const levelsB = [makeLevel({ city: "Pune" }), makeLevel({ city: "Delhi" })];
    const repoA = makeMockRepository(levelsA);
    const repoB = makeMockRepository(levelsB);

    const serviceA = new InventoryIntelligenceService(repoA);
    const serviceB = new InventoryIntelligenceService(repoB);

    const ctxA = await serviceA.getContext("ws-A");
    const ctxB = await serviceB.getContext("ws-B");

    expect(ctxA.inventorySummary?.total).toBe(1);
    expect(ctxB.inventorySummary?.total).toBe(2);
    expect(ctxA.groupings?.byCity[0].name).toBe("Mumbai");
    expect(ctxB.groupings?.byCity[0].name).toBe("Pune");
  });
});

describe("BISnapshot Adapter", () => {
  it("preserves BISnapshot contract", async () => {
    const levels = [
      makeLevel({ status: "available", priceInr: 5000000, city: "Mumbai" }),
      makeLevel({ status: "sold", priceInr: 7000000, city: "Pune" }),
    ];
    const service = new InventoryIntelligenceService(makeMockRepository(levels));
    const ctx = await service.getContext("ws-test");

    // Verify the intelligence has all required fields
    expect(ctx.levels).toHaveLength(2);
    expect(ctx.inventorySummary).toBeDefined();
    expect(ctx.groupings).toBeDefined();
    expect(ctx.ageingBuckets).toBeDefined();
    expect(ctx.generatedAt).toBeDefined();
    expect(ctx.inventorySummary?.total).toBe(2);
    expect(ctx.inventorySummary?.sold).toBe(1);
    expect(ctx.inventorySummary?.available).toBe(1);
    expect(ctx.inventorySummary?.totalValue).toBe(12000000);
  });
});
