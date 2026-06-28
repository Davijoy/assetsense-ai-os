import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "../src/routes/app.tsx"), "utf8");

type Item = { to: string; label: string; roles: string[] };

/** Extract a nav array literal (nav / kieNav / adminNav) from app.tsx. */
function extractNav(name: string): Item[] {
  const re = new RegExp(`const ${name}: NavItem\\[\\] = \\[([\\s\\S]*?)\\n\\];`);
  const block = src.match(re);
  if (!block) throw new Error(`Could not find ${name} array`);
  const items: Item[] = [];
  const itemRe = /\{[^}]*to:\s*"([^"]+)"[^}]*label:\s*"([^"]+)"[^}]*roles:\s*\[([^\]]+)\][^}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(block[1])) !== null) {
    const roles = m[3]
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    items.push({ to: m[1], label: m[2], roles });
  }
  return items;
}

const allNav = [...extractNav("nav"), ...extractNav("kieNav"), ...extractNav("adminNav")];
const visibleFor = (role: string) => allNav.filter((i) => i.roles.includes(role)).map((i) => i.to);

describe("/app sidebar role-based visibility — Builder & Developer", () => {
  it("Builder sees the expected builder-focused modules", () => {
    const v = visibleFor("builder");
    // Should see
    for (const to of [
      "/app/marketplace",
      "/app/bi",
      "/app/partners",
      "/app/copilot",
      "/app/docchat",
      "/app/recommendations",
      "/app/workflows",
      "/app/dealrooms",
      "/app/market",
      "/app/inventory",
      "/app/documents",
    ]) {
      expect(v, `builder should see ${to}`).toContain(to);
    }
    // Must NOT see admin/manager-only or agent-only modules
    for (const to of [
      "/app/crm",
      "/app/leads",
      "/app/voice",
      "/app/marketing",
      "/app/command",
      "/app/risk",
      "/app/collections",
      "/app/salesintel",
      "/app/graph",
      "/app/kie",
      "/app/governance",
      "/app/settings/branding",
    ]) {
      expect(v, `builder should NOT see ${to}`).not.toContain(to);
    }
  });

  it("Developer sees the expected developer-focused modules incl. Graph", () => {
    const v = visibleFor("developer");
    for (const to of [
      "/app/marketplace",
      "/app/bi",
      "/app/partners",
      "/app/copilot",
      "/app/docchat",
      "/app/workflows",
      "/app/dealrooms",
      "/app/market",
      "/app/inventory",
      "/app/documents",
      "/app/graph",
    ]) {
      expect(v, `developer should see ${to}`).toContain(to);
    }
    // Developer is technical — no CRM/leads/voice/marketing, no admin tools, no recommendations
    for (const to of [
      "/app/crm",
      "/app/leads",
      "/app/voice",
      "/app/marketing",
      "/app/command",
      "/app/recommendations",
      "/app/risk",
      "/app/collections",
      "/app/salesintel",
      "/app/kie",
      "/app/governance",
      "/app/settings/branding",
    ]) {
      expect(v, `developer should NOT see ${to}`).not.toContain(to);
    }
  });

  it("Builder/Developer roles never leak into admin-only sections", () => {
    const admin = extractNav("adminNav");
    for (const item of admin) {
      expect(item.roles).not.toContain("builder");
      expect(item.roles).not.toContain("developer");
    }
  });

  it("Other roles do not gain unintended access from builder/developer additions", () => {
    // Sanity: viewer is read-only and should not see write-heavy modules
    const viewer = visibleFor("viewer");
    for (const to of ["/app/leads", "/app/voice", "/app/workflows", "/app/dealrooms", "/app/copilot"]) {
      expect(viewer, `viewer should NOT see ${to}`).not.toContain(to);
    }
    // Agent should not see admin tools
    const agent = visibleFor("agent");
    for (const to of ["/app/governance", "/app/settings/branding", "/app/command", "/app/risk"]) {
      expect(agent, `agent should NOT see ${to}`).not.toContain(to);
    }
  });
});