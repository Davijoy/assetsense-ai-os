import { describe, it, expect } from "vitest";
import { resolveWelcomeFort, FORTS } from "../src/sentinel/forts";

describe("Fort Experience Priority — Server vs Stale LocalStorage (Regression)", () => {
  it("routes to /fort/platform when workspace.fort is PLATFORM even with stale INDIVIDUAL draft", () => {
    const result = resolveWelcomeFort({
      workspaceFort: { id: "PLATFORM" },
      profilePersona: "PLATFORM_ADMIN",
      draft: {
        fort: "INDIVIDUAL",
        persona: "BUYER",
      },
    });

    expect(result.fortId).toBe("PLATFORM");
    expect(result.route).toBe("/fort/platform");
    expect(result.persona).toBe("PLATFORM_ADMIN");
    // Verify route matches the actual Fort definition
    expect(result.route).toBe(FORTS.PLATFORM.route);
  });

  it("routes to /fort/platform when primaryPersona is PLATFORM_ADMIN even if workspace.fort is null and draft is INDIVIDUAL", () => {
    const result = resolveWelcomeFort({
      workspaceFort: null,
      profilePersona: "PLATFORM_ADMIN",
      draft: {
        fort: "INDIVIDUAL",
        persona: "BUYER",
      },
    });

    expect(result.fortId).toBe("PLATFORM");
    expect(result.route).toBe("/fort/platform");
    expect(result.persona).toBe("PLATFORM_ADMIN");
  });

  it("stale localStorage draft never wins over server-resolved workspace fort", () => {
    const result = resolveWelcomeFort({
      workspaceFort: { id: "PLATFORM" },
      profilePersona: null,
      draft: {
        fort: "INDIVIDUAL",
        persona: "BUYER",
      },
    });

    expect(result.fortId).toBe("PLATFORM");
    expect(result.route).toBe("/fort/platform");
  });

  it("allows anonymous experience draft when user has no server-resolved fort or profile persona", () => {
    const result = resolveWelcomeFort({
      workspaceFort: null,
      profilePersona: null,
      draft: {
        fort: "INDIVIDUAL",
        persona: "BUYER",
      },
    });

    expect(result.fortId).toBe("INDIVIDUAL");
    expect(result.route).toBe("/fort/individual");
    expect(result.persona).toBe("BUYER");
  });

  it("falls back to null safely when neither server nor draft resolves", () => {
    const result = resolveWelcomeFort({
      workspaceFort: null,
      profilePersona: null,
      draft: null,
    });

    expect(result.fortId).toBeNull();
    expect(result.route).toBeNull();
    expect(result.persona).toBeNull();
  });
});
