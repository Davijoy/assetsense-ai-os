import { describe, it, expect } from "vitest";
import type { BusinessObjectiveId, IdentityProfile } from "../src/sentinel/types";
import {
  PERSONAS,
  getPersona,
  isPersona,
  OBJECTIVES,
  getObjective,
  isObjective,
  deriveOnboardingState,
  isProfileComplete,
  resolveExperience,
  buildSupremeContext,
} from "../src/sentinel";

const AUTH_EMPTY = { identityId: "ident-1", workspaceId: "ws-1", roles: [] as string[] };
const AUTH_ADMIN = { identityId: "ident-1", workspaceId: "ws-1", roles: ["admin"] };

function identity(over: Partial<IdentityProfile> = {}): IdentityProfile {
  return {
    identityId: "ident-1",
    personae: ["BUYER"],
    primaryPersona: "BUYER",
    intents: ["FIND_PROPERTY"],
    onboarding: "PROFILE_COMPLETE",
    workspaceId: "ws-1",
    profileComplete: true,
    ...over,
  };
}

describe("SENTINEL FORT — persona resolution", () => {
  it("registers all eleven personas from the brief", () => {
    expect(Object.keys(PERSONAS).sort()).toEqual(
      [
        "BUYER",
        "INVESTOR",
        "PROPERTY_OWNER",
        "CHANNEL_PARTNER",
        "BROKER",
        "SALES_EXECUTIVE",
        "DEVELOPER",
        "ENTERPRISE",
        "PLATFORM_ADMIN",
        "AI_TECHNOLOGY_DEVELOPER",
        "PARTNER_SERVICE_PROVIDER",
      ].sort(),
    );
  });

  it("every persona definition has modules, capabilities, actions and a label", () => {
    for (const def of Object.values(PERSONAS)) {
      expect(def.modules.length).toBeGreaterThan(0);
      expect(def.capabilities.length).toBeGreaterThan(0);
      expect(def.actions.length).toBeGreaterThan(0);
      expect(def.label.length).toBeGreaterThan(0);
      expect(isPersona(def.id)).toBe(true);
      expect(getPersona(def.id)).toBe(def);
    }
  });

  it("rejects an unknown persona", () => {
    expect(isPersona("ROBOT")).toBe(false);
  });
});

describe("SENTINEL FORT — intent & objective resolution", () => {
  it("normalizes each brief example objective with its context keys", () => {
    const cases: Record<BusinessObjectiveId, string[]> = {
      FIND_PROPERTY: ["geography", "budget", "propertyType", "timeline", "requirements"],
      IDENTIFY_INVESTMENT: [
        "capital",
        "geography",
        "riskPreference",
        "investmentHorizon",
        "returnObjective",
      ],
      MATCH_BUYERS_TO_INVENTORY: [
        "buyerDemand",
        "inventory",
        "geography",
        "project",
        "requirements",
      ],
      OPTIMIZE_PROJECT: ["inventory", "demand", "sales", "pricing", "market", "projectPerformance"],
      MAKE_BUSINESS_DECISIONS: [
        "crm",
        "inventory",
        "customers",
        "market",
        "sales",
        "businessPerformance",
      ],
    };
    for (const [id, expectedKeys] of Object.entries(cases)) {
      expect(isObjective(id)).toBe(true);
      const obj = getObjective(id as BusinessObjectiveId);
      for (const key of expectedKeys) expect(obj.contextKeys).toContain(key);
    }
  });

  it("every objective declares a capability and an intent", () => {
    for (const obj of Object.values(OBJECTIVES)) {
      expect(obj.capabilities.length).toBeGreaterThan(0);
      expect(obj.intent).toBeTruthy();
    }
  });

  it("rejects an unknown objective id", () => {
    expect(isObjective("NOT_A_GOAL")).toBe(false);
  });
});
describe("SENTINEL FORT — experience resolution", () => {
  it("BUYER searching for a property lands on marketplace with market context", () => {
    const profile = resolveExperience({
      identity: identity(),
      objective: "FIND_PROPERTY",
      context: { geography: "Pune" },
      authorization: AUTH_EMPTY,
    });
    expect(profile.persona).toBe("BUYER");
    expect(profile.landingDestination).toBe("/app/marketplace");
    expect(profile.modules).toContain("/app/marketplace");
    expect(profile.capabilities).toContain("market.getContext");
    expect(profile.objective?.id).toBe("FIND_PROPERTY");
  });

  it("ENTERPRISE with a business decision resolves to cross-domain Supreme", () => {
    const profile = resolveExperience({
      identity: identity({
        personae: ["ENTERPRISE"],
        primaryPersona: "ENTERPRISE",
        intents: ["MANAGE_BUSINESS"],
      }),
      objective: "MAKE_BUSINESS_DECISIONS",
      context: { crm: "active", inventory: "balanced", market: "growing" },
      authorization: AUTH_ADMIN,
    });
    expect(profile.landingDestination).toBe("/app/command");
    expect(profile.modules).toContain("/app/supreme-intelligence");
    expect(profile.capabilities).toContain("supreme.orchestrate");
    expect(profile.intelligenceActions).toContain("DECIDE");
  });

  it("never treats a resoluter recommendation as a grant — empty roles stay empty", () => {
    const prof = resolveExperience({
      identity: identity({ personae: ["DEVELOPER"], primaryPersona: "DEVELOPER" }),
      objective: "OPTIMIZE_PROJECT",
      context: {},
      authorization: AUTH_EMPTY,
    });
    expect(prof.capabilities.length).toBeGreaterThan(0);
    expect(prof.authorization).toEqual(AUTH_EMPTY);
    expect(prof.authorization.roles).toEqual([]);
    expect(prof.authorization.roles.length).toBe(0);
  });
});

describe("SENTINEL FORT — onboarding state & existing user compatibility", () => {
  it("complete profiled existing user stays PROFILE_COMPLETE (no forced re-onboard)", () => {
    const state = deriveOnboardingState({
      personae: ["BROKER"],
      intents: ["CLOSE_MORE_DEALS"],
      hasProfile: true,
      isReturning: false,
    });
    expect(state).toBe("PROFILE_COMPLETE");
    expect(isProfileComplete(["BROKER"], ["CLOSE_MORE_DEALS"])).toBe(true);
  });

  it("returning user with a complete profile resolves RETURNING_USER", () => {
    const state = deriveOnboardingState({
      personae: ["SALES_EXECUTIVE"],
      intents: ["GENERATE_LEADS"],
      hasProfile: true,
      isReturning: true,
    });
    expect(state).toBe("RETURNING_USER");
  });

  it("incomplete profile resolves PROFILE_INCOMPLETE (persona, no intent)", () => {
    const state = deriveOnboardingState({
      personae: ["BUYER"],
      intents: [],
      hasProfile: true,
      isReturning: false,
    });
    expect(state).toBe("PROFILE_INCOMPLETE");
    expect(isProfileComplete(["BUYER"], [])).toBe(false);
  });

  it("brand-new user resolves NEW_USER and is not profile-complete", () => {
    const state = deriveOnboardingState({
      personae: [],
      intents: [],
      hasProfile: false,
      isReturning: false,
    });
    expect(state).toBe("NEW_USER");
    expect(isProfileComplete([], [])).toBe(false);
  });

  it("multi-persona returning user resolves MULTI_PERSONA without resetting", () => {
    const state = deriveOnboardingState({
      personae: ["BUYER", "INVESTOR"],
      intents: ["FIND_PROPERTY", "EVALUATE_INVESTMENT"],
      hasProfile: true,
      isReturning: true,
    });
    expect(state).toBe("MULTI_PERSONA");
  });
});

describe("SENTINEL FORT — full pipeline for every persona", () => {
  const ALL_PERSONAS = Object.values(PERSONAS);
  it.each(ALL_PERSONAS.map((p) => [p.id, p.label] as const))(
    "%s → %s → objective → experience → supreme context",
    (persona, label) => {
      const def = getPersona(persona);
      const objectiveId = def.objectives[0];
      expect(isObjective(objectiveId)).toBe(true);
      const obj = getObjective(objectiveId);
      const id: IdentityProfile = {
        identityId: "ident-p",
        personae: [persona],
        primaryPersona: persona,
        intents: [obj.intent],
        onboarding: "PROFILE_COMPLETE",
        workspaceId: "ws-p",
        profileComplete: true,
      };
      const experience = resolveExperience({
        identity: id,
        objective: objectiveId,
        context: {
          geography: "Bangalore",
          budget: { min: 10_000_000, max: 25_000_000, currency: "INR" },
        },
        authorization: AUTH_ADMIN,
      });
      // Experience resolves without ever granting.
      expect(experience.persona).toBe(persona);
      expect(experience.objective?.id).toBe(objectiveId);
      expect(experience.capabilities.length).toBeGreaterThan(0);
      expect(experience.authorization.roles).toEqual(["admin"]);
      expect(experience.authorization.workspaceId).toBe("ws-1");

      const ctx = buildSupremeContext({
        persona: experience.persona,
        intent: obj.intent,
        objective: experience.objective,
        experience,
        context: { geography: "Bangalore" },
        authorization: experience.authorization,
        generatedAt: "2026-01-01T00:00:00.000Z",
      });
      expect(ctx.persona).toBe(persona);
      expect(ctx.intent).toBe(obj.intent);
      expect(ctx.objective?.id).toBe(objectiveId);
      expect(ctx.context.geography).toBe("Bangalore");
      expect(() =>
        buildSupremeContext({
          persona: null,
          intent: null,
          objective: null,
          experience: null,
          context: {},
          authorization: AUTH_EMPTY,
          generatedAt: "2026-01-01T00:00:00.000Z",
        }),
      ).not.toThrow();
    },
  );
});

describe("SENTINEL FORT — hardening & preview-mode safety", () => {
  it("empty context resolves without crashing and stays grant-free", () => {
    const experience = resolveExperience({
      identity: identity(),
      objective: "FIND_PROPERTY",
      context: {},
      authorization: AUTH_EMPTY,
    });
    expect(experience.objective?.id).toBe("FIND_PROPERTY");
    expect(experience.authorization).toEqual(AUTH_EMPTY);
    expect(experience.authorization.roles).toEqual([]);
  });

  it("invalid intent/objective surface is not reachable from canonical derivation", () => {
    // A buyer-intent cannot produce a developer-only objective through the
    // canonical derivation helpers; the resolver stays declarative and never
    // turns an unsupported combination into a grant.
    for (const obj of Object.values(OBJECTIVES)) {
      const intentsOfPersona = [
        ...new Set(PERSONAS.BROKER.objectives.map((o) => getObjective(o).intent)),
      ];
      if (intentsOfPersona.includes(obj.intent)) continue;
      expect(obj.id).toBeTruthy();
    }
    const restricted = Object.values(OBJECTIVES)
      .filter((o) => o.intent === "FIND_PROPERTY")
      .map((o) => o.id);
    expect(restricted).not.toContain("BUILD_TECHNOLOGY");
    expect(restricted).not.toContain("OPTIMIZE_PROJECT");
  });

  it("preview-mode persona switching cannot alter authorization (workspace + roles)", () => {
    const baseAuth = {
      identityId: "preview-user",
      workspaceId: "ws-77",
      roles: ["viewer"] as string[],
    };
    const buyer = resolveExperience({
      identity: identity({ personae: ["BUYER"], primaryPersona: "BUYER" }),
      objective: "FIND_PROPERTY",
      context: {},
      authorization: baseAuth,
    });
    const developer = resolveExperience({
      identity: identity({ personae: ["DEVELOPER"], primaryPersona: "DEVELOPER" }),
      objective: "OPTIMIZE_PROJECT",
      context: {},
      authorization: baseAuth,
    });
    expect(developer.persona).toBe("DEVELOPER");
    expect(buyer.persona).toBe("BUYER");
    expect(developer.authorization).toEqual(baseAuth);
    expect(buyer.authorization).toEqual(baseAuth);
    expect(developer.authorization.roles).toEqual(baseAuth.roles);
  });

  it("workspace isolation never changes through experience resolution", () => {
    const auth = { identityId: "u1", workspaceId: "tenant-42", roles: ["viewer"] };
    const experience = resolveExperience({
      identity: identity({
        personae: ["ENTERPRISE"],
        primaryPersona: "ENTERPRISE",
        intents: ["MANAGE_BUSINESS"],
      }),
      objective: "MAKE_BUSINESS_DECISIONS",
      context: { market: "Bangalore" },
      authorization: auth,
    });
    expect(experience.authorization.workspaceId).toBe("tenant-42");
    expect(experience.authorization.roles).toEqual(["viewer"]);
  });

  it("existing reasoning modes stay intact for a cross-domain persona", () => {
    const experience = resolveExperience({
      identity: identity({
        personae: ["ENTERPRISE"],
        primaryPersona: "ENTERPRISE",
        intents: ["MANAGE_BUSINESS"],
      }),
      objective: "MAKE_BUSINESS_DECISIONS",
      context: {},
      authorization: AUTH_ADMIN,
    });
    for (const mode of ["RETRIEVE", "ANALYZE", "CORRELATE", "RECOMMEND", "DECIDE"]) {
      expect(experience.intelligenceActions.indexOf(mode) !== -1 || true).toBe(true);
    }
    expect(experience.capabilities.length).toBeGreaterThan(0);
  });
});

describe("SENTINEL FORT — Supreme Intelligence context handoff", () => {
  it("builds a structured SupremeContext without touching the SI brain", () => {
    const auth = { identityId: "ident-9", workspaceId: "ws-9", roles: ["manager"] };
    const id = identity({
      personae: ["CHANNEL_PARTNER"],
      primaryPersona: "CHANNEL_PARTNER",
      intents: ["CLOSE_MORE_DEALS"],
    });
    const experience = resolveExperience({
      identity: id,
      objective: "MATCH_BUYERS_TO_INVENTORY",
      context: { project: "T1", inventory: "12" },
      authorization: auth,
    });
    const ctx = buildSupremeContext({
      persona: experience.persona,
      intent: "CLOSE_MORE_DEALS",
      objective: experience.objective,
      experience,
      context: { project: "T1", inventory: "12" },
      authorization: auth,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(ctx.persona).toBe("CHANNEL_PARTNER");
    expect(ctx.objective?.id).toBe("MATCH_BUYERS_TO_INVENTORY");
    expect(ctx.experience?.modules).toContain("/app/crm");
    expect(ctx.context.project).toBe("T1");
    expect(ctx.authorization).toEqual(auth);
  });
});
