import { describe, it, expect } from "vitest";
import {
  MODULE_CATALOG,
  moduleAccessState,
  buildFortAccessMatrix,
  partitionModules,
  type ModuleAccessState,
} from "../src/lib/fort-modules";
import { FORTS } from "../src/sentinel/forts";
import { AGENT_CAPABILITIES } from "../src/lib/supreme-agent-capabilities";
import {
  sanitizeDraft,
  buildExperienceDraft,
} from "../src/lib/experience-draft";

/**
 * SENTINEL FORT — RBAC × Fort access matrix battery.
 *
 * Proves the four-layer separation is real:
 *   PERSONA creates the experience.      (advisory)
 *   ROLE controls access.                (DB user_roles -> moduleAccessState)
 *   CAPABILITY powers intelligence.      (only registered capabilities)
 *   FORT is the experience surface only. (never grants)
 *
 * The matrix is pure and deterministic: it derives ACTIVE/LOCKED/UNAVAILABLE
 * from MODULE_CATALOG role arrays - the same arrays the shell nav and route
 * hints use. Persona and Fort selection are NOT inputs to the matrix and can
 * never widen access. Route-level beforeLoad gates + RLS remain the only
 * authorization authority.
 */

describe("SENTINEL FORT / RBAC x Fort access matrix - role battery", () => {
  it("admin reaches every catalog module referenced by every fort (ACTIVE)", () => {
    for (const fort of Object.values(FORTS)) {
      for (const route of fort.modules) {
        expect(MODULE_CATALOG[route]).toBeDefined();
        expect(moduleAccessState(route, ["admin"])).toBe("ACTIVE");
      }
    }
  });

  it("manager reaches every management/intelligence module (ACTIVE across the catalog)", () => {
    for (const fort of Object.values(FORTS)) {
      for (const route of fort.modules) {
        expect(moduleAccessState(route, ["manager"])).toBe("ACTIVE");
      }
    }
  });

  it("agent sees sales/CRM modules only; governance/intelligence stays LOCKED", () => {
    expect(moduleAccessState("/app/crm", ["agent"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/leads", ["agent"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/customer", ["agent"])).toBe("ACTIVE");
    // admin/manager-only surfaces - not reachable by agent
    expect(moduleAccessState("/app/users", ["agent"])).toBe("LOCKED");
    expect(moduleAccessState("/app/governance", ["agent"])).toBe("LOCKED");
    expect(moduleAccessState("/app/risk", ["agent"])).toBe("LOCKED");
    // intelligence surfaces exclude agent
    expect(moduleAccessState("/app/supreme-intelligence", ["agent"])).toBe("LOCKED");
    expect(moduleAccessState("/app/market", ["agent"])).toBe("LOCKED");
  });

  it("viewer sees read-only reports and leads; write-centric modules stay LOCKED", () => {
    expect(moduleAccessState("/app/crm", ["viewer"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/market", ["viewer"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/supreme-intelligence", ["viewer"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/leads", ["viewer"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/inventory", ["viewer"])).toBe("LOCKED");
  });

  it("builder sees project/inventory modules; sales-operations stays LOCKED", () => {
    expect(moduleAccessState("/app/inventory", ["builder"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/market", ["builder"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/kie", ["builder"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/leads", ["builder"])).toBe("LOCKED");
    expect(moduleAccessState("/app/voice", ["builder"])).toBe("LOCKED");
  });

  it("developer sees technology/automation modules; control surfaces stay LOCKED", () => {
    expect(moduleAccessState("/app/inventory", ["developer"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/workflows", ["developer"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/kie", ["developer"])).toBe("ACTIVE");
    expect(moduleAccessState("/app/users", ["developer"])).toBe("LOCKED");
    expect(moduleAccessState("/app/governance", ["developer"])).toBe("LOCKED");
    expect(moduleAccessState("/app/risk", ["developer"])).toBe("LOCKED");
  });

  it("empty roles fail closed - every known module is LOCKED, none ACTIVE", () => {
    for (const fort of Object.values(FORTS)) {
      const { active, locked } = partitionModules(fort.modules, []);
      expect(active).toHaveLength(0);
      const known = fort.modules.filter((m) => MODULE_CATALOG[m]);
      expect(locked.length).toBe(known.length);
    }
  });

  it("buildFortAccessMatrix returns one deterministic verdict per module", () => {
    const matrix = buildFortAccessMatrix(FORTS.ENTERPRISE.modules, ["admin"]);
    expect(matrix.length).toBe(FORTS.ENTERPRISE.modules.length);
    for (const entry of matrix) {
      expect(["ACTIVE", "LOCKED", "UNAVAILABLE"]).toContain(entry.state);
      expect(entry.route.startsWith("/app/")).toBe(true);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it("unknown routes are UNAVAILABLE and never advertised", () => {
    expect(moduleAccessState("/app/no-such-module", ["admin"])).toBe("UNAVAILABLE");
    const { active, locked } = partitionModules(["/app/no-such-module"], ["admin"]);
    expect(active).toHaveLength(0);
    expect(locked).toHaveLength(0);
  });
});

describe("SENTINEL FORT - persona / fort-selection never grants access (adversarial)", () => {
  it("forged enterprise persona with agent-only roles keeps admin surfaces LOCKED", () => {
    const matrix = buildFortAccessMatrix(FORTS.ENTERPRISE.modules, ["agent"]);
    const byRoute = Object.fromEntries(matrix.map((e) => [e.route, e.state]));
    // Admin/manager-only enterprise surfaces must stay LOCKED for an agent.
    expect(byRoute["/app/command"]).toBe("LOCKED");
    expect(byRoute["/app/risk"]).toBe("LOCKED");
    // Intelligence surfaces exclude agent.
    expect(byRoute["/app/supreme-intelligence"]).toBe("LOCKED");
  });

  it("forged roles/permissions in an experience draft are stripped, never persisted", () => {
    const safe = sanitizeDraft({
      persona: "ENTERPRISE",
      fort: "ENTERPRISE",
      context: {
        roles: ["admin"],
        workspaceId: "tenant-9",
        permissions: ["*"],
        market: "rising",
      },
    });
    expect(safe).not.toBeNull();
    expect(safe?.context.roles).toBeUndefined();
    expect(safe?.context.workspaceId).toBeUndefined();
    expect(safe?.context.permissions).toBeUndefined();
    expect(safe?.context.market).toBe("rising");
  });

  it("buildExperienceDraft can never carry authorization signals through context", () => {
    const draft = buildExperienceDraft({
      persona: "ENTERPRISE",
      intents: [],
      objective: null,
      context: { roles: ["admin"], workspaceId: "tenant-9" },
      fort: "ENTERPRISE",
    });
    expect(draft.context.roles).toBeUndefined();
    expect(draft.context.workspaceId).toBeUndefined();
  });

  it("switching fort/persona after auth never changes the deterministic matrix for the same roles", () => {
    const before = moduleAccessState("/app/users", ["viewer"]) as ModuleAccessState;
    for (const fort of Object.values(FORTS)) {
      // The matrix depends ONLY on the roles argument - never on the Fort.
      expect(moduleAccessState("/app/users", ["viewer"])).toBe(before);
      expect(fort).not.toHaveProperty("authorization");
    }
  });
});

describe("SENTINEL FORT — capability registry alignment (no fabricated capabilities)", () => {
  it("every capability advertised by a fort is a REAL registered capability", () => {
    const registered = new Set(Object.keys(AGENT_CAPABILITIES));
    for (const fort of Object.values(FORTS)) {
      for (const cap of fort.capabilities) {
        expect(
          registered,
          `${fort.id} advertises unknown capability id "${cap}"`,
        ).toContain(cap);
      }
    }
  });

  it("every registered capability carries complete, self-describing metadata", () => {
    for (const cap of Object.values(AGENT_CAPABILITIES)) {
      expect(cap.id).toBeTruthy();
      expect(cap.domain).toBeTruthy();
      expect(cap.description.length).toBeGreaterThan(0);
      expect(cap.intents.length).toBeGreaterThan(0);
      expect(cap.subjects.length).toBeGreaterThan(0);
      expect(["read", "write", "read/write"]).toContain(cap.mode);
      expect(cap.requiredRoles.length).toBeGreaterThan(0);
      expect(typeof cap.handler).toBe("function");
    }
  });

  it("capability ids are unique and follow the domain-id shape (single dot)", () => {
    const caps = Object.values(AGENT_CAPABILITIES);
    const unique = new Set(caps.map((c) => c.id));
    expect(unique.size).toBe(caps.length);
    for (const cap of caps) {
      const parts = cap.id.split(".");
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    }
  });
});