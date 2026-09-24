import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FORTS, personaToFort, resolveWelcomeFort, fortPrimaryPersona } from "@/sentinel/forts";
import { loadExperienceDraft } from "@/lib/experience-draft";
import { getSentinelProfile } from "@/lib/sentinel.functions";
import { FortWorkspaceStateSurface } from "@/components/sentinel/FortWorkspaceState";
import { useAuth } from "@/hooks/use-auth";
import {
  checkRoleSynchronization,
  canExecuteCapability,
  defaultPersonaForRoles,
  fortFallbackContext,
  type FortWorkspaceContext,
} from "@/lib/fort-experience";
import type { SentinelPersona } from "@/sentinel/types";
import { isPersona } from "@/sentinel/personas";
import { FortDashboard } from "@/components/sentinel/FortDashboard";

interface FortUser {
  id: string;
  workspaceId: string | null;
  roles: string[];
}

export const Route = createFileRoute("/fort/")({
  component: FortWelcome,
});

/** Upper bound on the "Preparing…" state. Never wait on it indefinitely. */
const PREPARING_TIMEOUT_MS = 4000;

function FortWelcome() {
  const context = Route.useRouteContext() as {
    user?: FortUser;
    fort?: FortWorkspaceContext;
  };
  const workspace = context.fort ?? fortFallbackContext("AWAITING", "RESOLUTION_FAILED");
  const user = context.user ?? { id: "", workspaceId: null, roles: [] };
  const workspaceResolved = workspace.status === "ACTIVE";
  const draft = useMemo(() => loadExperienceDraft(), []);
  const [profilePersona, setProfilePersona] = useState<SentinelPersona | null>(null);
  const [ready, setReady] = useState(false);

  // Best-effort returning-user profile (server fn). Never a blocker.
  useEffect(() => {
    let active = true;
    getSentinelProfile()
      .then((res) => {
        const profile = (res as { profile?: { primaryPersona?: string | null } | null } | null)
          ?.profile;
        if (active && profile?.primaryPersona && isPersona(profile.primaryPersona)) {
          setProfilePersona(profile.primaryPersona);
        }
      })
      .catch(() => {
        /* server profile unavailable — degrade to draft experience */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  /*
    "Preparing" is BOUNDED. The profile fetch is best-effort, so a request that
    never settles (hung connection, dropped network) must not strand the user on
    a spinner forever — after the deadline we continue with whatever we have.
    The workspace context is already resolved by the layout guard, so proceeding
    early loses nothing but the optional persona hint.
  */
  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setReady(true), PREPARING_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  const userRoles = workspace.role?.appRoles ?? user.roles ?? [];
  const { persona, fortId } = useMemo(
    () =>
      resolveWelcomeFort({
        workspaceFort: (workspace.fort as any) ?? null,
        profilePersona: profilePersona ?? (userRoles.length > 0 ? defaultPersonaForRoles(userRoles) : null),
        draft,
      }),
    [workspace.fort, profilePersona, draft, userRoles],
  );

  const { user: authUser } = useAuth();
  useEffect(() => {
    try {
      const appRoles = workspace.role?.appRoles ?? user?.roles ?? [];
      const diagnostic = {
        userEmail: authUser?.email ?? null,
        userId: user?.id ?? "",
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        workspaceRole: workspace.membership?.roleName ?? null,
        appRole: appRoles,
        primaryPersona: profilePersona ?? (workspace.fort ? fortPrimaryPersona(workspace.fort.id as any) : null),
        personae: profilePersona ? [profilePersona] : [],
        experienceProfile: profilePersona,
        workspaceFort: workspace.fort?.id ?? null,
        workspaceStatus: workspace.status,
        grantsVisible: workspace.status === "ACTIVE",
        roleSynchronization: checkRoleSynchronization(workspace.membership?.roleName ?? null, appRoles),
        consoleModules: (workspace.consoleModules ?? []).map((m) => m.route),
        activeRoutes: (workspace.consoleModules ?? []).filter((m) => m.state === "ACTIVE").map((m) => m.route),
        landingRoute: workspace.landingRoute,
        supremeIntelligenceAuthorized: canExecuteCapability("supreme.orchestrate", appRoles),
      };
      console.info("[FORT ROUTING DIAGNOSTIC]", diagnostic);
    } catch (e) {
      console.warn("[FORT ROUTING DIAGNOSTIC ERROR]", e);
    }
  }, [authUser, user, workspace, profilePersona]);

  if (!ready) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-sm text-stone-500 font-medium">Preparing Sentinel Fort…</p>
      </div>
    );
  }

  /*
    The server did not resolve an active workspace. Report the real state — do
    NOT claim "your Fort is ready", and do not navigate into a Fort surface as
    if access existed.
  */
  if (!workspaceResolved) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-20">
        <div className="mt-8">
          <FortWorkspaceStateSurface
            status={workspace.status}
            reason={workspace.reason}
            membershipPending={workspace.reason === "MEMBERSHIP_PENDING"}
          />
        </div>
      </div>
    );
  }

  // Resolve the Fort definition. Defaults to Sales Executive / Broker Fort for field operations.
  const fort = (fortId && FORTS[fortId])
    ? FORTS[fortId]
    : (workspace.fort?.id && FORTS[workspace.fort.id as keyof typeof FORTS])
      ? FORTS[workspace.fort.id as keyof typeof FORTS]
      : FORTS.BROKER;

  return (
    <FortDashboard
      fort={fort}
      roles={user.roles}
      workspace={workspace}
    />
  );
}

