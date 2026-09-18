/**
 * SENTINEL FORT — shared experience discovery flow.
 *
 * Renders the four discovery questions:
 *   WHO ARE YOU? → WHY ARE YOU HERE? → WHAT DO YOU WANT TO ACCOMPLISH?
 *   → WHAT MATTERS TO YOU?
 * ALL options derive from the canonical domain layer — PERSONAS,
 * getPersonaIntents, getObjectivesForIntent, OBJECTIVES[].contextKeys — never
 * duplicated here. On completion it reports the advisory draft; the host
 * (public /sentinel or authenticated /app/onboarding) renders the preview and
 * handles persistence + navigation.
 */
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { PERSONAS } from "@/sentinel/personas";
import { OBJECTIVES } from "@/sentinel/objectives";
import {
  getPersonaIntents,
  getObjectivesForIntent,
  INTENT_LABELS,
} from "@/hooks/use-sentinel-experience";
import type {
  BusinessObjectiveId,
  ObjectiveContext,
  SentinelIntent,
  SentinelPersona,
} from "@/sentinel/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ExperienceDraftSelection {
  persona: SentinelPersona | null;
  intents: SentinelIntent[];
  objective: BusinessObjectiveId | null;
  context: ObjectiveContext;
}

interface ExperienceFlowProps {
  initial?: Partial<ExperienceDraftSelection> | null;
  resumeAt?: "persona" | "intent" | "objective" | "context";
  onComplete: (selection: ExperienceDraftSelection) => void;
}

type Phase = "persona" | "intent" | "objective" | "context";

export function ExperienceFlow({ initial, resumeAt, onComplete }: ExperienceFlowProps) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (resumeAt) return resumeAt;
    if (initial?.objective) return "context";
    if (initial?.persona) return "intent";
    return "persona";
  });
  const [persona, setPersona] = useState<SentinelPersona | null>(initial?.persona ?? null);
  const [secondary, setSecondary] = useState<SentinelPersona[]>([]);
  const [intent, setIntent] = useState<SentinelIntent | null>(initial?.intents?.[0] ?? null);
  const [objective, setObjective] = useState<BusinessObjectiveId | null>(
    initial?.objective ?? null,
  );
  const [context, setContext] = useState<ObjectiveContext>(initial?.context ?? {});

  const toggleSecondary = (p: SentinelPersona) =>
    setSecondary((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const emitDone = () =>
    onComplete({ persona, intents: intent ? [intent] : [], objective, context });

  return (
    <div className="w-full">
      {phase === "persona" && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(PERSONAS).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersona(p.id)}
                className={
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-left shadow-sm transition " +
                  (persona === p.id
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
            onClick={() => setPhase("intent")}
          >
            Continue
          </Button>
        </section>
      )}

      {phase === "intent" && persona && (
        <section className="space-y-4">
          <Back onBack={() => setPhase("persona")} />
          <p className="text-sm text-muted-foreground">What brings you to Sentinel Fort today?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {getPersonaIntents(persona).map((i) => (
              <IntentCard
                key={i}
                active={intent === i}
                label={INTENT_LABELS[i]}
                code={i}
                onPick={() => setIntent(i)}
              />
            ))}
            <IntentCard
              active={intent === "OTHER"}
              label={INTENT_LABELS.OTHER}
              code="OTHER"
              onPick={() => setIntent("OTHER")}
            />
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={!intent}
            onClick={() => setPhase("objective")}
          >
            Continue
          </Button>
        </section>
      )}

      {phase === "objective" && intent && (
        <section className="space-y-4">
          <Back onBack={() => setPhase("intent")} />
          {getObjectivesForIntent(intent).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setObjective(o.id);
                setPhase("context");
              }}
              className={
                "w-full rounded-lg border p-3 text-left transition " +
                (objective === o.id
                  ? "bg-primary/5 ring-2 ring-primary"
                  : "border-border hover:bg-accent")
              }
            >
              <div className="font-medium">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.actions[0] ?? ""}</div>
            </button>
          ))}
        </section>
      )}

      {phase === "context" && objective && (
        <section className="space-y-4">
          <Back onBack={() => setPhase("objective")} />
          <ObjectiveContextFields objective={objective} value={context} onChange={setContext} />
          <Button size="lg" className="w-full" onClick={emitDone}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Review my experience
          </Button>
        </section>
      )}
    </div>
  );
}

function Back({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
      <ArrowLeft className="mr-1 h-4 w-4" /> Back
    </Button>
  );
}

function IntentCard({
  label,
  code,
  active,
  onPick,
}: {
  label: string;
  code: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={
        "rounded-lg border border-border p-3 text-left transition " +
        (active ? "bg-primary/5 ring-2 ring-primary" : "hover:bg-accent")
      }
    >
      <div className="font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">Intent: {code}</div>
    </button>
  );
}

/** Dynamic context fields derived from OBJECTIVES[objective].contextKeys. */
export function ObjectiveContextFields({
  objective,
  value,
  onChange,
}: {
  objective: BusinessObjectiveId;
  value: ObjectiveContext;
  onChange: (v: ObjectiveContext) => void;
}) {
  const keys = OBJECTIVES[objective].contextKeys;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {keys.map((name) => (
        <ContextField
          key={String(name)}
          name={String(name)}
          value={value[name]}
          onChange={(v) => onChange({ ...value, [name]: v })}
        />
      ))}
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
