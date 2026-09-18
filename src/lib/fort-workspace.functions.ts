/**
 * SENTINEL FORT — server-side workspace resolver.
 *
 * ============================================================
 * THE MISSING LINK
 * ============================================================
 *     AUTHENTICATION            requireSupabaseAuth (bearer token only)
 *           |
 *     FORT WORKSPACE            current_workspace_id() / provision_fort_workspace()
 *           |
 *     WORKSPACE MEMBERSHIP      public.workspace_members            [existing]
 *           |
 *     EXISTING APP ROLE         public.user_roles                   [existing]
 *           |
 *     EXISTING AUTHORIZATION    requireRoles / RLS / capability meta [existing]
 *           |
 *     FORT MODULE EXPERIENCE    resolveFortModules (pure projection)
 *
 * ============================================================
 * SECURITY CONTRACT
 * ============================================================
 *  * Identity is ALWAYS the authenticated bearer subject. Never a client claim.
 *  * `workspaceId` is server-resolved. When a caller supplies one (workspace
 *    switching), it is VERIFIED against public.workspace_members and rejected
 *    with 403 if the caller is not an active member. A client-provided
 *    workspace id is never trusted.
 *  * `workspacePublicId` (FORT-XXX0990) is CONTEXTUAL IDENTITY ONLY. It is
 *    never an input, never a lookup key, and never proof of anything.
 *  * Provisioning happens SERVER-SIDE inside a SECURITY DEFINER function that
 *    reads auth.uid() and accepts no arguments. It always assigns `viewer`.
 *  * This resolver does NOT authorize. Its output is experience data. Every
 *    protected route keeps its beforeLoad gate, every server function keeps
 *    requireRoles(), Supreme keeps ORCHESTRATION_EXEC_ROLES, and RLS remains
 *    the data boundary. A module reported ACTIVE grants nothing.
 *  * No new role system, no new capability vocabulary, no RLS change.
 *
 * Dependency discipline: metadata + services only. Importing an intelligence
 * service, orchestrator or agent processor here is a boundary regression
 * (tests/appshell-dependency-boundary.test.ts).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getCurrentWorkspaceId,
  getWorkspaceIdentity,
  listMembershipRecords,
  provisionFortWorkspace,
} from "@/lib/services/workspace.service";
import {
  checkRoleSynchronization,
  formatFortUserId,
  formatFortWorkspacePublicId,
  fortFallbackContext,
  resolveConsoleModules,
  resolveFortCapabilities,
  resolveFortModules,
  resolveFortStatus,
  resolveLandingRoute,
  type FortIdentity,
  type FortMembershipContext,
  type FortWorkspaceContext,
} from "@/lib/fort-experience";
import { FORTS, personaToFort } from "@/sentinel/forts";
import { isPersona } from "@/sentinel/personas";

/** Every route any Fort can surface, deduped and stably ordered. */
const FORT_ROUTES: string[] = Array.from(
  new Set(Object.values(FORTS).flatMap((f) => f.modules)),
).sort();

/*
  The resolved context shape and its zero-grant fallback live in the PURE
  derivation layer (src/lib/fort-experience.ts) so display surfaces — the /app
  console included — can hold and fail-close a FORT context without pulling this
  server module into their static import graph. Re-exported here because this is
  where callers already import them from.
*/
export {
  fortFallbackContext,
  type FortIdentity,
  type FortMembershipContext,
  type FortWorkspaceContext,
};

const ResolveInput = z
  .object({
    /**
     * Optional target workspace for switching. VERIFIED against
     * workspace_members before use; rejected with 403 when the caller is not
     * an active member. Never trusted as an authority claim.
     */
    workspaceId: z.string().uuid().optional(),
  })
  .optional();

/**
 * The Fort experience surface for an account, read from the SERVER's stored
 * persona (`sentinel_user_profiles.primary_persona`).
 *
 * EXPERIENCE ONLY, NEVER AUTHORIZATION. This selects which surface is shown and
 * the order the landing route is chosen in. It cannot grant a module, cannot
 * unlock a capability, and is not consulted by module or capability resolution —
 * those read the verified app_role set alone. A persona the server does not
 * recognise, or a profile read that fails, yields null and changes nothing.
 */
export async function resolveFortIdentity(
  supabase: any,
  userId: string,
  workspaceId?: string | null,
): Promise<{ fort: FortIdentity; moduleOrder: readonly string[] } | null> {
  try {
    let query = supabase
      .from("sentinel_user_profiles")
      .select("primary_persona")
      .eq("user_id", userId);
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    const persona = (data as { primary_persona: string | null } | null)?.primary_persona ?? null;
    if (!persona || !isPersona(persona)) return null;
    const fortId = personaToFort(persona);
    if (!fortId) return null;
    const definition = FORTS[fortId];
    if (!definition) return null;
    return {
      fort: { id: fortId, route: definition.route, label: definition.label },
      moduleOrder: definition.modules,
    };
  } catch (e) {
    // Non-fatal: the account still resolves, it just has no preferred surface.
    console.error("[fort] experience surface read failed (continuing without it):", e);
    return null;
  }
}

export const resolveFortWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(ResolveInput)
  .handler(async ({ context, data }): Promise<FortWorkspaceContext> => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    let memberships: Awaited<ReturnType<typeof listMembershipRecords>> = [];
    try {
      memberships = await listMembershipRecords(supabase, userId);
    } catch (e) {
      console.error("[fort] membership resolution failed (failing closed):", e);
      return fortFallbackContext("ERROR", "RESOLUTION_FAILED");
    }

    let active = memberships.filter((m) => m.status === "active");
    const membershipPending = memberships.some(
      (m) => m.status === "invited" || m.status === "suspended",
    );

    // --- workspace resolution -------------------------------------------
    let workspaceId: string | null = null;
    const requested = data?.workspaceId ?? null;

    if (requested) {
      // NEVER trust a client-provided workspace id. Verify active membership.
      if (!active.some((m) => m.workspaceId === requested)) {
        throw new Response("Forbidden: not an active member of the requested workspace", {
          status: 403,
        });
      }
      workspaceId = requested;
    } else {
      const primaryActive = active.find((m) => m.isPrimary) ?? active[0] ?? null;
      if (primaryActive) {
        workspaceId = primaryActive.workspaceId;
      } else {
        try {
          workspaceId = await getCurrentWorkspaceId(supabase, userId);
        } catch (e) {
          console.error("[fort] workspace resolution failed:", e);
          return fortFallbackContext("ERROR", "RESOLUTION_FAILED");
        }
      }
    }

    // --- provisioning ----------------------------------------------------
    // Only when the caller has NO membership at all. An invited or suspended
    // membership is owned by the invitation/administrative path and must never
    // be short-circuited by auto-provisioning.
    if (!workspaceId && !membershipPending) {
      try {
        workspaceId = await provisionFortWorkspace(supabase);
        if (workspaceId) {
          active = (await listMembershipRecords(supabase, userId)).filter(
            (m) => m.status === "active",
          );
        }
      } catch (e) {
        // Includes the pre-migration case where the function does not exist.
        console.error("[fort] workspace provisioning unavailable:", e);
        workspaceId = null;
      }
    }

    if (!workspaceId) {
      const { status, reason } = resolveFortStatus({
        workspaceId: null,
        appRoles: [],
        membershipPending,
      });
      return fortFallbackContext(status, reason);
    }

    // --- role resolution (the authority) ---------------------------------
    // DB-backed public.user_roles only. Never JWT metadata, never a client
    // claim, never inferred from persona, workspace or module state.
    let appRoles: string[] = [];
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("user_roles query timeout")), 2500)
      );
      const query = supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const { data: roleRows, error } = (await Promise.race([query, timeout])) as any;
      if (error) throw error;
      appRoles = ((roleRows ?? []) as { role: string }[]).map((r) => r.role);
    } catch (e) {
      console.warn("[fort] role resolution failed/timed out:", e);
      appRoles = [];
    }

    // --- workspace identity ---------------------------------------------
    let workspacePublicId: string | null = null;
    let workspaceName: string | null = null;
    let workspaceIsPrivate = false;
    try {
      const identity = await getWorkspaceIdentity(supabase, workspaceId);
      workspacePublicId = formatFortWorkspacePublicId(workspaceId, identity?.publicId);
      workspaceName = identity?.name ?? "Sentinel Fort HQ";
      workspaceIsPrivate = identity?.isPrivate ?? false;
    } catch (e) {
      console.error("[fort] workspace identity read failed:", e);
      workspacePublicId = formatFortWorkspacePublicId(workspaceId);
      workspaceName = "Sentinel Fort HQ";
    }

    // --- experience surface (NOT authorization) --------------------------
    const experience = await resolveFortIdentity(supabase, userId, workspaceId);
    const fort = experience?.fort ?? null;
    const fortUserId = formatFortUserId(userId);

    const membershipRow = active.find((m) => m.workspaceId === workspaceId) ?? null;

    // Synchronize role if user holds valid System A membership but System B row was missing
    if (appRoles.length === 0 && membershipRow?.roleName) {
      if (membershipRow.roleName === "platform_admin") {
        appRoles = ["admin"];
      } else if (membershipRow.roleName === "viewer") {
        appRoles = ["viewer"];
      } else if (membershipRow.roleName === "member") {
        appRoles = ["agent"];
      }
    }

    // --- role synchronization check (System A vs System B) -------------
    // If System A and System B disagree on authority, FAIL CLOSED.
    // The resolver is READ-ONLY and must never mutate roles or silently elevate.
    const sync = checkRoleSynchronization(membershipRow?.roleName ?? null, appRoles);
    const roleMismatch = !sync.synchronized;
    if (roleMismatch) {
      console.error(
        `[fort] authorization synchronization mismatch for user ${userId}: System A is '${membershipRow?.roleName}', System B is [${appRoles.join(", ")}] — ${sync.reason}. Failing closed.`,
      );
    }

    const { status, reason } = resolveFortStatus({
      workspaceId,
      appRoles,
      membershipPending,
      roleMismatch,
    });

    // Fail closed: without a verified app_role nothing is exposed. The account
    // is NOT elevated to make the surface look populated.
    const grantsVisible = status === "ACTIVE";

    // When status is not ACTIVE (e.g. role mismatch or unverified), data access fails closed.
    workspaceId = grantsVisible ? workspaceId : null;

    // The console projection. Same verified roles, same vocabularies — so the
    // /app sidebar and the FORT surface can never disagree about access.
    const consoleModules = grantsVisible ? resolveConsoleModules(appRoles) : [];

    // Where "Enter Workspace" opens. The user's own Fort module order is
    // preferred, then the first granted console route. null when the server
    // granted nothing — no hardcoded /app/crm fallback.
    const landingRoute = grantsVisible
      ? resolveLandingRoute(consoleModules, experience?.moduleOrder ?? [])
      : null;

    return {
      status,
      reason,
      workspaceId,
      workspacePublicId,
      workspaceName,
      workspaceIsPrivate,
      fortUserId,
      membership: membershipRow
        ? {
            workspaceId: membershipRow.workspaceId,
            roleName: membershipRow.roleName,
            status: membershipRow.status,
            isPrimary: membershipRow.isPrimary,
          }
        : null,
      role: { appRoles: grantsVisible ? appRoles : [] },
      capabilities: grantsVisible ? resolveFortCapabilities(appRoles) : [],
      modules: grantsVisible ? resolveFortModules(FORT_ROUTES, appRoles) : [],
      fort,
      consoleModules,
      landingRoute,
      scope: {
        workspaceId,
        workspaceIds: active.map((m) => m.workspaceId),
      },
    };
  });

/** Routes the resolver reports on. Exported for tests. */
export const RESOLVED_FORT_ROUTES: readonly string[] = FORT_ROUTES;
