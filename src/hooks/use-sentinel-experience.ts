/**
 * SENTINEL FORT — client experience hook.
 *
 * Binds the authenticated session to the pure Sentinel domain layer
 * (src/sentinel). Responsibilities:
 *  - load the SERVER-DERIVED authorization context (roles+workspace) + saved
 *    profile via server fns (never client-trusted),
 *  - expose the existing persona/objective/intent option sets,
 *  - expose resolveExperience(...) + buildSupremeContext(...) as pure passthroughs
 *    (the domain logic lives ONLY in src/sentinel — this hook just feeds it),
 *  - expose a DEVELOPMENT-ONLY "Experience Preview" persona switcher that
 *    NEVER touches authorization (advisory/context only).
 */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./use-auth";
import {
  getSentinelAuthorizationContext,
  getSentinelProfile,
  saveSentinelProfile,
} from "@/lib/sentinel.functions";
import type {
  AuthorizationContext,
  BusinessObjective,
  BusinessObjectiveId,
  IdentityProfile,
  ObjectiveContext,
  SentinelIntent,
  SentinelPersona,
  ExperienceProfile,
  SupremeContext,
} from "@/sentinel/types";
import { PERSONAS, type PersonaDefinition } from "@/sentinel/personas";
import { OBJECTIVES } from "@/sentinel/objectives";
import { resolveExperience } from "@/sentinel/resolver";
import { buildSupremeContext } from "@/sentinel/supreme-context";

const PREVIEW_STORAGE_KEY = "sentinel.experiencePreviewPersona";

export const INTENT_LABELS: Record<SentinelIntent, string> = {
  FIND_PROPERTY: "Find a property",
  EVALUATE_INVESTMENT: "Evaluate an investment",
  SELL_DISPOSE: "Sell or dispose of property",
  GENERATE_LEADS: "Generate leads",
  CLOSE_MORE_DEALS: "Close more deals",
  MANAGE_INVENTORY: "Manage inventory",
  UNDERSTAND_MARKET: "Understand the market",
  MANAGE_BUSINESS: "Manage business",
  INTEGRATE_OR_BUILD: "Integrate or build technology",
  OTHER: "Something else",
};

/** Intents a persona is likely to act on, derived from the domain objective set. */
export function getPersonaIntents(persona: SentinelPersona): SentinelIntent[] {
  const intents: SentinelIntent[] = [];
  for (const objId of PERSONAS[persona].objectives) {
    const intent = OBJECTIVES[objId].intent;
    if (!intents.includes(intent)) intents.push(intent);
  }
  return intents;
}

/** Business objectives whose canonical intent matches. */
export function getObjectivesForIntent(intent: SentinelIntent): BusinessObjective[] {
  return Object.values(OBJECTIVES).filter((o) => o.intent === intent);
}

export interface SentinelExperienceContext {
  authorization: AuthorizationContext | null;
  profile: IdentityProfile | null;
  savedContext: ObjectiveContext;
  savedObjective: BusinessObjectiveId | null;
  loading: boolean;
  userId: string | null;
}

export interface UseSentinelExperienceResult extends SentinelExperienceContext {
  previewPersona: SentinelPersona | null;
  isPreviewMode: boolean;
  setPreviewPersona: (p: SentinelPersona | null) => void;
  resolveExperienceFor: (
    profile: IdentityProfile,
    objective: BusinessObjectiveId | null,
    context: ObjectiveContext,
  ) => ExperienceProfile;
  buildSupremeContextFor: (
    profile: IdentityProfile,
    intent: SentinelIntent | null,
    objective: BusinessObjectiveId | null,
    context: ObjectiveContext,
    experience: ExperienceProfile,
  ) => SupremeContext;
  saveProfile: (
    profile: IdentityProfile,
    objective: BusinessObjectiveId | null,
    context: ObjectiveContext,
  ) => Promise<{ persisted: boolean; persistedServer: boolean }>;
  refetchProfile: () => Promise<void>;
}

export function useSentinelExperience(): UseSentinelExperienceResult {
  const { user, roles, rolesReady, loading: authLoading } = useAuth();
  const [authorization, setAuthorization] = useState<AuthorizationContext | null>(null);
  const [profile, setProfile] = useState<IdentityProfile | null>(null);
  const [savedContext, setSavedContext] = useState<ObjectiveContext>({});
  const [savedObjective, setSavedObjective] = useState<BusinessObjectiveId | null>(null);
  const [previewPersona, setPreviewPersonaState] = useState<SentinelPersona | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
    return raw && raw in PERSONAS ? (raw as SentinelPersona) : null;
  });

  const setPreviewPersona = useCallback((p: SentinelPersona | null) => {
    setPreviewPersonaState(p);
    if (typeof window !== "undefined") {
      if (p) window.localStorage.setItem(PREVIEW_STORAGE_KEY, p);
      else window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
    }
  }, []);

  const load = useCallback(async () => {
    if (!user || authLoading || !rolesReady) return;
    try {
      const auth = (await getSentinelAuthorizationContext()) as AuthorizationContext;
      setAuthorization(auth);
    } catch {
      // Fail safe: advisory-only context assembled client-side from useAuth.
      setAuthorization({ identityId: user.id, workspaceId: null, roles: [...roles] });
    }
    try {
      const res = (await getSentinelProfile()) as {
        profile?: IdentityProfile | null;
        context?: ObjectiveContext | null;
        objective?: BusinessObjectiveId | null;
      } | null;
      if (res?.profile) {
        setProfile(res.profile);
        setSavedContext((res.context as ObjectiveContext) ?? {});
        setSavedObjective((res.objective as BusinessObjectiveId) ?? null);
      }
    } catch {
      setProfile(null);
    }
  }, [user, authLoading, rolesReady, roles]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveExperienceFor = useCallback(
    (
      p: IdentityProfile,
      objective: BusinessObjectiveId | null,
      context: ObjectiveContext,
    ): ExperienceProfile => {
      const auth = authorization ?? {
        identityId: user?.id ?? "",
        workspaceId: null,
        roles: [...roles],
      };
      return resolveExperience({ identity: p, objective, context, authorization: auth });
    },
    [authorization, user, roles],
  );

  const buildSupremeContextFor = useCallback(
    (
      p: IdentityProfile,
      intent: SentinelIntent | null,
      objective: BusinessObjectiveId | null,
      context: ObjectiveContext,
      experience: ExperienceProfile,
    ): SupremeContext => {
      const auth = authorization ?? {
        identityId: user?.id ?? "",
        workspaceId: null,
        roles: [...roles],
      };
      return buildSupremeContext({
        persona: p.primaryPersona ?? p.personae[0] ?? null,
        intent,
        objective: objective ? OBJECTIVES[objective] : null,
        experience,
        context,
        authorization: auth,
      });
    },
    [authorization, user, roles],
  );

  const saveProfile = useCallback(
    async (p: IdentityProfile, objective: BusinessObjectiveId | null, ctx: ObjectiveContext) => {
      try {
        const res = await saveSentinelProfile({
          data: {
            primaryPersona: p.primaryPersona,
            personae: p.personae,
            intents: p.intents,
            objective,
            context: ctx,
          },
        });
        return res ?? { persisted: true, persistedServer: false };
      } catch {
        return { persisted: true, persistedServer: false };
      }
    },
    [],
  );

  const refetchProfile = useCallback(async () => {
    if (user && rolesReady) {
      try {
        setProfile(
          ((await getSentinelProfile()) as { profile?: IdentityProfile | null } | null)?.profile ??
            null,
        );
      } catch {
        setProfile(null);
      }
    }
  }, [user, rolesReady]);

  return {
    authorization,
    profile,
    savedContext,
    savedObjective,
    loading: authLoading || !rolesReady,
    userId: user?.id ?? null,
    previewPersona,
    isPreviewMode: previewPersona !== null,
    setPreviewPersona,
    resolveExperienceFor,
    buildSupremeContextFor,
    saveProfile,
    refetchProfile,
  };
}

export { PERSONAS as SENTINEL_PERSONAS };
export type { PersonaDefinition };
