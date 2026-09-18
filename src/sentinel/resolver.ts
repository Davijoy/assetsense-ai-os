/**
 * SENTINEL FORT — Experience Resolver.
 *
 * INPUT:  identity + persona + objective + context + authorization role
 * OUTPUT: ExperienceProfile (advisory destination, modules, capabilities,
 *         intelligence priorities, next-best actions, workspace experience).
 *
 * NON-NEGOTIABLE: Experience resolution is NOT authorization. RBAC determines
 * what the user is ALLOWED to access; this resolver determines what the user
 * SHOULD EXPERIENCE. The authorization context is passed through UNTOUCHED and
 * the resolver NEVER grants access — capability/module recommendations are
 * advisory and expire the moment a role gate denies them downstream.
 */
import type {
  AuthorizationContext,
  BusinessObjectiveId,
  ExperienceProfile,
  IdentityProfile,
  ObjectiveContext,
  SentinelPersona,
} from "./types";
import { getObjective } from "./objectives";
import { getPersona } from "./personas";

export interface ResolveExperienceInput {
  identity: IdentityProfile;
  /** Explicitly selected objective (may be null until onboarding completes). */
  objective: BusinessObjectiveId | null;
  context: ObjectiveContext;
  /** Server-resolved authorization context — READ ONLY, never modified. */
  authorization: AuthorizationContext;
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

/** Resolve the advisory experience for a person. Never alters authorization. */
export function resolveExperience(input: ResolveExperienceInput): ExperienceProfile {
  const { identity, objective: objectiveId, context, authorization } = input;

  // Persona drives the experience shape. Primary persona wins; fall back to
  // the first collected persona, then no persona (a generic, safe profile).
  const persona: SentinelPersona | null = identity.primaryPersona ?? identity.personae[0] ?? null;

  const personaDef = persona ? getPersona(persona) : null;
  const objectiveDef = objectiveId ? getObjective(objectiveId) : null;

  // Advisory modules: persona modules merged with objective-driven modules.
  // These are RECOMMENDATIONS ONLY — route-level RBAC remains the gate.
  // Advisory modules: persona modules are the primary driver. Objective
  // contributes capabilities/intelligence/actions (below) but not the
  // module list — the persona owns the surface shape.
  const modules = unique(personaDef?.modules ?? []);

  const capabilities = unique([
    ...(personaDef?.capabilities ?? []),
    ...(objectiveDef?.capabilities ?? []),
  ]);

  const intelligenceActions = unique([
    ...(personaDef?.intelligence ?? []),
    ...(objectiveDef?.intelligence ?? []),
  ]);

  const nextBestActions = unique([
    ...(personaDef?.actions ?? []),
    ...(objectiveDef?.actions ?? []),
  ]);

  // Advisory destination from persona; objective does not override a persona
  // choice but fills in when persona has none.
  const landingDestination = personaDef?.landing ?? null;

  return {
    persona,
    intents: identity.intents,
    objective: objectiveDef ?? null,
    onboarding: identity.onboarding,
    landingDestination,
    modules,
    capabilities,
    intelligenceActions,
    nextBestActions,
    // The authorization context passes through VERBATIM. Nothing in this
    // resolver may add a role, use a capability to elevate, or treat a
    // recommendation as a grant.
    authorization,
  };
}