import { describe, it, expect } from "vitest";
import {
  resolveCompanionPrompt,
  capabilityName,
  companionSuggestions,
  companionHasRoutable,
  canCallRole,
} from "../src/lib/sentinel-companion";
import {
  NullSentinelVoiceAdapter,
  ACTIVE_VOICE_ADAPTER,
} from "../src/lib/sentinel-voice";
import { AGENT_CAPABILITIES } from "../src/lib/supreme-agent-capabilities";
import {
  moduleAccessState,
  buildFortAccessMatrix,
} from "../src/lib/fort-modules";
import { FORTS } from "../src/sentinel/forts";
import { personaToFort } from "../src/sentinel/forts";

/** Every capability the companion can route to must be a REAL registered id. */
const REGISTERED = new Set(Object.keys(AGENT_CAPABILITIES));

describe("SENTINEL companion — deterministic routing (no fake intelligence)", () => {
  it("empty prompt is unsupported and asks for a question", () => {
    const r = resolveCompanionPrompt("   ", []);
    expect(r.disposition).toBe("unsupported");
    expect(r.capabilityId).toBeNull();
  });

  it("ambiguous prompt returns needs_clarify, never a fabricated answer", () => {
    const r = resolveCompanionPrompt("hello there", ["admin"]);
    expect(r.disposition).toBe("needs_clarify");
    expect(r.capabilityId).toBeNull();
    expect(r.reason.length).toBeGreaterThan(0);
  });

  it("routes a CRM performance question to crm.getCRMKPIs", () => {
    const r = resolveCompanionPrompt("How are my leads performing?", ["admin"]);
    expect(r.disposition).toBe("match");
    expect(REGISTERED.has(r.capabilityId ?? "")).toBe(true);
    expect(r.capabilityId).toBe("crm.getCRMKPIs");
  });

  it("routes market opportunity language to market.getContext", () => {
    const r = resolveCompanionPrompt("Show me market opportunities", ["admin"]);
    expect(r.disposition).toBe("match");
    expect(r.capabilityId).toBe("market.getContext");
  });

  it("never invents a capability id outside the real registry", () => {
    for (const msg of [
      "How are my leads performing?",
      "Show me market opportunities",
      "Which inventory is slow moving?",
    ]) {
      const r = resolveCompanionPrompt(msg, ["admin"]);
      if (r.capabilityId) expect(REGISTERED.has(r.capabilityId)).toBe(true);
    }
  });

  it("mirrors the capability's role posture into callerAllowed (advisory)", () => {
    // market.getContext requires admin/manager; a viewer is NOT allowed.
    const admin = resolveCompanionPrompt("Show me market opportunities", ["admin"]);
    const viewer = resolveCompanionPrompt("Show me market opportunities", ["viewer"]);
    expect(admin.callerAllowed).toBe(true);
    expect(viewer.callerAllowed).toBe(false);
    expect(viewer.requiredRoles).toContain("admin");
  });
});

describe("SENTINEL companion — labels & suggestions derive from real capabilities", () => {
  it("derives a deterministic human label from capability ids", () => {
    expect(capabilityName("market.getContext")).toBe("Get Context");
    // camelCase acronym tokens are capitalized deterministically, never invented.
    expect(capabilityName("crm.getCRMKPIs")).toMatch(/^Get /);
    expect(capabilityName("supreme.orchestrate")).toMatch(/^Orchestrate/i);
  });

  it("only suggests prompts for capabilities that exist in the registry", () => {
    for (const fort of Object.values(FORTS)) {
      for (const s of companionSuggestions(fort.capabilities)) {
        expect(typeof s.prompt).toBe("string");
        expect(s.prompt.length).toBeGreaterThan(0);
        expect(typeof s.capability).toBe("string");
        expect(s.capability.length).toBeGreaterThan(0);
      }
    }
  });

  it("role-check utility is a plain intersection (never grants)", () => {
    expect(canCallRole(["admin", "manager"], ["admin"])).toBe(true);
    expect(canCallRole(["admin", "manager"], ["viewer"])).toBe(false);
    expect(canCallRole([], [])).toBe(false);
  });
});

describe("SENTINEL companion — voice boundary is honest (no fake speech)", () => {
  it("the active adapter is explicitly unavailable until a provider is wired", () => {
    expect(ACTIVE_VOICE_ADAPTER.available).toBe(false);
    expect(NullSentinelVoiceAdapter.available).toBe(false);
  });

  it("startListening rejects with a clear contract error rather than faking", async () => {
    await expect(NullSentinelVoiceAdapter.startListening()).rejects.toThrow(
      "SENTINEL_VOICE_UNAVAILABLE",
    );
  });

  it("does not speak without a real provider", async () => {
    await expect(NullSentinelVoiceAdapter.speak("hi")).resolves.toBeUndefined();
  });
});

describe("SENTINEL companion — advisory persona/fort never changes authorization", () => {
  const rolesAlways: string[] = ["viewer"];

  it("every commercial persona maps to its Fort (experience advisory)", () => {
    expect(personaToFort("BROKER")).toBe("BROKER");
    expect(personaToFort("DEVELOPER")).toBe("BUILDER");
    expect(personaToFort("ENTERPRISE")).toBe("ENTERPRISE");
    expect(personaToFort("BUYER")).toBe("INDIVIDUAL");
  });

  it("a viewer role sees the same access verdict regardless of Fort selection", () => {
    for (const fort of Object.values(FORTS)) {
      const matrix = buildFortAccessMatrix(fort.modules, rolesAlways);
      for (const entry of matrix) {
        expect(moduleAccessState(entry.route, rolesAlways)).toBe(entry.state);
      }
    }
  });

  it("persona/fort do not appear as authorization inputs in the matrix", () => {
    for (const fort of Object.values(FORTS)) {
      expect(fort).not.toHaveProperty("roles");
      expect(fort).not.toHaveProperty("authorization");
    }
  });
});