import { describe, it, expect } from "vitest";
import { toIdentityProfile, type SentinelProfileRow } from "../src/lib/sentinel.functions";

describe("Sentinel Profile Persona Resolution (Regression)", () => {
  it("preserves primary_persona = 'PLATFORM_ADMIN' when personae is empty []", () => {
    const row: SentinelProfileRow = {
      id: "00000000-0000-0000-0000-000000000001",
      user_id: "00000000-0000-0000-0000-000000000002",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      primary_persona: "PLATFORM_ADMIN",
      personae: [],
      intents: [],
      objective: null,
      context: { experience_profile: "platform_administrator" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const profile = toIdentityProfile(row);

    expect(profile.primaryPersona).toBe("PLATFORM_ADMIN");
    expect(profile.personae).toContain("PLATFORM_ADMIN");
  });

  it("handles empty primary_persona gracefully", () => {
    const row: SentinelProfileRow = {
      id: "00000000-0000-0000-0000-000000000001",
      user_id: "00000000-0000-0000-0000-000000000002",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      primary_persona: null,
      personae: [],
      intents: [],
      objective: null,
      context: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const profile = toIdentityProfile(row);

    expect(profile.primaryPersona).toBeNull();
    expect(profile.personae).toEqual([]);
  });

  it("does not fabricate invalid personas from unrecognized strings", () => {
    const row: SentinelProfileRow = {
      id: "00000000-0000-0000-0000-000000000001",
      user_id: "00000000-0000-0000-0000-000000000002",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      primary_persona: "SUPER_GOD_ROLE_FAKE",
      personae: [],
      intents: [],
      objective: null,
      context: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const profile = toIdentityProfile(row);

    expect(profile.primaryPersona).toBeNull();
    expect(profile.personae).toEqual([]);
  });
});
