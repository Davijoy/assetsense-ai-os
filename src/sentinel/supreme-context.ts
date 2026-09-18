/**
 * SENTINEL FORT — Supreme Intelligence context handoff.
 *
 * Builds the structured context the existing Supreme Intelligence layer may
 * consume. This is the INTEGRATION BOUNDARY: the SI brain (semantic routing,
 * reasoning modes, synthesis) is NOT rewritten — it simply receives an
 * optional richer context. This context may influence RETRIEVE / ANALYZE /
 * DIAGNOSE / CORRELATE / RECOMMEND / DECIDE, but MUST NEVER override
 * authorization. Authorization stays the final security boundary.
 */
import type {
  AuthorizationContext,
  BusinessObjective,
  ExperienceProfile,
  ObjectiveContext,
  SentinelIntent,
  SentinelPersona,
  SupremeContext,
} from "./types";

export interface BuildSupremeContextInput {
  persona: SentinelPersona | null;
  intent: SentinelIntent | null;
  objective: BusinessObjective | null;
  experience: ExperienceProfile | null;
  context: ObjectiveContext;
  authorization: AuthorizationContext;
  generatedAt?: string;
}

export function buildSupremeContext(input: BuildSupremeContextInput): SupremeContext {
  return {
    persona: input.persona,
    intent: input.intent,
    objective: input.objective,
    experience: input.experience,
    context: input.context,
    authorization: input.authorization,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}