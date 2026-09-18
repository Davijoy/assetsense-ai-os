/**
 * SENTINEL FORT — PUBLIC product entry.
 *
 * The intelligent front door. Discovery runs BEFORE authentication:
 *   WHO ARE YOU? → WHY? → WHAT DO YOU WANT? → WHAT MATTERS → YOUR EXPERIENCE
 * It stores ONLY advisory experience state (persona/intent/objective/context/
 * fort) in the client. NO roles, NO workspace ids, NO permissions are ever
 * stored or fabricated. Authorization is resolved server-side after sign-in.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SentinelMark } from "@/components/brand/Logo";
import { SentinelAtmosphere } from "@/components/sentinel/SentinelAtmosphere";
import { Button } from "@/components/ui/button";
import {
  ExperienceFlow,
  type ExperienceDraftSelection,
} from "@/components/sentinel/ExperienceFlow";
import { FortPreview } from "@/components/sentinel/FortShell";
import { personaToFort, FORTS } from "@/sentinel/forts";
import { resolveExperience } from "@/sentinel/resolver";
import {
  buildExperienceDraft,
  loadExperienceDraft,
  saveExperienceDraft,
} from "@/lib/experience-draft";
import type { AuthorizationContext, IdentityProfile } from "@/sentinel/types";

function SentinelEntryPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const initialDraft = useMemo(() => loadExperienceDraft(), []);
  const [selection, setSelection] = useState<ExperienceDraftSelection | null>(null);
  const [phase, setPhase] = useState<"discover" | "preview">("discover");

  const handleComplete = useCallback((sel: ExperienceDraftSelection) => {
    setSelection(sel);
    setPhase("preview");
  }, []);

  const handleEnter = useCallback(() => {
    if (!selection) return;
    const fort = personaToFort(selection.persona);
    const draft = buildExperienceDraft({
      persona: selection.persona,
      intents: selection.intents,
      objective: selection.objective,
      context: selection.context,
      fort,
    });
    saveExperienceDraft(draft, window.localStorage);
    if (!loading && user) {
      navigate({ to: "/fort" });
    } else {
      navigate({ to: "/auth", search: { next: "/fort" } });
    }
  }, [selection, loading, user, navigate]);

  const fortId = personaToFort(selection?.persona ?? initialDraft?.persona ?? null);

  const previewExperience = useMemo(() => {
    if (!selection?.persona) return null;
    const identity: IdentityProfile = {
      identityId: "pre-auth",
      personae: [selection.persona],
      primaryPersona: selection.persona,
      intents: selection.intents,
      onboarding: "PROFILE_COMPLETE",
      workspaceId: null,
      profileComplete: true,
    };
    return resolveExperience({
      identity,
      objective: selection.objective,
      context: selection.context,
      authorization: PRE_AUTH_AUTHORIZATION,
    });
  }, [selection]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SentinelAtmosphere />
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-80 bg-gradient-to-b from-primary/10 to-transparent" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <SentinelMark />
            <span className="text-sm font-semibold tracking-tight">
              SENTINEL <span className="text-primary">FORT</span>
            </span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <KeyRound className="h-3.5 w-3.5" /> Sign in
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center py-10">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              WELCOME TO SENTINEL FORT
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Before you enter, let us understand what you're here to accomplish.
            </p>
            <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              {phase === "discover" ? "Who are you?" : "Your Sentinel Experience"}
            </div>
          </header>

          {phase === "discover" ? (
            <ExperienceFlow initial={initialDraft} onComplete={handleComplete} />
          ) : (
            <div className="space-y-6">
              <FortPreview
                fort={fortId ? FORTS[fortId] : null}
                persona={selection?.persona ?? null}
                experience={previewExperience}
              />
              <Button size="lg" className="w-full" onClick={handleEnter}>
                Enter Sentinel Fort
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setPhase("discover")}
              >
                ← Change my answers
              </Button>
            </div>
          )}
        </main>

        <footer className="pb-4 text-center text-[11px] text-muted-foreground/70">
          Your experience preferences are advisory. Signing in never opens anything beyond what
          server-side authorization allows.
        </footer>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/sentinel")({
  head: () => ({
    meta: [
      { title: "Welcome — Sentinel Fort" },
      {
        name: "description",
        content: "Enter Sentinel Fort. Tell us what you're here to accomplish.",
      },
    ],
  }),
  component: SentinelEntryPage,
});

/** Pre-auth advisory marker — carries NO roles and NO workspace. */
const PRE_AUTH_AUTHORIZATION: AuthorizationContext = {
  identityId: "pre-auth",
  workspaceId: null,
  roles: [],
};
