/**
 * SENTINEL FORT — Onboarding Experience
 *
 * Authenticated, fail-safe onboarding that connects the authenticated session
 * to the existing pure Sentinel domain layer (src/sentinel). The resolver /
 * state / supreme-context functions are consumed verbatim — never duplicated.
 *
 * Security: this route does NOT grant or infer authorization.
 *  - beforeLoad mirrors app.supreme-intelligence.tsx (NOT reopening those guards):
 *    session → /auth, no workspace → /app/crm, roles read from the DB.
 *  - Persona/intent/objective/context are advisory. The user's real roles are the
 *    sole authority; denied modules are never presented as usable.
 *  - "Experience Preview" is dev-only and never writes roles/workspace/RLS.
 */
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSentinelExperience, INTENT_LABELS } from "@/hooks/use-sentinel-experience";
import { getPersonaIntents, getObjectivesForIntent } from "@/hooks/use-sentinel-experience";
import { OBJECTIVES } from "@/sentinel/objectives";
import { PERSONAS } from "@/sentinel/personas";
import type {
  BusinessObjectiveId,
  ExperienceProfile,
  IdentityProfile,
  ObjectiveContext,
  SentinelIntent,
  SentinelPersona,
} from "@/sentinel/types";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";

interface LoaderData {
  user: { id: string; workspaceId: string | null; roles: string[] };
}

type Step = "persona" | "intent" | "objective" | "context" | "preview";

/** Route-role matrix mirroring the shell sidebar (app.tsx nav + kieNav).
 *  Used ONLY to avoid advertising modules the user cannot reach as "available".
 *  Real enforcement is each route's own beforeLoad/role gate. */
const ROUTE_ROLES: Record<string, string[]> = {
  "/app/crm": ["admin", "manager", "agent", "viewer"],
  "/app/leads": ["admin", "manager", "agent"],
  "/app/marketplace": ["admin", "manager", "agent", "viewer", "builder", "developer"],
  "/app/voice": ["admin", "manager", "agent"],
  "/app/marketing": ["admin", "manager", "agent"],
  "/app/bi": ["admin", "manager", "viewer", "builder", "developer"],
  "/app/partners": ["admin", "manager", "builder", "developer"],
  "/app/command": ["admin", "manager"],
  "/app/copilot": ["admin", "manager", "agent", "builder", "developer"],
  "/app/docchat": ["admin", "manager", "agent", "builder", "developer"],
  "/app/recommendations": ["admin", "manager", "builder"],
  "/app/workflows": ["admin", "manager", "builder", "developer"],
  "/app/dealrooms": ["admin", "manager", "agent", "builder", "developer"],
  "/app/risk": ["admin", "manager"],
  "/app/market": ["admin", "manager", "viewer", "builder", "developer"],
  "/app/supreme-intelligence": ["admin", "manager", "viewer", "builder", "developer"],
  "/app/inventory": ["admin", "manager", "builder", "developer"],
};

function isRouteAuthorized(roles: readonly string[], path: string | null | undefined): boolean {
  if (!path) return false;
  const allowed = ROUTE_ROLES[path];
  if (!allowed) return true; // unknown route: let the route's own gate decide
  return roles.some((r) => allowed.includes(r));
}

function safePersona(value: string): value is SentinelPersona {
  return value in PERSONAS;
}
function safeObjective(value: string): value is BusinessObjectiveId {
  return value in OBJECTIVES;
}

/** A profile is complete once identity (persona) + purpose (intent) exist. */
function isProfileComplete(
  personae: readonly SentinelPersona[],
  intents: readonly SentinelIntent[],
): boolean {
  return personae.length > 0 && intents.length > 0;
}

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Sentinel Fort" },
      { name: "description", content: "Set up your Sentinel Fort experience." },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    let session: Session | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data.session ?? null;
    } catch {
      throw redirect({ to: "/auth" });
    }
    if (!session?.access_token) throw redirect({ to: "/auth" });
    let workspaceId: string | null = null;
    try {
      workspaceId = await getCurrentWorkspaceId(supabase);
    } catch (e) {
      console.error("[Onboarding] workspace resolution failed:", e);
    }
    if (!workspaceId) throw redirect({ to: "/fort" });
    const user = session.user;
    if (!user) throw redirect({ to: "/auth" });
    let roles: string[] = [];
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      roles = ((data ?? []) as { role: string }[]).map((r) => r.role);
    } catch (e) {
      console.error("[Onboarding] role resolution failed:", e);
    }
    return { user: { id: user.id, workspaceId, roles } };
  },
  component: OnboardingPage,
});
/**
 * SENTINEL FORT ONBOARDING PAGE
 *
 * Emotional progression: IDENTITY → PURPOSE → MISSION → CONTEXT → INTELLIGENCE.
 * All persona/intent/objective options are derived from the canonical domain
 * layer (PERSONAS / OBJECTIVES) — never duplicated here.
 *
 * SECURITY: the experience resolver may RECOMMEND capabilities and modules;
 * only server-side DB-backed roles decide navigation and access. The preview
 * switcher changes the advisory experience ONLY — never roles/workspace/DB.
 */
function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext() as { user: LoaderData["user"] };
  const {
    loading: expLoading,
    profile,
    savedContext,
    savedObjective,
    previewPersona,
    setPreviewPersona,
    resolveExperienceFor,
    buildSupremeContextFor,
    saveProfile,
  } = useSentinelExperience();

  const [persona, setPersona] = useState<SentinelPersona | null>(null);
  const [secondary, setSecondary] = useState<SentinelPersona[]>([]);
  const [intent, setIntent] = useState<SentinelIntent | null>(null);
  const [objective, setObjective] = useState<BusinessObjectiveId | null>(null);
  const [context, setContext] = useState<ObjectiveContext>({});
  const [step, setStep] = useState<Step>("persona");
  const [hydrated, setHydrated] = useState(false);
  const [entering, setEntering] = useState(false);
  const [persistedServer, setPersistedServer] = useState(false);

  // Returning users resume where they left off (prefill + jump to preview).
  useEffect(() => {
    if (expLoading || hydrated) return;
    setHydrated(true);
    if (profile) {
      if (profile.primaryPersona) setPersona(profile.primaryPersona);
      else if (profile.personae[0]) setPersona(profile.personae[0]);
      const firstIntent = profile.intents[0];
      if (firstIntent && firstIntent in INTENT_LABELS) setIntent(firstIntent);
      if (savedObjective && safeObjective(savedObjective)) setObjective(savedObjective);
      setContext(savedContext ?? {});
      if (isProfileComplete(profile.personae, profile.intents)) setStep("preview");
    }
  }, [expLoading, hydrated, profile, savedObjective, savedContext]);

  /** Effective identity honors the dev-only preview override (advisory only). */
  const effectivePersona: SentinelPersona | null = previewPersona ?? persona;

  const identity: IdentityProfile = useMemo(() => {
    const personae = effectivePersona
      ? Array.from(new Set([effectivePersona, ...(effectivePersona === persona ? secondary : [])]))
      : [];
    const complete = isProfileComplete(personae, intent ? [intent] : []);
    return {
      identityId: user.id,
      personae,
      primaryPersona: effectivePersona,
      intents: intent ? [intent] : [],
      onboarding: complete ? "PROFILE_COMPLETE" : "PROFILE_INCOMPLETE",
      workspaceId: user.workspaceId,
      profileComplete: complete,
    };
  }, [user.id, user.workspaceId, effectivePersona, persona, secondary, intent]);

  const experience = useMemo(
    () => resolveExperienceFor(identity, objective, context),
    [identity, objective, context, resolveExperienceFor],
  );

  const toggleSecondary = useCallback((p: SentinelPersona) => {
    setSecondary((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }, []);

  const handleEnter = useCallback(async () => {
    setEntering(true);
    try {
      const res = await saveProfile(identity, objective, context);
      setPersistedServer(Boolean((res as { persistedServer?: boolean })?.persistedServer));
      const supremeContext = buildSupremeContextFor(
        identity,
        intent,
        objective,
        context,
        experience,
      );
      const landing = experience.landingDestination;
      // Enter the advisory landing destination only when the DB-derived role
      // set can actually reach it; otherwise fail closed to the shell home
      // (/app/crm). isRouteAuthorized is a client-side hint only — each target
      // route's own beforeLoad/role gate remains the authoritative enforcement.
      const to =
        landing && isRouteAuthorized(user.roles, landing)
          ? landing
          : isRouteAuthorized(user.roles, "/app/crm")
            ? "/app/crm"
            : "/fort";
      navigate({ to, state: { supremeContext } as unknown as Record<string, never> });
    } finally {
      setEntering(false);
    }
  }, [
    identity,
    objective,
    context,
    intent,
    experience,
    buildSupremeContextFor,
    saveProfile,
    navigate,
    user.roles,
  ]);

  if (expLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Preparing your Sentinel Fort experience…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">SENTINEL FORT</h1>
        <p className="text-lg font-medium">Let&apos;s understand why you&apos;re here.</p>
        <p className="text-sm text-muted-foreground">
          Your answers shape the intelligence, tools and experience Sentinel Fort gives you.
        </p>
      </header>

      {step === "persona" && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">WHO ARE YOU?</h2>
          <PersonaStep value={persona} onChange={(p) => setPersona(p)} />
          {persona && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                I also work as… (optional)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(PERSONAS)
                  .filter((p) => p.id !== persona)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSecondary(p.id)}
                      className={
                        "rounded-full border px-2.5 py-0.5 text-xs transition " +
                        (secondary.includes(p.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent")
                      }
                    >
                      {p.label}
                    </button>
                  ))}
              </div>
            </div>
          )}
          <Button
            size="lg"
            className="w-full"
            disabled={!persona}
            onClick={() => setStep("intent")}
          >
            Continue
          </Button>
        </section>
      )}

      {step === "intent" && persona && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">WHY ARE YOU HERE?</h2>
          <IntentStep
            persona={persona}
            value={intent}
            onChange={(i) => setIntent(i)}
            onBack={() => setStep("persona")}
          />
          <Button
            size="lg"
            className="w-full"
            disabled={!intent}
            onClick={() => setStep("objective")}
          >
            Continue
          </Button>
        </section>
      )}

      {step === "objective" && intent && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">WHAT DO YOU WANT TO ACCOMPLISH?</h2>
          <ObjectiveStep
            intent={intent}
            value={objective}
            onChange={(o) => {
              setObjective(o);
              setStep("context");
            }}
            onBack={() => setStep("intent")}
          />
        </section>
      )}

      {step === "context" && objective && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">TELL US WHAT MATTERS.</h2>
          <ContextStep
            objective={objective}
            value={context}
            onChange={(v) => setContext(v)}
            onBack={() => setStep("objective")}
          />
          <Button size="lg" className="w-full" onClick={() => setStep("preview")}>
            See your Sentinel Fort profile
          </Button>
        </section>
      )}

      {step === "preview" && (
        <PreviewStep
          identity={identity}
          intent={intent}
          objective={objective}
          context={context}
          experience={experience}
          roles={user.roles}
          persistedServer={persistedServer}
          previewPersona={previewPersona}
          setPreviewPersona={setPreviewPersona}
          onBack={() => setStep(objective ? "context" : "persona")}
          onEnter={() => void handleEnter()}
        />
      )}

      {entering && (
        <div className="text-center text-sm text-muted-foreground">Entering Sentinel Fort…</div>
      )}
    </div>
  );
}

function PersonaStep({
  value,
  onChange,
}: {
  value: SentinelPersona | null;
  onChange: (p: SentinelPersona) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.values(PERSONAS).map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={
            "flex flex-col items-center gap-2 rounded-xl border p-4 text-left shadow-sm transition-all " +
            (value === p.id
              ? "border-primary bg-primary/5 ring-2 ring-primary"
              : "border-border bg-card hover:bg-accent")
          }
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-medium">{p.label}</span>
          <Badge variant="secondary" className="text-[10px]">
            {p.capabilities.length} focus
          </Badge>
        </button>
      ))}
    </div>
  );
}

function IntentStep({
  persona,
  value,
  onChange,
  onBack,
}: {
  persona: SentinelPersona;
  value: SentinelIntent | null;
  onChange: (i: SentinelIntent) => void;
  onBack: () => void;
}) {
  const intents = getPersonaIntents(persona);
  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>
      <p className="text-sm text-muted-foreground">What brings you to Sentinel Fort today?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {intents.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={
              "rounded-lg border border-border p-3 text-left transition " +
              (value === i ? "bg-primary/5 ring-2 ring-primary" : "hover:bg-accent")
            }
          >
            <div className="font-medium">{INTENT_LABELS[i]}</div>
            <div className="text-xs text-muted-foreground">Intent: {i}</div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange("OTHER")}
          className={
            "rounded-lg border border-border p-3 text-left transition " +
            (value === "OTHER" ? "bg-primary/5 ring-2 ring-primary" : "hover:bg-accent")
          }
        >
          <div className="font-medium">{INTENT_LABELS.OTHER}</div>
        </button>
      </div>
    </div>
  );
}

function ObjectiveStep({
  intent,
  value,
  onChange,
  onBack,
}: {
  intent: SentinelIntent;
  value: BusinessObjectiveId | null;
  onChange: (o: BusinessObjectiveId) => void;
  onBack: () => void;
}) {
  const objectives = getObjectivesForIntent(intent);
  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>
      {objectives.length === 0 ? (
        <p className="text-sm text-muted-foreground">No objectives for this intent yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {objectives.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={
                "rounded-lg border border-border p-3 text-left transition " +
                (value === o.id ? "bg-primary/5 ring-2 ring-primary" : "hover:bg-accent")
              }
            >
              <div className="font-medium">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.actions[0] ?? ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ContextField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `ctx-${name}`;
  if (name === "riskPreference") {
    const cur = (value as string | undefined) ?? "MEDIUM";
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium">
          Risk preference
        </label>
        <select
          id={id}
          value={cur}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {(["LOW", "MEDIUM", "HIGH"] as const).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (name === "budget") {
    const cur = (value ?? {}) as { min?: number; max?: number; currency?: string };
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Budget</label>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            placeholder="min"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={cur.min ?? ""}
            onChange={(e) =>
              onChange({ ...cur, min: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <input
            type="number"
            placeholder="max"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={cur.max ?? ""}
            onChange={(e) =>
              onChange({ ...cur, max: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <input
            type="text"
            placeholder="currency"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={cur.currency ?? "USD"}
            onChange={(e) => onChange({ ...cur, currency: e.target.value })}
          />
        </div>
      </div>
    );
  }
  if (name === "requirements" || name === "inventory" || name === "project") {
    const cur = Array.isArray(value) ? (value as string[]) : value ? [String(value)] : [];
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium capitalize">
          {name}
        </label>
        <input
          id={id}
          type="text"
          placeholder="comma separated"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={cur.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                ? e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : [],
            )
          }
        />
      </div>
    );
  }
  const str = value === undefined || value === null ? "" : String(value);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium capitalize">
        {name}
      </label>
      <input
        id={id}
        type="text"
        placeholder=" "
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={str}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}

function ContextStep({
  objective,
  value,
  onChange,
  onBack,
}: {
  objective: BusinessObjectiveId;
  value: ObjectiveContext;
  onChange: (v: ObjectiveContext) => void;
  onBack: () => void;
}) {
  const keys = OBJECTIVES[objective].contextKeys;
  const record = value as Record<string, unknown>;
  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>
      <p className="text-sm text-muted-foreground">
        Only the context that matters for this objective.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {keys.map((k) => (
          <ContextField
            key={String(k)}
            name={k as string}
            value={record[k]}
            onChange={(v) => onChange({ ...record, [k]: v } as ObjectiveContext)}
          />
        ))}
      </div>
    </div>
  );
}

function contextSummary(context: ObjectiveContext): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(context as Record<string, unknown>)) {
    if (v === undefined || v === null || v === "") continue;
    out.push({ label: k, value: typeof v === "object" ? JSON.stringify(v) : String(v) });
  }
  return out;
}

function PreviewStep({
  identity,
  intent,
  objective,
  context,
  experience,
  roles,
  onBack,
  onEnter,
  previewPersona,
  setPreviewPersona,
  persistedServer,
}: {
  identity: IdentityProfile;
  intent: SentinelIntent | null;
  objective: BusinessObjectiveId | null;
  context: ObjectiveContext;
  experience: ExperienceProfile;
  roles: readonly string[];
  onBack: () => void;
  onEnter: () => void;
  previewPersona: SentinelPersona | null;
  setPreviewPersona: (p: SentinelPersona | null) => void;
  persistedServer: boolean;
}) {
  const authorizedModules = (experience.modules ?? []).filter((m) => isRouteAuthorized(roles, m));
  const landing = experience.landingDestination;
  const landingAuthorized = isRouteAuthorized(roles, landing);
  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">
          YOUR SENTINEL FORT PROFILE
        </h3>
        <h2 className="text-2xl font-bold">Here's how Sentinel Fort will work for you.</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryRow
          label="WHO YOU ARE"
          value={identity.primaryPersona ? PERSONAS[identity.primaryPersona].label : " —"}
        />
        <SummaryRow label="WHY YOU ARE HERE" value={intent ? INTENT_LABELS[intent] : " —"} />
        <SummaryRow label="YOUR OBJECTIVE" value={objective ? OBJECTIVES[objective].label : " —"} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">YOUR CONTEXT</h3>
        {contextSummary(context).length === 0 ? (
          <p className="text-sm text-muted-foreground">No additional context provided.</p>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {contextSummary(context).map((c) => (
              <SummaryRow key={c.label} label={c.label} value={c.value} short />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">YOUR EXPERIENCE</h3>
        <TagList label="Intelligence focus" items={experience.intelligenceActions} />
        <TagList
          label="Recommended capabilities"
          items={experience.capabilities}
          hint={persistedServer ? "server-persisted" : "preview only"}
          hintColor="text-amber-600"
        />
        <TagList label="Recommended modules" items={authorizedModules} />
        <TagList label="Next best actions" items={experience.nextBestActions} />
        <SummaryRow
          label="Authorized landing"
          value={landingAuthorized && landing ? landing : "→ Fort Home"}
        />
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
        Your Sentinel Fort profile <strong>personalizes your experience</strong>. Your account
        permissions are still controlled by server-side authorization (DB-backed roles + RLS). The
        experience resolver may recommend capabilities, but it never grants them.
      </div>

      <PreviewSwitcher
        value={previewPersona}
        onChange={setPreviewPersona}
        disabled={!landingAuthorized && !authorizedModules.length}
      />

      <Button size="lg" className="mt-2 w-full" onClick={onEnter}>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Enter Sentinel Fort
      </Button>
    </div>
  );
}

function SummaryRow({ label, value, short }: { label: string; value: string; short?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={short ? "text-sm" : "text-lg font-semibold"}>{value}</div>
    </div>
  );
}

function TagList({
  label,
  items,
  hint,
  hintColor,
}: {
  label: string;
  items: readonly string[];
  hint?: string;
  hintColor?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Badge key={i} variant="secondary" className="text-[10px]">
            {i}
          </Badge>
        ))}
        {hint && (
          <span className={`ml-1 text-[10px] ${hintColor ?? "text-muted-foreground"}`}>{hint}</span>
        )}
      </div>
    </div>
  );
}

function PreviewSwitcher({
  value,
  onChange,
  disabled,
}: {
  value: SentinelPersona | null;
  onChange: (p: SentinelPersona | null) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed border-amber-300 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
        <Sparkles className="h-3.5 w-3.5" />
        PREVIEW ONLY — AUTHORIZATION UNCHANGED
      </div>
      <label className="mt-1 block text-xs text-muted-foreground">Experience Preview As</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? (e.target.value as SentinelPersona) : null)}
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
      >
        <option value="">(your persona)</option>
        {Object.values(PERSONAS).map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
