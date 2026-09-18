import { describe, it, expect } from "vitest";
import { FORTS, PERSONA_FORT } from "../src/sentinel/forts";
import { PERSONAS } from "../src/sentinel/personas";
import { resolveFortStatus } from "../src/lib/fort-experience";

describe("Workspace Architecture & Terminology Enforcement", () => {
  it("enforces user-facing terminology across Fort registry", () => {
    // Investor Fort
    expect(FORTS.INDIVIDUAL.label).toBe("Investor Fort");
    expect(FORTS.INDIVIDUAL.welcome).toContain("Investor");
    expect(FORTS.INDIVIDUAL.mission).toContain("investment");

    // Developer / Builder Fort
    expect(FORTS.BUILDER.label).toBe("Developer / Builder Fort");
    expect(FORTS.BUILDER.welcome).toContain("Developer / Builder");
    expect(FORTS.BUILDER.mission).toContain("development");

    // Sales Executive Fort
    expect(FORTS.BROKER.label).toBe("Sales Executive Fort");
    expect(FORTS.BROKER.welcome).toContain("Sales Executive");
    expect(FORTS.BROKER.mission).toContain("match investors");

    // Platform Administrator Fort
    expect(FORTS.PLATFORM.label).toBe("Platform Administrator Fort");
    expect(FORTS.PLATFORM.welcome).toContain("Platform Administrator");
  });

  it("enforces user-facing terminology across Personas", () => {
    expect(PERSONAS.BUYER.label).toBe("Investor");
    expect(PERSONAS.INVESTOR.label).toBe("Investor");
    expect(PERSONAS.DEVELOPER.label).toBe("Developer / Builder");
    expect(PERSONAS.SALES_EXECUTIVE.label).toBe("Sales Executive");
    expect(PERSONAS.PLATFORM_ADMIN.label).toBe("Platform Administrator");
  });

  it("verifies authoritative workspace status resolution from verified workspace ID and role", () => {
    // Active verified workspace with role
    const activeResult = resolveFortStatus({
      workspaceId: "00000000-0000-0000-0000-000000000001",
      appRoles: ["investor"],
    });
    expect(activeResult.status).toBe("ACTIVE");
    expect(activeResult.reason).toBe("RESOLVED");

    // Provisioning when workspace exists but role not assigned yet
    const provResult = resolveFortStatus({
      workspaceId: "00000000-0000-0000-0000-000000000002",
      appRoles: [],
    });
    expect(provResult.status).toBe("PROVISIONING");
    expect(provResult.reason).toBe("NO_APP_ROLE");

    // Fails closed when workspace ID is missing (never trusts client state alone)
    const awaitingResult = resolveFortStatus({
      workspaceId: null,
      appRoles: ["investor"],
    });
    expect(awaitingResult.status).toBe("AWAITING");
  });
});
