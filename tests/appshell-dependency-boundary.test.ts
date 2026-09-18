/**
 * SENTINEL FORT — AppShell dependency-boundary architecture assertion.
 *
 * The global AppShell (src/routes/app.tsx) wraps EVERY /app/* route. If its
 * static import graph reaches the Supreme capability/service graph, then a
 * single broken service module — or any server-only module pulled with it —
 * takes down every authenticated route (CRM, leads, market, inventory, …) and
 * ships the intelligence backend into the browser bundle.
 *
 * This test walks the REAL static import graph from the AppShell and asserts
 * the heavy graph is unreachable. It is deliberately a static-source walk (no
 * bundler, no browser, no network) so it is deterministic and fails loudly the
 * moment someone re-adds an eager import.
 *
 * Static imports only. `await import(...)` is the sanctioned lazy boundary and
 * is intentionally NOT followed — that is how the Companion is allowed to reach
 * real intelligence when (and only when) the user submits a prompt.
 *
 * NON-NEGOTIABLE: this asserts BUNDLING boundaries only. It does not weaken
 * B1/B3/B4, RBAC, RLS, workspace resolution or Supreme authorization — all of
 * which remain server-side and are covered by their own suites.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(REPO_ROOT, "src");

/** Module-resolution candidates for a specifier without an explicit extension. */
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

/** Repo-relative POSIX path, so assertions read the same on Windows and CI. */
function rel(absPath: string): string {
  return relative(REPO_ROOT, absPath).split("\\").join(posix.sep);
}

/** Resolve a local specifier to a real file, or null when it is not local. */
function resolveLocal(specifier: string, fromFile: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = resolve(SRC, specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return null; // bare specifier → node_modules, not our graph
  }

  if (existsSync(base) && !existsSync(resolve(base, "package.json"))) {
    // Direct hit only when it is a file (a bare dir falls through to index.*).
    try {
      if (readFileSync(base).length >= 0 && /\.[a-z]+$/i.test(base)) return base;
    } catch {
      /* it is a directory — fall through */
    }
  }
  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate)) return candidate;
  }
  for (const ext of EXTENSIONS) {
    const candidate = resolve(base, `index${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Extract STATIC, VALUE-level import specifiers from a source file.
 *
 * Deliberately excluded:
 *   - `import type { X } from "y"` / `export type { X } from "y"` — erased by
 *     the compiler, so they cannot affect the runtime bundle.
 *   - `await import("y")` / `import("y")` — the sanctioned lazy boundary.
 */
function staticValueImports(source: string): string[] {
  // Strip block + line comments so commented-out imports never count.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  const specifiers: string[] = [];
  // `import ... from "x"` and `export ... from "x"`, plus bare `import "x"`.
  const re =
    /(?:^|[\s;}])(import|export)(\s+type\b)?([\s\S]*?)?\bfrom\s*["']([^"']+)["']|(?:^|[\s;}])import\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const bareSideEffect = m[5];
    if (bareSideEffect) {
      specifiers.push(bareSideEffect);
      continue;
    }
    const isTypeOnly = Boolean(m[2]);
    if (isTypeOnly) continue;
    const clause = m[3] ?? "";
    const spec = m[4];
    if (!spec) continue;
    // `import { type A, type B } from "x"` — every named binding is a type, so
    // the import is fully erased. A single value binding keeps it.
    const named = clause.match(/\{([\s\S]*)\}/);
    if (named) {
      const bindings = named[1]
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);
      const hasDefaultOrNamespace = /^[\s]*(?:[A-Za-z_$][\w$]*\s*,|\*\s+as)/.test(clause);
      if (
        bindings.length > 0 &&
        !hasDefaultOrNamespace &&
        bindings.every((b) => /^type\s/.test(b))
      ) {
        continue;
      }
    }
    specifiers.push(spec);
  }
  return specifiers;
}

/**
 * Walk the static value-import graph from an entry file.
 *
 * `sever` drops specific edges (by repo-relative path) before traversal. It is
 * used to attribute a violation to ONE known import instead of guessing: cut
 * that edge, re-walk, and see what is left.
 */
function reachableFrom(
  entryAbs: string,
  opts?: { sever?: readonly string[] },
): {
  files: Set<string>;
  parents: Map<string, string>;
} {
  const sever = new Set(opts?.sever ?? []);
  const files = new Set<string>();
  const parents = new Map<string, string>();
  const queue = [entryAbs];
  files.add(rel(entryAbs));

  while (queue.length > 0) {
    const current = queue.shift()!;
    let source: string;
    try {
      source = readFileSync(current, "utf8");
    } catch {
      continue;
    }
    for (const spec of staticValueImports(source)) {
      const resolved = resolveLocal(spec, current);
      if (!resolved) continue;
      const key = rel(resolved);
      if (files.has(key) || sever.has(key)) continue;
      files.add(key);
      parents.set(key, rel(current));
      queue.push(resolved);
    }
  }
  return { files, parents };
}

/** Render the eager import chain that reached a forbidden module. */
function chainTo(target: string, parents: Map<string, string>): string {
  const chain = [target];
  let cursor = target;
  const guard = new Set<string>([target]);
  while (parents.has(cursor)) {
    const parent = parents.get(cursor)!;
    if (guard.has(parent)) break;
    guard.add(parent);
    chain.push(parent);
    cursor = parent;
  }
  return chain.reverse().join("\n    → ");
}

const APP_SHELL = resolve(SRC, "routes/app.tsx");

/**
 * Modules the global AppShell must NEVER reach through a static import.
 * These either construct/reference intelligence services or are server-only
 * (`createServerFn`, role middleware, Supabase service wiring).
 */
const FORBIDDEN = [
  "src/lib/supreme-agent-capabilities.ts",
  "src/lib/supreme-agent-execution.ts",
  "src/lib/supreme-agent-synthesis.ts",
  "src/lib/supreme-agent-processor.ts",
  "src/business-intelligence/market/service.ts",
  "src/business-intelligence/inventory/service.ts",
  "src/business-intelligence/customer/service.ts",
  "src/business-intelligence/supreme/service.ts",
  "src/decision-engine/market/market-risk-evaluator.ts",
  "src/lib/bi.functions.ts",
  "src/lib/customer.functions.ts",
];

describe("ARCHITECTURE — global AppShell dependency boundary", () => {
  const graph = reachableFrom(APP_SHELL);

  it("the AppShell entry itself resolves (guards against a silent no-op test)", () => {
    expect(existsSync(APP_SHELL)).toBe(true);
    // A real graph, not an empty one — otherwise every assertion below is vacuous.
    expect(graph.files.size).toBeGreaterThan(20);
    expect(graph.files.has("src/routes/app.tsx")).toBe(true);
  });

  it("proves the walker follows real edges (AppShell → Sentinel Companion)", () => {
    // Sanity anchor: the Companion MUST stay statically imported (it must remain
    // visible), so this edge is the positive control for the walker.
    expect(graph.files.has("src/components/sentinel/SentinelCompanion.tsx")).toBe(true);
  });

  it.each(FORBIDDEN)(
    "does not eagerly import the heavy Supreme graph: %s",
    (forbidden) => {
      const reached = graph.files.has(forbidden);
      expect(
        reached,
        reached
          ? `AppShell eagerly imports ${forbidden} — every /app/* route now depends on it.\n` +
            `Eager chain:\n    ${chainTo(forbidden, graph.parents)}\n` +
            `Fix: route this through capability METADATA (supreme-agent-capability-meta) ` +
            `or a dynamic import()/server function boundary.`
          : "",
      ).toBe(false);
    },
  );

  it("reaches ZERO forbidden modules in total", () => {
    const violations = FORBIDDEN.filter((f) => graph.files.has(f));
    expect(violations).toEqual([]);
  });

  it("the Companion's routing metadata stays reachable (behaviour preserved)", () => {
    // The Companion must still route prompts against REAL registered capability
    // metadata — the fix moves the source, it does not remove the capability.
    expect(graph.files.has("src/lib/supreme-agent-capability-meta.ts")).toBe(true);
    expect(graph.files.has("src/lib/sentinel-companion.ts")).toBe(true);
  });

  it("does not eagerly import the server-only FORT workspace resolver", () => {
    // fort-workspace.functions.ts is a createServerFn module wired to the
    // Supabase auth middleware. It belongs to /fort's guard, not to every
    // /app/* route.
    expect(graph.files.has("src/lib/fort-workspace.functions.ts")).toBe(false);
    expect(graph.files.has("src/integrations/supabase/auth-middleware.ts")).toBe(false);
  });
});

/* =====================================================================
   ITEM V — the FORT workspace provisioning work must not regress this
   boundary. Three new modules were introduced:

     src/lib/fort-experience.ts                        pure derivation
     src/lib/fort-workspace.functions.ts               server resolver
     src/components/sentinel/FortWorkspaceState.tsx    display states

   Each is pinned below. The pre-existing /fort → supreme-agent-processor
   eager import is deliberately LEFT ALONE (separate, unapproved
   optimisation) — but it is pinned too, so it cannot silently grow.
   ===================================================================== */

describe("ITEM V — FORT derivation layer stays pure and client-safe", () => {
  const graph = reachableFrom(resolve(SRC, "lib/fort-experience.ts"));

  it("reaches no intelligence service, orchestrator or server function", () => {
    expect(FORBIDDEN.filter((f) => graph.files.has(f))).toEqual([]);
  });

  it("declares no Supabase, auth-middleware or server-fn dependency", () => {
    expect(graph.files.has("src/integrations/supabase/client.ts")).toBe(false);
    expect(graph.files.has("src/integrations/supabase/auth-middleware.ts")).toBe(false);
    expect(graph.files.has("src/lib/fort-workspace.functions.ts")).toBe(false);
  });

  it("is exactly the module catalogue + capability METADATA + route table — nothing more", () => {
    // Reuse, not duplication: it derives from the EXISTING vocabularies.
    //
    // route-roles.ts joined this graph when the console (/app) projection was
    // added: the console surfaces routes MODULE_CATALOG does not describe, and
    // the answer for those had to come from the route↔role table that already
    // existed rather than from a third table invented for the purpose. It is a
    // plain object literal with zero imports (pinned below), so it widens the
    // graph by exactly one leaf and carries no runtime weight.
    expect([...graph.files].sort()).toEqual([
      "src/lib/fort-experience.ts",
      "src/lib/fort-modules.ts",
      "src/lib/route-roles.ts",
      "src/lib/supreme-agent-capability-meta.ts",
    ]);
  });

  it("the route↔role table it now reads is itself a pure leaf", () => {
    const routeRoles = reachableFrom(resolve(SRC, "lib/route-roles.ts"));
    expect([...routeRoles.files]).toEqual(["src/lib/route-roles.ts"]);
  });
});

/* =====================================================================
   TASK C — FORT is the authoritative access layer for the /app console.

   The AppShell now resolves the FORT workspace in its own beforeLoad, so
   the sidebar and the console surface are driven by the SERVER's answer
   instead of a browser-side role check. That must not drag the server
   resolver back into the AppShell's static bundle — the whole point of
   ITEM V. The edge has to be a dynamic import, and these assertions pin
   it as such.
   ===================================================================== */

describe("TASK C — the AppShell consumes the resolver across a LAZY boundary", () => {
  const APP_SHELL_SRC = readFileSync(APP_SHELL, "utf8");
  const graph = reachableFrom(APP_SHELL);

  it("resolves the FORT workspace in a route guard (no client-only shell)", () => {
    expect(APP_SHELL_SRC).toMatch(/beforeLoad:\s*async/);
    expect(APP_SHELL_SRC).toContain("resolveFortWorkspace");
  });

  it("reaches the resolver ONLY through await import() — never a static edge", () => {
    // The dynamic form is the sanctioned boundary; the walker deliberately does
    // not follow it, which is exactly why the static graph below stays clean.
    expect(APP_SHELL_SRC).toContain('await import("@/lib/fort-workspace.functions")');
    expect(APP_SHELL_SRC).not.toMatch(/^\s*import[^(]*from\s*["']@\/lib\/fort-workspace\.functions["']/m);
    expect(graph.files.has("src/lib/fort-workspace.functions.ts")).toBe(false);
    expect(graph.files.has("src/integrations/supabase/auth-middleware.ts")).toBe(false);
  });

  it("holds the resolved context through the PURE layer, not the server module", () => {
    // FortWorkspaceContext + fortFallbackContext live in fort-experience.ts so
    // the shell can fail closed without importing createServerFn wiring.
    expect(APP_SHELL_SRC).toContain('from "@/lib/fort-experience"');
    expect(graph.files.has("src/lib/fort-experience.ts")).toBe(true);
  });

  it("still reaches no forbidden module after the change", () => {
    const violations = FORBIDDEN.filter((f) => graph.files.has(f));
    expect(
      violations,
      violations.length
        ? `The FORT access layer pulled the heavy graph into the AppShell:\n    ` +
          violations.map((f) => chainTo(f, graph.parents)).join("\n\n    ")
        : "",
    ).toEqual([]);
  });
});

describe("ITEM V — FORT workspace state surfaces are display-only leaves", () => {
  const graph = reachableFrom(resolve(SRC, "components/sentinel/FortWorkspaceState.tsx"));

  it("imports nothing local at all (pure presentation)", () => {
    expect([...graph.files]).toEqual(["src/components/sentinel/FortWorkspaceState.tsx"]);
  });

  it("cannot reach the resolver, Supabase or the heavy graph", () => {
    expect(graph.files.has("src/lib/fort-workspace.functions.ts")).toBe(false);
    expect(graph.files.has("src/integrations/supabase/client.ts")).toBe(false);
    expect(FORBIDDEN.filter((f) => graph.files.has(f))).toEqual([]);
  });
});

describe("ITEM V — the server resolver is not bundled into the Fort UI", () => {
  /** Pure display components — no server-function edge of any kind. */
  const DISPLAY_SURFACES = [
    "components/sentinel/FortShell.tsx",
    "components/sentinel/FortPage.tsx",
    "components/sentinel/FortWorkspaceState.tsx",
    "routes/fort.broker.tsx",
    "routes/fort.builder.tsx",
    "routes/fort.enterprise.tsx",
    "routes/fort.individual.tsx",
    "routes/fort.platform.tsx",
  ];

  /** Every surface that consumes the resolved context, routes included. */
  const ALL_SURFACES = [...DISPLAY_SURFACES, "routes/fort.index.tsx"];

  it.each(ALL_SURFACES)("%s consumes FortWorkspaceContext as a TYPE only", (surface) => {
    const graph = reachableFrom(resolve(SRC, surface));
    // The context object arrives at runtime through route context (the server
    // resolved it). The display code must never pull the server module in.
    expect(graph.files.has("src/lib/fort-workspace.functions.ts")).toBe(false);
  });

  it.each(DISPLAY_SURFACES)("%s pulls in no server-only auth middleware", (surface) => {
    const graph = reachableFrom(resolve(SRC, surface));
    expect(graph.files.has("src/integrations/supabase/auth-middleware.ts")).toBe(false);
  });

  it("fort.index.tsx's only server edge is the pre-existing Sentinel profile fetch", () => {
    // It reaches auth-middleware transitively through getSentinelProfile, which
    // predates this work. Attribute it precisely rather than pinning a blanket
    // rule the route never satisfied.
    const graph = reachableFrom(resolve(SRC, "routes/fort.index.tsx"));
    expect(graph.files.has("src/lib/sentinel.functions.ts")).toBe(true);
    const severed = reachableFrom(resolve(SRC, "routes/fort.index.tsx"), {
      sever: ["src/lib/sentinel.functions.ts"],
    });
    expect(severed.files.has("src/integrations/supabase/auth-middleware.ts")).toBe(false);
  });

  it.each(ALL_SURFACES)("%s reaches no forbidden module", (surface) => {
    const graph = reachableFrom(resolve(SRC, surface));
    expect(FORBIDDEN.filter((f) => graph.files.has(f))).toEqual([]);
  });

  it("the resolver itself pulls in no intelligence service", () => {
    // It resolves workspace + membership + roles and PROJECTS existing
    // metadata. It must not construct the intelligence stack to do that.
    const graph = reachableFrom(resolve(SRC, "lib/fort-workspace.functions.ts"));
    expect(FORBIDDEN.filter((f) => graph.files.has(f))).toEqual([]);
    expect(graph.files.has("src/lib/fort-experience.ts")).toBe(true);
    expect(graph.files.has("src/integrations/supabase/auth-middleware.ts")).toBe(true);
  });
});

describe("ITEM V — pre-existing /fort eager import is pinned, not worsened", () => {
  const FORT_LAYOUT = resolve(SRC, "routes/fort.tsx");
  const PROCESSOR = "src/lib/supreme-agent-processor.ts";

  it("documents the KNOWN pre-existing violation (left untouched by design)", () => {
    const graph = reachableFrom(FORT_LAYOUT);
    // /fort statically imports processAgentRequest for the Companion's real
    // execution path. That predates this work and is out of scope here.
    expect(graph.files.has(PROCESSOR)).toBe(true);
    expect(readFileSync(FORT_LAYOUT, "utf8")).toContain(
      'from "@/lib/supreme-agent-processor"',
    );
  });

  it("attributes EVERY forbidden module to that one edge — the new work adds none", () => {
    // Sever the single known edge. If anything forbidden is still reachable,
    // the FORT workspace work introduced a NEW eager dependency.
    const severed = reachableFrom(FORT_LAYOUT, { sever: [PROCESSOR] });
    const remaining = FORBIDDEN.filter((f) => severed.files.has(f));
    expect(
      remaining,
      remaining.length
        ? `/fort now reaches the heavy graph through a NEW edge:\n    ` +
          remaining.map((f) => chainTo(f, severed.parents)).join("\n\n    ")
        : "",
    ).toEqual([]);
  });

  it("reaches the heavy graph only through /fort — never through the Fort pages", () => {
    // The layout is the only offender. Every child surface stays clean, so the
    // regression surface did not widen.
    for (const child of [
      "routes/fort.index.tsx",
      "routes/fort.broker.tsx",
      "components/sentinel/FortShell.tsx",
    ]) {
      const graph = reachableFrom(resolve(SRC, child));
      expect(graph.files.has(PROCESSOR)).toBe(false);
    }
  });
});

describe("ARCHITECTURE — capability metadata module stays client-safe", () => {
  const META = resolve(SRC, "lib/supreme-agent-capability-meta.ts");
  const graph = reachableFrom(META);

  it("pulls in no intelligence service, repository, orchestrator or server fn", () => {
    const violations = FORBIDDEN.filter((f) => graph.files.has(f));
    expect(violations).toEqual([]);
  });

  it("declares no Supabase client dependency", () => {
    expect(graph.files.has("src/integrations/supabase/client.ts")).toBe(false);
  });

  it("stays a leaf-ish pure module (types only)", () => {
    // Only supreme-agent-types is expected — and that is type-only, so the
    // value graph should be just the meta module itself.
    expect([...graph.files].sort()).toEqual([
      "src/lib/supreme-agent-capability-meta.ts",
    ]);
  });
});
