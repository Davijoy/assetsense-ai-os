/**
 * SENTINEL FORT — shared Fort page used by /fort/<slug> routes.
 *
 * Restores the advisory experience draft (or falls back to the Fort's primary
 * persona) and renders the FortShell.
 *
 * AUTHORIZATION IS NOT DECIDED HERE. The persona/draft is EXPERIENCE input read
 * from localStorage; the `workspace` context is the SERVER's resolution and is
 * the only thing that decides what renders as available. A tampered draft can
 * change wording and ordering — it can never change access.
 */
import { useMemo } from "react";
import { FORTS, fortPrimaryPersona } from "@/sentinel/forts";
import { OBJECTIVES } from "@/sentinel/objectives";
import { loadExperienceDraft } from "@/lib/experience-draft";
import { FortShell } from "@/components/sentinel/FortShell";
import type { FortWorkspaceContext } from "@/lib/fort-workspace.functions";
import type { SentinelFort, SentinelPersona } from "@/sentinel/types";

export interface FortPageUser {
  id: string;
  workspaceId: string | null;
  roles: string[];
}

export function FortPage({
  fortId,
  user,
  workspace,
}: {
  fortId: SentinelFort;
  user: FortPageUser;
  /** Server-resolved FORT context from the /fort layout guard. */
  workspace?: FortWorkspaceContext | null;
}) {
  const fort = FORTS[fortId];
  const draft = useMemo(() => loadExperienceDraft(), []);

  const persona: SentinelPersona | null = draft?.persona ?? fortPrimaryPersona(fortId);
  const personas: readonly SentinelPersona[] = draft?.persona ? [draft.persona] : fort.personae;

  const objectiveLabel = draft?.objective ? OBJECTIVES[draft.objective].label : null;
  const geography = draft?.context?.geography ? String(draft.context.geography) : null;
  const contextSummary = [objectiveLabel, geography].filter(Boolean).join(" · ") || null;

  return (
    <FortShell
      fort={fort}
      primaryPersona={persona}
      personas={personas}
      roles={user.roles}
      contextSummary={contextSummary}
      workspace={workspace ?? null}
    />
  );
}
