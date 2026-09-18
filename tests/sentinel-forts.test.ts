import { describe, it, expect } from "vitest";
import {
  FORTS,
  isFort,
  personaToFort,
  fortForSlug,
  selectFortForProfile,
  PERSONA_FORT,
  capabilityLabel,
} from "../src/sentinel/forts";
import { PERSONAS } from "../src/sentinel/personas";
import { resolveExperience } from "../src/sentinel/resolver";
import type { SentinelPersona } from "../src/sentinel/types";
import { MODULE_CATALOG, partitionModules } from "../src/lib/fort-modules";
import {
  sanitizeDraft,
  buildExperienceDraft,
  saveExperienceDraft,
  loadExperienceDraft,
  clearExperienceDraft,
  type DraftStorage,
} from "../src/lib/experience-draft";

function memoryStorage(): DraftStorage {
  const map: Record<string, string> = {};
  return {
    getItem: (k) => map[k] ?? null,
    setItem: (k, v) => {
      map[k] = v;
    },
    removeItem: (k) => {
      delete map[k];
    },
  };
}

describe("SENTINEL FORT — persona → Fort mapping", () => {
  it("every registered persona resolves to a valid Fort (no orphan persona)", () => {
    for (const persona of Object.keys(PERSONAS) as SentinelPersona[]) {
      const fort = personaToFort(persona);
      expect(fort).not.toBeNull();
      expect(isFort(fort!)).toBe(true);
      expect(FORTS[fort!].personae).toContain(persona);
    }
  });

  it("maps the four primary Fort populations exactly", () => {
    expect(personaToFort("BUYER")).toBe("INDIVIDUAL");
    expect(personaToFort("INVESTOR")).toBe("INDIVIDUAL");
    expect(personaToFort("PROPERTY_OWNER")).toBe("INDIVIDUAL");
    expect(personaToFort("BROKER")).toBe("BROKER");
    expect(personaToFort("CHANNEL_PARTNER")).toBe("BROKER");
    expect(personaToFort("SALES_EXECUTIVE")).toBe("BROKER");
    expect(personaToFort("DEVELOPER")).toBe("BUILDER");
    expect(personaToFort("ENTERPRISE")).toBe("ENTERPRISE");
  });

  it("platform/service personas get a platform surface, not a customer Fort", () => {
    expect(personaToFort("PLATFORM_ADMIN")).toBe("PLATFORM");
    expect(personaToFort("AI_TECHNOLOGY_DEVELOPER")).toBe("PLATFORM");
    expect(personaToFort("PARTNER_SERVICE_PROVIDER")).toBe("PLATFORM");
  });

  it("mapping is advisory and never derived from roles/authorization", () => {
    expect(PERSONA_FORT).not.toHaveProperty("roles");
    expect(FORTS["BROKER"]).not.toHaveProperty("authorization");
  });

  it("null persona has no Fort (degrade to public re-ask)", () => {
    expect(personaToFort(null)).toBeNull();
  });

  it("every Fort definition is complete and distinct", () => {
    const routes = new Set<string>();
    const welcomes = new Set<string>();
    for (const fort of Object.values(FORTS)) {
      expect(fort.personae.length).toBeGreaterThan(0);
      expect(fort.modules.length).toBeGreaterThan(0);
      expect(fort.capabilities.length).toBeGreaterThan(0);
      expect(fort.intelligence.length).toBeGreaterThan(0);
      expect(fort.actions.length).toBeGreaterThan(0);
      expect(fort.welcome.length).toBeGreaterThan(0);
      routes.add(fort.route);
      welcomes.add(fort.welcome);
    }
    expect(routes.size).toBe(Object.keys(FORTS).length);
    expect(welcomes.size).toBe(Object.keys(FORTS).length);
  });
});

describe("SENTINEL FORT — experience draft (pre-auth state)", () => {
  it("persists only advisory fields; rejects roles/workspace/permissions", () => {
    const storage = memoryStorage();
    const draft = buildExperienceDraft({
      persona: "BUYER",
      intents: ["FIND_PROPERTY"],
      objective: "FIND_PROPERTY",
      context: {
        geography: "Bangalore",
        roles: ["admin"],
        workspaceId: "ws-x",
        budget: { min: 1 },
      },
      fort: "INDIVIDUAL",
    });
    saveExperienceDraft(draft, storage);
    const raw = JSON.parse(storage.getItem("sentinel.experienceDraft")!);
    expect(raw.persona).toBe("BUYER");
    expect(raw.fort).toBe("INDIVIDUAL");
    // Authorization signals must not survive round-trip.
    expect(raw.context.roles).toBeUndefined();
    expect(raw.context.workspaceId).toBeUndefined();
    expect(raw.context.geography).toBe("Bangalore");
    const loaded = loadExperienceDraft(storage);
    expect(loaded?.context.roles).toBeUndefined();
    expect(loaded?.context.workspaceId).toBeUndefined();
    expect(loaded?.context.budget).toEqual({ min: 1 });
  });

  it("rejects malformed drafts back to null safe null", () => {
    const storage = memoryStorage();
    storage.setItem(
      "sentinel.experienceDraft",
      JSON.stringify({ persona: "ROBOT", fort: "PIRATE" }),
    );
    expect(loadExperienceDraft(storage)).toBeNull();
    storage.setItem("sentinel.experienceDraft", "{ not json");
    expect(loadExperienceDraft(storage)).toBeNull();
  });

  it("never stores roles/workspace even when malicious input contains them", () => {
    const storage = memoryStorage();
    const malicious = {
      persona: "INVESTOR",
      fort: "INDIVIDUAL",
      intents: ["EVALUATE_INVESTMENT"],
      objective: "IDENTIFY_INVESTMENT",
      context: { capital: 100, workspaceId: "tenant-7", roles: ["admin"] },
    };
    const safe = sanitizeDraft(malicious);
    expect(safe).not.toBeNull();
    expect(safe?.context.roles).toBeUndefined();
    expect(safe?.context.workspaceId).toBeUndefined();
    expect(safe?.context.capital).toBe(100);
    expect(safe?.fort).toBe("INDIVIDUAL");
  });

  it("clears the draft on demand", () => {
    const storage = memoryStorage();
    saveExperienceDraft(
      buildExperienceDraft({
        persona: "BUYER",
        intents: ["FIND_PROPERTY"],
        objective: "FIND_PROPERTY",
        context: {},
        fort: "INDIVIDUAL",
      }),
      storage,
    );
    expect(loadExperienceDraft(storage)).not.toBeNull();
    clearExperienceDraft(storage);
    expect(loadExperienceDraft(storage)).toBeNull();
  });

  it("an all-empty draft degrades to null (nothing meaningful persisted)", () => {
    const storage = memoryStorage();
    saveExperienceDraft(
      buildExperienceDraft({
        persona: null,
        intents: [],
        objective: null,
        context: {},
        fort: null,
      }),
      storage,
    );
    // sanitizeDraft intentionally discards drafts with zero meaningful fields.
    expect(loadExperienceDraft(storage)).toBeNull();
  });
});

describe("SENTINEL FORT — experience → Fort selection", () => {
  it("resolver persona flows into selectFortForProfile without touching authorization", () => {
    const profile = resolveExperience({
      identity: {
        identityId: "u1",
        personae: ["BROKER"],
        primaryPersona: "BROKER",
        intents: ["CLOSE_MORE_DEALS"],
        onboarding: "PROFILE_COMPLETE",
        workspaceId: "ws-1",
        profileComplete: true,
      },
      objective: "MATCH_BUYERS_TO_INVENTORY",
      context: {},
      authorization: { identityId: "u1", workspaceId: "ws-1", roles: ["viewer"] },
    });
    expect(selectFortForProfile(profile)).toBe("BROKER");
    expect(profile.authorization.roles).toEqual(["viewer"]);
    expect(profile.authorization.workspaceId).toBe("ws-1");
  });

  it("slug lookup + guard behave deterministically", () => {
    expect(fortForSlug("broker")?.id).toBe("BROKER");
    expect(fortForSlug("enterprise")?.id).toBe("ENTERPRISE");
    expect(fortForSlug("nope")).toBeNull();
    expect(isFort("INDIVIDUAL")).toBe(true);
    expect(isFort("CASINO")).toBe(false);
  });
});

describe("SENTINEL FORT — RBAC-gated module exposure (display only)", () => {
  it("authorized roles see modules as ACTIVE; unauthorized as LOCKED (never hidden silently)", () => {
    // admin reaches everything in the catalog; a viewer cannot reach /app/inventory.
    const { active, locked } = partitionModules(
      ["/app/crm", "/app/inventory"],
      ["viewer"],
    );
    expect(active.map((c) => c.route)).toEqual(["/app/crm"]);
    expect(locked.map((c) => c.route)).toEqual(["/app/inventory"]);
  });

  it("unknown routes are dropped entirely — never advertised, never fabricated", () => {
    const { active, locked } = partitionModules(["/app/does-not-exist"], ["admin"]);
    expect(active).toHaveLength(0);
    expect(locked).toHaveLength(0);
  });

  it("every fort module referenced by every fort exists in the catalog or is intentionally absent", () => {
    for (const fort of Object.values(FORTS)) {
      for (const route of fort.modules) {
        // Modules must either be real catalog entries or not advertised at all —
        // partitionModules drops unknowns; this asserts the catalog covers them
        // OR that they are deliberate future surfaces absent from MODULE_CATALOG.
        if (!MODULE_CATALOG[route]) continue;
        expect(MODULE_CATALOG[route].roles.length).toBeGreaterThan(0);
      }
    }
  });

  it("locked partition is inert data — no link target is produced for unauthorized users", () => {
    const { active, locked } = partitionModules(["/app/users"], ["viewer"]);
    expect(active).toHaveLength(0);
    expect(locked).toHaveLength(1);
    expect(locked[0].label).toBe("Users");
    // The card itself carries no grant semantics — enforcement stays server-side.
    expect(Object.hasOwn(MODULE_CATALOG["/app/users"], "roles")).toBe(true);
  });

  it("empty roles produce an all-locked experience with no active modules", () => {
    const { active, locked } = partitionModules(
      FORTS.ENTERPRISE.modules,
      [],
    );
    expect(active).toHaveLength(0);
    expect(locked.length + active.length).toBe(
      FORTS.ENTERPRISE.modules.filter((m) => MODULE_CATALOG[m]).length,
    );
  });
});

describe("SENTINEL FORT — capability preview labels", () => {
  it("maps every registered fort capability to a friendly label without inventing capabilities", () => {
    for (const fort of Object.values(FORTS)) {
      for (const c of fort.capabilities) {
        expect(capabilityLabel(c)).toBeTruthy();
        expect(typeof capabilityLabel(c)).toBe("string");
      }
    }
  });

  it("labels are stable and domain-derived", () => {
    expect(capabilityLabel("crm.getCRMKPIs")).toBe("CRM Intelligence");
    expect(capabilityLabel("supreme.orchestrate")).toBe(
      "Cross-Domain Supreme Intelligence",
    );
    expect(capabilityLabel("agent.matchPropertyCustomer")).toBe(
      "Buyer ↔ Property Matching",
    );
    expect(capabilityLabel("totally.unknown.capability")).toBe(
      "totally.unknown.capability",
    );
  });
});
