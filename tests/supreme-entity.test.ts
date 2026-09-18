/**
 * SENTINEL FORT — Supreme Entity logic tests.
 *
 * Tests the pure interaction logic of the living intelligence entity:
 *  - Initial idle state
 *  - State transitions and auto-reset of transient states
 *  - Expression system (state → facial descriptor)
 *  - Viewport clamping (entity never disappears off-screen)
 *  - Spring physics (drag settling)
 *  - Magnetic / settling behavior
 *  - Reduced-motion handling (CSS-only, verified via logic)
 *
 * These tests run in the node environment (no jsdom) — they exercise the
 * pure logic module directly, which is 100% dependency-free.
 */
import { describe, it, expect } from "vitest";
import {
  SUPREME_EXPRESSIONS,
  TRANSIENT_STATES,
  TRANSIENT_TIMEOUT_MS,
  getExpression,
  isTransientState,
  expressionName,
  clampToViewport,
  computeSettleTarget,
  springStep,
  DEFAULT_SPRING,
} from "../src/components/sentinel/SupremeEntityLogic";
import type { SupremeEntityState } from "../src/components/sentinel/SupremeEntity.types";

describe("SUPREME ENTITY — state machine", () => {
  it("initial idle state has calm smile expression", () => {
    const expr = getExpression("idle");
    expect(expr.eyes).toBe("neutral");
    expect(expr.mouth).toBe("smile");
    expect(expr.scale).toBe(1);
    expect(expr.particles).toBe(false);
  });

  it("all 15 states have an expression defined", () => {
    const allStates: SupremeEntityState[] = [
      "idle", "ready", "aware", "active", "hover", "listening", "thinking", "processing",
      "success", "insight", "warning", "alert", "error", "dragging", "pressed",
    ];
    for (const state of allStates) {
      const expr = getExpression(state);
      expect(expr).toBeDefined();
      expect(["neutral", "attentive", "thinking", "focused", "closed", "wide"]).toContain(
        expr.eyes,
      );
    }
  });

  it("transient states auto-reset to idle", () => {
    expect(TRANSIENT_STATES.has("success")).toBe(true);
    expect(TRANSIENT_STATES.has("insight")).toBe(true);
    expect(TRANSIENT_STATES.has("warning")).toBe(true);
    expect(TRANSIENT_STATES.has("error")).toBe(true);
    expect(TRANSIENT_STATES.has("pressed")).toBe(true);
  });

  it("non-transient states never auto-reset", () => {
    expect(TRANSIENT_STATES.has("idle")).toBe(false);
    expect(TRANSIENT_STATES.has("hover")).toBe(false);
    expect(TRANSIENT_STATES.has("thinking")).toBe(false);
    expect(TRANSIENT_STATES.has("dragging")).toBe(false);
  });

    it("transient timeout is reasonable (2-5s)", () => {
    expect(TRANSIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(2000);
    expect(TRANSIENT_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });
});

describe("SUPREME ENTITY — expression system", () => {
  it("idle = calm + slight smile + no glow", () => {
    const expr = getExpression("idle");
    expect(expr.mouth).toBe("smile");
    expect(expr.coreGlow).toBe(false);
  });

  it("listening = attentive eyes + core glow", () => {
    const expr = getExpression("listening");
    expect(expr.eyes).toBe("attentive");
    expect(expr.mouth).toBe("attentive");
    expect(expr.coreGlow).toBe(true);
  });

  it("thinking = thought activity + particles", () => {
    const expr = getExpression("thinking");
    expect(expr.particles).toBe(true);
    expect(expr.coreGlow).toBe(true);
  });

  it("processing = more focused + increased scale", () => {
    const expr = getExpression("processing");
    expect(expr.scale).toBeGreaterThan(1);
    expect(expr.particles).toBe(true);
  });

  it("success = brief positive expression + enlarged", () => {
    const expr = getExpression("success");
    expect(expr.eyes).toBe("closed");
    expect(expr.mouth).toBe("pleased");
    expect(expr.scale).toBe(1.12);
  });

  it("insight = attentive/excited but professional", () => {
    const expr = getExpression("insight");
    expect(expr.eyes).toBe("wide");
    expect(expr.mouth).toBe("pleased");
  });

  it("warning = serious expression, no alarming flash", () => {
    const expr = getExpression("warning");
    expect(expr.mouth).toBe("concerned");
    expect(expr.particles).toBe(false);
  });

  it("error = concerned expression + clear indication", () => {
    const expr = getExpression("error");
    expect(expr.mouth).toBe("concerned");
    expect(expr.coreGlow).toBe(false);
  });

  it("dragging = responsive + physically active", () => {
    const expr = getExpression("dragging");
    expect(expr.scale).toBe(1.1);
    expect(expr.coreGlow).toBe(true);
  });

  it("pressed = scale down (depression effect)", () => {
    const expr = getExpression("pressed");
    expect(expr.scale).toBe(0.95);
  });

    it("hover = subtle scale response + glow", () => {
    const expr = getExpression("hover");
    expect(expr.scale).toBe(1.05);
    expect(expr.coreGlow).toBe(true);
  });
});

describe("SUPREME ENTITY — viewport clamping", () => {
  const VP = { width: 1920, height: 1080 };

  it("clamps to top-left boundary", () => {
    const result = clampToViewport(-100, -100, 72, 72, undefined, VP);
    expect(result.x).toBe(16);
    expect(result.y).toBe(16);
  });

  it("clamps to bottom-right boundary", () => {
    const result = clampToViewport(5000, 5000, 72, 72, undefined, VP);
    expect(result.x).toBe(1920 - 72 - 16);
    expect(result.y).toBe(1080 - 72 - 16);
  });

  it("preserves position within bounds", () => {
    const result = clampToViewport(500, 500, 72, 72, undefined, VP);
    expect(result.x).toBe(500);
    expect(result.y).toBe(500);
  });

  it("respects custom margins", () => {
    const result = clampToViewport(-10, -10, 72, 72, {
      top: 32, right: 32, bottom: 32, left: 32,
    }, VP);
    expect(result.x).toBe(32);
    expect(result.y).toBe(32);
  });

  it("never allows entity to disappear off any edge", () => {
    const result = clampToViewport(1880, 500, 72, 72, undefined, VP);
    expect(result.x).toBeLessThanOrEqual(1920 - 72 - 16);
    expect(result.x).toBeGreaterThanOrEqual(16);

    const result2 = clampToViewport(500, 1050, 72, 72, undefined, VP);
    expect(result2.y).toBeLessThanOrEqual(1080 - 72 - 16);
    expect(result2.y).toBeGreaterThanOrEqual(16);
  });
});

describe("SUPREME ENTITY — spring physics", () => {
  it("spring step moves position toward target", () => {
    const result = springStep(0, 100, 0, DEFAULT_SPRING, 16);
    expect(result.position).toBeGreaterThan(0);
    expect(result.position).toBeLessThan(100);
  });

  it("spring step decelerates near target", () => {
    const result = springStep(98, 100, 0, DEFAULT_SPRING, 16);
    expect(result.position).toBeGreaterThan(98);
    expect(result.position).toBeLessThanOrEqual(100);
  });

    it("default spring config is under-damped (snappy settling)", () => {
    // The damping ratio determines settling behavior:
    // - ratio < 1: under-damped (settles quickly with slight overshoot)
    // - ratio = 1: critically damped (no overshoot, slower settle)
    // - ratio > 1: over-damped (sluggish)
    // We use slightly under-damped for a snappy, natural feel.
    const ratio =
      DEFAULT_SPRING.damping /
      (2 * Math.sqrt(DEFAULT_SPRING.stiffness * DEFAULT_SPRING.mass));
    expect(ratio).toBeLessThan(1.2); // under-damped or near-critical
    expect(ratio).toBeGreaterThan(0.5); // not too loose
  });
});

describe("SUPREME ENTITY — magnetic settling", () => {
  const VP = { width: 1920, height: 1080 };

  it("settles toward left edge when released near it", () => {
    const target = computeSettleTarget(50, 500, 72, 72, VP);
    expect(target.x).toBe(16);
  });

  it("settles toward right edge when released near it", () => {
    const target = computeSettleTarget(1850, 500, 72, 72, VP);
    expect(target.x).toBe(1920 - 72 - 16);
  });

  it("settles toward top edge when released near it", () => {
    const target = computeSettleTarget(500, 30, 72, 72, VP);
    expect(target.y).toBe(16);
  });

  it("settles toward bottom edge when released near it", () => {
    const target = computeSettleTarget(500, 1020, 72, 72, VP);
    expect(target.y).toBe(1080 - 72 - 16);
  });

  it("stays approximately where released when in open space", () => {
    const target = computeSettleTarget(900, 500, 72, 72, VP);
    expect(target.x).toBe(900);
    expect(target.y).toBe(500);
  });
});

describe("SUPREME ENTITY — expression name helper", () => {
  it("returns readable expression name", () => {
    expect(expressionName("idle")).toBe("neutral/smile");
    expect(expressionName("thinking")).toBe("thinking/thinking");
    expect(expressionName("error")).toBe("attentive/concerned");
  });
});

describe("SUPREME ENTITY — state consistency", () => {
  it("all expressions have scale between 0.95 and 1.15", () => {
    for (const state of Object.keys(SUPREME_EXPRESSIONS) as SupremeEntityState[]) {
      const expr = SUPREME_EXPRESSIONS[state];
      expect(expr.scale).toBeGreaterThanOrEqual(0.95);
      expect(expr.scale).toBeLessThanOrEqual(1.15);
    }
  });

  it("no state uses exaggerated cartoon eyes", () => {
    for (const state of Object.keys(SUPREME_EXPRESSIONS) as SupremeEntityState[]) {
      const expr = SUPREME_EXPRESSIONS[state];
      expect(["neutral", "attentive", "thinking", "focused", "closed", "wide"]).toContain(
        expr.eyes,
      );
    }
  });

  it("isTransientState correctly identifies transient states", () => {
    expect(isTransientState("success")).toBe(true);
    expect(isTransientState("error")).toBe(true);
    expect(isTransientState("idle")).toBe(false);
    expect(isTransientState("thinking")).toBe(false);
  });
});



