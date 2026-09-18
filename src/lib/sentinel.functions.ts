/**
 * SENTINEL FORT — server functions backing the onboarding experience.
 *
 * SECURITY DISCIPLINE (B1/B3/B4):
 *  - Every function requires an authenticated bearer session (requireSupabaseAuth),
 *    so identityId, roles and workspace are always SERVER-resolved — never
 *    client-supplied / never JWT-metadata / never DEFAULT_WORKSPACE_ID.
 *  - `authorizationRoles` below is the DB-backed `user_roles` set, descriptive
 *    only. The experience layer is advisory; it never grants access.
 *  - Persistence is upserted into `sentinel_user_profiles` whose RLS policy
 *    binds rows to auth.uid(). If the migration is not yet applied, writes
 *    degrade to `persistedServer: false` (client keeps a dev-only preview)
 *    instead of throwing — no red screen, no auth bypass.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import type {
  AuthorizationContext,
  BusinessObjectiveId,
  IdentityProfile,
  ObjectiveContext,
  SentinelPersona,
  SentinelIntent,
} from "@/sentinel/types";
import { isPersona } from "@/sentinel/personas";
import { deriveOnboardingState, isProfileComplete } from "@/sentinel/state";

/** Raw row shape for `sentinel_user_profiles`. */
export interface SentinelProfileRow {
  id: string;
  user_id: string;
  workspace_id: string;
  primary_persona: string | null;
  personae: string[];
  intents: string[];
  objective: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Server-built, authoritative authorization context for the experience layer. */
export interface SentinelAuthContext extends AuthorizationContext {
  roles: readonly string[];
}

function toAuthContext(
  userId: string,
  workspaceId: string | null,
  roles: readonly string[],
): SentinelAuthContext {
  return { identityId: userId, workspaceId, roles };
}

export function toIdentityProfile(row: SentinelProfileRow): IdentityProfile {
  const rawPersonae = (row.personae ?? []).filter((p): p is SentinelPersona => isPersona(p));
  const intents = (row.intents ?? []) as SentinelIntent[];
  const rawPrimary = row.primary_persona;
  const primaryPersona: SentinelPersona | null =
    rawPrimary && isPersona(rawPrimary)
      ? (rawPrimary as SentinelPersona)
      : (rawPersonae[0] ?? null);
  const personae: SentinelPersona[] = primaryPersona
    ? (rawPersonae.includes(primaryPersona) ? rawPersonae : [primaryPersona, ...rawPersonae])
    : rawPersonae;
  return {
    identityId: row.user_id,
    personae,
    primaryPersona,
    intents,
    onboarding: deriveOnboardingState({
      personae,
      intents,
      hasProfile: true,
      isReturning: true,
    }),
    workspaceId: row.workspace_id ?? null,
    profileComplete: isProfileComplete(personae, intents),
  };
}

/**
 * Resolve the caller's authorization context SERVER-SIDE.
 * Roles come from `public.user_roles` (DB-backed); workspace from the RLS-safe
 * `current_workspace_id` RPC. Any transient failure is non-fatal: a roleless,
 * workspace-less context is returned so the UI can still render (failing closed
 * downstream). NEVER throws to the caller.
 */
export const getSentinelAuthorizationContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    let workspaceId: string | null = null;
    const roles: string[] = [];
    try {
      workspaceId = await getCurrentWorkspaceId(supabase);
    } catch (e) {
      console.error("[sentinel] workspace resolution failed:", e);
    }
    try {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      for (const r of (data ?? []) as { role: string }[]) {
        roles.push(r.role);
      }
    } catch (e) {
      console.error("[sentinel] role resolution failed:", e);
    }
    return toAuthContext(userId, workspaceId, roles);
  });

/** Fetch the caller's saved Sentinel identity/profile + objective context. */
export const getSentinelProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    let workspaceId: string | null = null;
    try {
      workspaceId = await getCurrentWorkspaceId(supabase);
    } catch (e) {
      console.error("[sentinel] workspace resolution failed:", e);
    }
    if (!workspaceId) {
      return { profile: null, context: {} as Record<string, any>, persisted: false };
    }
    const { data, error } = await (supabase as any)
      .from("sentinel_user_profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) {
      console.error("[sentinel] profile fetch failed:", error);
      return { profile: null, context: {} as Record<string, any>, persisted: false };
    }
    if (!data) return { profile: null, context: {} as Record<string, any>, persisted: false };
    return {
      profile: toIdentityProfile(data as SentinelProfileRow),
      // Serialize as a plain JSON record so the server-fn serializability
      // contract accepts arbitrary context values (client casts back to
      // ObjectiveContext). Values are round-tripped JSON only — no logic.
      context: (data.context ?? {}) as Record<string, any>,
      persisted: true,
    };
  });

const SaveProfileSchema = z.object({
  primaryPersona: z.string().nullable().optional(),
  personae: z.array(z.string()),
  intents: z.array(z.string()),
  objective: z.string().nullable().optional(),
  context: z.record(z.string(), z.any()).optional(),
});

export interface SaveProfileResult {
  persisted: boolean;
  persistedServer: boolean;
}

/**
 * Persist (upsert) the caller's Sentinel identity profile.
 * Workspace is SERVER-resolved (never client-supplied). Best-effort: if the
 * table/migration is absent, returns persistedServer=false and the caller keeps
 * the dev-only preview in localStorage. NEVER throws to the caller.
 */
export const saveSentinelProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(SaveProfileSchema)
  .handler(async ({ context, data }): Promise<SaveProfileResult> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    let workspaceId: string | null = null;
    try {
      workspaceId = await getCurrentWorkspaceId(supabase);
    } catch (e) {
      console.error("[sentinel] workspace resolution failed:", e);
    }
    if (!workspaceId) return { persisted: true, persistedServer: false };
    try {
      const { error } = await (supabase as any).from("sentinel_user_profiles").upsert({
        user_id: userId,
        workspace_id: workspaceId,
        primary_persona: data.primaryPersona ?? null,
        personae: data.personae,
        intents: data.intents,
        objective: data.objective ?? null,
        context: data.context ?? {},
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return { persisted: true, persistedServer: true };
    } catch (e) {
      console.error("[sentinel] profile save failed (table may be unmigrated):", e);
      return { persisted: true, persistedServer: false };
    }
  });

/**
 * Persist the assembled identity profile for a given identity.
 * The caller already built the IdentityProfile client-side; this writes the
 * canonical fields back to the server so returning users skip onboarding.
 */
export async function persistIdentityProfile(
  profile: IdentityProfile,
  objective: BusinessObjectiveId | null,
  context: ObjectiveContext,
) {
  return saveSentinelProfile({
    data: {
      primaryPersona: profile.primaryPersona,
      personae: profile.personae,
      intents: profile.intents,
      objective,
      context,
    },
  });
}

/** Build a minimal IdentityProfile from the authenticated session (new user path). */
export function buildIdentityProfileFromAuth(
  userId: string,
  workspaceId: string | null,
  personae: SentinelPersona[],
  intents: SentinelIntent[],
): IdentityProfile {
  const collectedBaseline = personae.length > 0 && intents.length > 0;
  return {
    identityId: userId,
    personae,
    primaryPersona: collectedBaseline ? personae[0] : null,
    intents,
    onboarding: deriveOnboardingState({
      personae,
      intents,
      hasProfile: !collectedBaseline, // auth-only user = no saved profile yet
      isReturning: !!userId,
    }),
    workspaceId,
    profileComplete: isProfileComplete(personae, intents),
  };
}

// =============================================================
// FORT SHELL PREVIEWS — REAL DATA ONLY
// =============================================================
//
// Lightweight activity metrics for the FORT single-window home. Every value is
// either a REAL RLS-scoped count from the caller's own database visibility or
// null ("unknown / not available"). There is NO fabricated or placeholder
// number anywhere in this path: null renders as an explicit honest empty state
// in the UI, never as a fake zero dressed up as data.
//
// SECURITY: authenticated bearer session only; every query runs through the
// caller's own RLS-scoped Supabase client, so a user can never observe another
// workspace's rows regardless of what this function asks for.

/** One preview metric. value === null means "not available" — never invented. */
export interface FortShellMetric {
  label: string;
  value: number | null;
}

export interface FortShellPreviewsResult {
  ok: boolean;
  /** Whether the caller's FORT workspace could be resolved server-side. */
  workspaceResolved: boolean;
  /** route -> metric name -> REAL count (or null when unavailable). */
  previews: Record<string, Record<string, number | null>>;
}

/** Which tables back which shell, and what each count is called in the UI. */
const SHELL_SOURCES: ReadonlyArray<{
  route: string;
  table: string;
  metrics: ReadonlyArray<readonly [label: string, column: string]>;
}> = [
  {
    route: "/app/crm",
    table: "leads",
    metrics: [["leads", "*"]],
  },
  {
    route: "/app/leads",
    table: "leads",
    metrics: [["leads", "*"]],
  },
  {
    route: "/app/marketplace",
    table: "properties",
    metrics: [["properties", "*"]],
  },
  {
    route: "/app/market",
    table: "market_listings",
    metrics: [["listings", "*"]],
  },
  {
    route: "/app/dealrooms",
    table: "deals",
    metrics: [["deals", "*"]],
  },
  {
    route: "/app/activities",
    table: "activities",
    metrics: [["activities", "*"]],
  },
];

/**
 * Real, RLS-scoped activity counts for the FORT home shells. NEVER throws:
 * any per-table failure degrades that metric to null so the shell can show its
 * honest empty/unavailable state instead of an error or a made-up number.
 */
export const getFortShellPreviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FortShellPreviewsResult> => {
    const { supabase } = context as { supabase: any; userId: string };

    let workspaceResolved = false;
    try {
      workspaceResolved = !!(await getCurrentWorkspaceId(supabase));
    } catch {
      workspaceResolved = false;
    }

    const previews: Record<string, Record<string, number | null>> = {};
    await Promise.all(
      SHELL_SOURCES.map(async ({ route, table, metrics }) => {
        const entry: Record<string, number | null> = {};
        await Promise.all(
          metrics.map(async ([label]) => {
            try {
              const { count, error } = await (supabase as any)
                .from(table)
                .select("*", { count: "exact", head: true });
              entry[label] = error ? null : (count ?? 0);
            } catch {
              entry[label] = null; // table missing / transient failure → honest null
            }
          }),
        );
        previews[route] = entry;
      }),
    );

    return { ok: true, workspaceResolved, previews };
  });
