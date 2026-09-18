/**
 * SENTINEL FORT — Fort preview + authenticated Fort shell.
 *
 * Both are EXPERIENCE surfaces only.
 *
 * When a server-resolved `workspace` context is supplied, module state comes
 * STRAIGHT FROM THE SERVER (resolveFortWorkspace → resolveFortModules) and this
 * component performs no authorization reasoning of its own. Without it, the
 * legacy advisory role filter is used — still only a display filter.
 *
 * THE SIDEBAR IS NOT THE AUTHORIZATION LAYER. A visible module is not a granted
 * module: each route keeps its own beforeLoad gate, each server function keeps
 * requireRoles(), Supreme keeps ORCHESTRATION_EXEC_ROLES, and RLS bounds the
 * data. Nothing rendered here — and no client state behind it — grants access.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LockKeyhole, ArrowRight, ShieldCheck, Sparkle } from "lucide-react";
import type { FortDefinition } from "@/sentinel/forts";
import type {
  BusinessObjectiveId,
  ExperienceProfile,
  SentinelIntent,
  SentinelPersona,
} from "@/sentinel/types";
import { Badge } from "@/components/ui/badge";
import { MODULE_CATALOG, partitionModules, type ModuleCard } from "@/lib/fort-modules";
import { capabilityLabel } from "@/sentinel/forts";
import { ROUTE_ROLES } from "@/lib/route-roles";
import type { FortShellPreviewsResult } from "@/lib/sentinel.functions";
import type { AppRole } from "@/hooks/use-auth";
import type { FortModuleGrant } from "@/lib/fort-experience";
import type { FortWorkspaceContext } from "@/lib/fort-workspace.functions";
import {
  FortWorkspaceStateSurface,
  FortUnauthorizedState,
} from "@/components/sentinel/FortWorkspaceState";

/** Authenticated Fort shell — a distinct surface from the generic CRM shell. */
export function FortShell({
  fort,
  primaryPersona,
  personas,
  roles,
  userName,
  contextSummary,
  workspace,
}: {
  fort: FortDefinition;
  primaryPersona?: SentinelPersona | null;
  personas?: readonly SentinelPersona[];
  intent?: SentinelIntent | null;
  objective?: BusinessObjectiveId | null;
  roles: readonly string[];
  userName?: string | null;
  contextSummary?: string | null;
  /**
   * Server-resolved workspace context. When present it is AUTHORITATIVE for
   * what this shell displays. Absent → legacy advisory filter.
   */
  workspace?: FortWorkspaceContext | null;
}) {
  /**
   * Project this Fort's route list onto the SERVER's per-route decision. A
   * route the server did not report is UNAVAILABLE — never optimistically
   * shown. Fort order is preserved.
   */
  const grants = useMemo<FortModuleGrant[] | null>(() => {
    if (!workspace) return null;
    const byRoute = new Map(workspace.modules.map((g) => [g.route, g]));
    return fort.modules.map(
      (route) =>
        byRoute.get(route) ?? {
          route,
          state: "UNAVAILABLE" as const,
          capabilityId: null,
          capabilityExecutable: false,
        },
    );
  }, [workspace, fort.modules]);

  const legacy = useMemo(
    () => partitionModules(fort.modules, roles),
    [fort.modules, roles],
  );

  /**
   * REAL preview metrics for open shells, fetched once per mount. Every count
   * comes back RLS-scoped to the caller's own visibility; `null` values mean
   * "not available" and render as an honest empty state — never a fabricated
   * number. Fetch failure degrades silently: previews are descriptive only.
   */
  const [previews, setPreviews] = useState<FortShellPreviewsResult["previews"] | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    // LAZY BOUNDARY (the sanctioned pattern asserted by
    // appshell-dependency-boundary): sentinel.functions carries the server-only
    // auth middleware, so it must never be a STATIC import from a display
    // surface. The dynamic import keeps the server graph out of this surface's
    // bundle until the preview fetch actually runs — and a failure degrades to
    // "no previews", never an error screen.
    void import("@/lib/sentinel.functions")
      .then((m) => m.getFortShellPreviews())
      .then((res) => {
        if (active) setPreviews(res?.previews ?? {});
      })
      .catch(() => {
        if (active) setPreviews({});
      });
    return () => {
      active = false;
    };
  }, []);

  const cardsFor = (state: FortModuleGrant["state"]): ModuleCard[] =>
    (grants ?? [])
      .filter((g) => g.state === state)
      .map((g) => MODULE_CATALOG[g.route])
      .filter((c): c is ModuleCard => Boolean(c));

  const modules = grants ? cardsFor("ACTIVE") : legacy.active;
  const lockedModules = grants ? cardsFor("LOCKED") : legacy.locked;

  /**
   * "Visible but not executable" — represented honestly.
   *
   * A route may be reachable while the protected intelligence operation behind
   * it still requires a higher access level (e.g. /app/market is visible to
   * viewer, market.getContext requires admin/manager). Those modules are shown
   * WITH that distinction stated, not silently promised.
   */
  const advisoryOnly = new Set(
    (grants ?? [])
      .filter((g) => g.state === "ACTIVE" && g.capabilityId && !g.capabilityExecutable)
      .map((g) => g.route),
  );

  const siGrant = grants?.find((g) => g.route === SUPREME_INTELLIGENCE_ROUTE) ?? null;
  const siAllowed = grants
    ? siGrant?.state === "ACTIVE"
    : ROUTE_ROLES["/app/supreme-intelligence"]?.some((r) => roles.includes(r));
  // Execution authority is ORCHESTRATION_EXEC_ROLES via the capability's own
  // requiredRoles. Seeing the card never implies being able to run it.
  const siExecutable = grants ? Boolean(siGrant?.capabilityExecutable) : undefined;

  const workspaceStatus = workspace?.status ?? "ACTIVE";
  const workspaceResolved = workspaceStatus === "ACTIVE";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* Hero */}
      <header className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          <TargetIcon /> {fort.label}
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{fort.welcome}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">{fort.tagline}</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground/80">{fort.mission}</p>
      </header>

      {/* Identity strip */}
      {(primaryPersona || (personas ?? []).length > 0 || contextSummary) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          {userName && (
            <Badge variant="outline" className="py-1">
              {userName}
            </Badge>
          )}
          {contextSummary && (
            <Badge variant="outline" className="py-1">
              ✦ {contextSummary}
            </Badge>
          )}
          {personas?.map((p) => (
            <Badge key={p} variant="secondary" className="text-[10px]">
              {p}
            </Badge>
          ))}
          <Badge variant="outline" className="text-[10px] text-muted-foreground/70">
            Experience preview — advisory
          </Badge>
        </div>
      )}

      {/* Supreme Intelligence — the intelligence layer across every Fort */}
      {workspaceResolved && siAllowed && (
        <Link
          to={SUPREME_INTELLIGENCE_ROUTE}
          className="mt-8 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 transition hover:border-primary/60"
        >
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Supreme Intelligence</div>
              <div className="text-xs text-muted-foreground">
                {fort.intelligence.join(" · ")} — across every domain in your {fort.label}.
              </div>
              {/* §6: visible ≠ executable. Stated, never implied away. */}
              {siExecutable === false && (
                <div className="mt-1 text-[11px] text-muted-foreground/80">
                  Read-only for your access level — orchestration requires a higher access
                  level.
                </div>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      )}

{/* Today's intelligence + what Sentinel is focused on (derived from real
      advisory Fort data + role-gated capability labels — never fabricated) */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/20 bg-card/50 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Today's intelligence
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {fort.intelligence.map((mode) => (
              <Badge key={mode} variant="secondary" className="text-[10px]">
                {mode}
              </Badge>
            ))}
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Next best action
            </div>
            <p className="mt-1 text-sm text-foreground/90">
              {fort.actions[0] ?? "Review your experience to define a focus."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-card/50 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            What Sentinel is doing for you
          </div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Monitoring
          </div>
          {fort.capabilities.length > 0 ? (
            <ul className="mt-1.5 space-y-1 text-sm text-foreground/85">
              {fort.capabilities.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <Sparkle className="h-3 w-3 shrink-0 text-primary" />
                  {capabilityLabel(c)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Intelligence data unavailable.
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground/70">
            Access to each intelligence surface stays governed by server-side
            authorization. This page only reports capability labels.
          </p>
        </div>
      </section>
      {/* Capabilities: real platform modules, resolved SERVER-side */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Your technology surface
        </h2>

        {/*
          NEVER a dead end. When the workspace is not resolved we report the
          ACTUAL state (provisioning / awaiting / error) instead of the old
          "you have no modules" message — and we never fake access to fill it.
        */}
        {!workspaceResolved ? (
          <div className="mt-3">
            <FortWorkspaceStateSurface
              status={workspaceStatus}
              membershipPending={workspace?.reason === "MEMBERSHIP_PENDING"}
            />
          </div>
        ) : (
          <>
            {modules.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => {
                  const grant = grants?.find((g) => g.route === m.route);
                  return (
                    <ModuleCardLink
                      key={m.route}
                      card={m}
                      accessMode={grant?.accessMode}
                      advisoryOnly={advisoryOnly.has(m.route)}
                      metrics={previews ? (previews[m.route] ?? null) : null}
                    />
                  );
                })}
              </div>
            )}
            {modules.length === 0 && lockedModules.length === 0 && (
              <div className="mt-3">
                <FortUnauthorizedState />
              </div>
            )}
            {modules.length === 0 && lockedModules.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No module in this Fort is open at your current access level. The modules below
                exist and become available with the appropriate access.
              </p>
            )}
            {lockedModules.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lockedModules.map((m) => (
                  <LockedModuleCard key={m.route} card={m} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Planned (coming soon) */}
      {fort.planned.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Coming next in your Fort
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {fort.planned.map((p) => (
              <Badge key={p} variant="secondary" className="text-[11px] opacity-70">
                {p} — planned
              </Badge>
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-center text-[11px] text-muted-foreground/70">
        Experience recommendations are advisory. Your access is decided by server-side authorization
        (DB-backed roles + RLS) — never by this page.
      </p>
    </div>
  );
}

function ModuleCardLink({
  card,
  accessMode,
  advisoryOnly,
  metrics,
}: {
  card: ModuleCard;
  accessMode?: "VIEW_ONLY" | "OPERATIONAL" | "ADMINISTRATIVE" | "LOCKED" | "UNAVAILABLE";
  /** Route is open, but its protected intelligence operation is not. */
  advisoryOnly?: boolean;
  /**
   * REAL RLS-scoped counts for this shell, or null while loading/unavailable.
   * While null nothing renders (no flash of fake data); once loaded, a missing
   * entry simply shows no metric row.
   */
  metrics: Record<string, number | null> | null;
}) {
  const Icon = card.icon;
  const metricEntries = Object.entries(metrics ?? {});
  const isViewOnly = accessMode === "VIEW_ONLY";

  return (
    <Link
      to={card.route}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-lg"
    >
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{card.label}</span>
          {isViewOnly && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 uppercase tracking-wider">
              View Only
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{card.description}</div>
        {metricEntries.length > 0 && (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {metricEntries.map(([label, value]) =>
              value === null ? (
                /* Honest empty state — never dress an unknown up as a zero. */
                <span
                  key={label}
                  className="text-[11px] text-muted-foreground/70"
                >
                  {label}: not available yet
                </span>
              ) : (
                <span
                  key={label}
                  className="inline-flex items-baseline gap-1"
                  aria-label={`${value} ${label}`}
                >
                  <span className="text-sm font-semibold text-primary">{value}</span>
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </span>
              ),
            )}
          </div>
        )}
        {advisoryOnly && !isViewOnly && (
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            view only · protected actions need higher access
          </div>
        )}
      </div>
    </Link>
  );
}

/** Inert display of a module this account's roles do not permit. Never a
 *  link, never grants anything — the route's own gate is the authority. */
function LockedModuleCard({ card }: { card: ModuleCard }) {
  const Icon = card.icon;
  return (
    <div
      aria-disabled="true"
      className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-4 opacity-60"
    >
      <div className="rounded-lg border border-border bg-muted p-2">
        <LockKeyhole className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="font-medium">{card.label}</div>
        <div className="text-xs text-muted-foreground">Available with appropriate access</div>
      </div>
    </div>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return <span className={className}>◆</span>;
}

export const SUPREME_INTELLIGENCE_ROUTE = "/app/supreme-intelligence";

export function siAllowedFor(roles: readonly string[]): boolean {
  return (ROUTE_ROLES["/app/supreme-intelligence"] ?? []).some((r) => roles.includes(r as AppRole));
}

/** Pre-enter preview — the "YOUR SENTINEL EXPERIENCE" moment. */
export function FortPreview({
  fort,
  persona,
  experience,
}: {
  fort: FortDefinition | null;
  persona: SentinelPersona | null;
  experience?: ExperienceProfile | null;
}) {
  const objectiveLabel = experience?.objective?.label ?? null;
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xl">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        <TargetIcon /> Your Sentinel Experience
      </div>
      {fort ? (
        <>
          <h3 className="mt-3 text-2xl font-semibold">{fort.welcome}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{fort.tagline}</p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Designed for: {fort.personae.join(" · ")}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SummaryTile label="Persona" value={persona ?? "—"} />
            <SummaryTile label="Objective" value={objectiveLabel ?? "—"} />
          </div>

          <div className="mt-5">
            <div className="text-xs font-medium text-muted-foreground">
              What Sentinel Intelligence will provide
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {fort.capabilities.map((c) => (
                <CapabilityCard key={c} label={capabilityLabel(c)} />
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <SummaryRows label="Intelligence focus" items={fort.intelligence} />
            <SummaryRows label="Next-best actions" items={fort.actions} />
            {experience?.modules?.length ? (
              <SummaryRows label="Modules" items={experience.modules} />
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Choose who you are to prepare your Sentinel Fort.
        </p>
      )}

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-dashed border-muted-foreground/40 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          This is an <strong>advisory experience preview</strong>. Nothing here grants access — your
          account permissions are decided by server-side authorization after you sign in.
        </span>
      </div>
    </div>
  );
}

function CapabilityCard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
      <Sparkle className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SummaryRows({ label, items }: { label: string; items: readonly string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <span className="mt-0.5 w-36 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Badge key={i} variant="secondary" className="text-[10px]">
            {i}
          </Badge>
        ))}
      </div>
    </div>
  );
}
