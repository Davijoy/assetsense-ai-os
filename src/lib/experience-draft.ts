/**
 * SENTINEL FORT — pre-authentication experience draft persistence.
 *
 * Stores ONLY advisory experience state (persona / intent / objective /
 * context / fort). It NEVER stores roles, workspace ids, permissions or any
 * authorization signal. Authorization is re-resolved server-side after auth.
 */
import type {
  BusinessObjectiveId,
  ExperienceDraft,
  ObjectiveContext,
  SentinelFort,
  SentinelIntent,
  SentinelPersona,
} from "@/sentinel/types";
import { isPersona } from "@/sentinel/personas";
import { isObjective } from "@/sentinel/objectives";

export const EXPERIENCE_DRAFT_KEY = "sentinel.experienceDraft";

export const FORT_IDS: readonly string[] = [
  "BROKER",
  "BUILDER",
  "ENTERPRISE",
  "INDIVIDUAL",
  "PLATFORM",
];

const INTENT_IDS: readonly string[] = [
  "FIND_PROPERTY",
  "EVALUATE_INVESTMENT",
  "SELL_DISPOSE",
  "GENERATE_LEADS",
  "CLOSE_MORE_DEALS",
  "MANAGE_INVENTORY",
  "UNDERSTAND_MARKET",
  "MANAGE_BUSINESS",
  "INTEGRATE_OR_BUILD",
  "OTHER",
];

/** Authorization-adjacent keys that are never allowed in persisted context. */
const FORBIDDEN_CONTEXT_KEYS = new Set([
  "roles",
  "role",
  "workspaceId",
  "workspace_id",
  "permissions",
  "authorization",
  "sentinelContext",
]);

export interface DraftStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeContext(raw: unknown): Record<string, unknown> {
  if (!isPlainRecord(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (FORBIDDEN_CONTEXT_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Strictly validate an unknown value into a safe ExperienceDraft. Returns null
 *  when nothing meaningful survives (no persona, no fort, no intents, no
 *  objective) — the caller degrades gracefully. */
export function sanitizeDraft(raw: unknown): ExperienceDraft | null {
  if (!isPlainRecord(raw)) return null;
  const persona = typeof raw.persona === "string" && isPersona(raw.persona) ? raw.persona : null;
  const intents: SentinelIntent[] = Array.isArray(raw.intents)
    ? raw.intents.filter(
        (x): x is SentinelIntent =>
          typeof x === "string" && (INTENT_IDS as readonly string[]).includes(x),
      )
    : [];
  const objective =
    typeof raw.objective === "string" && isObjective(raw.objective)
      ? (raw.objective as BusinessObjectiveId)
      : null;
  const fort =
    typeof raw.fort === "string" && (FORT_IDS as readonly string[]).includes(raw.fort)
      ? (raw.fort as SentinelFort)
      : null;
  const context = sanitizeContext(raw.context);
  if (!persona && !fort && intents.length === 0 && !objective) return null;
  return {
    persona,
    intents,
    objective,
    context,
    fort,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString(),
  };
}

export function saveExperienceDraft(draft: ExperienceDraft, storage: DraftStorage): void {
  try {
    storage.setItem(EXPERIENCE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage unavailable (private mode / SSR) — advisory state, safe to skip
  }
}

export function loadExperienceDraft(storage?: DraftStorage | null): ExperienceDraft | null {
  try {
    const raw = (storage ?? windowStorage()).getItem(EXPERIENCE_DRAFT_KEY);
    if (!raw) return null;
    return sanitizeDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearExperienceDraft(storage?: DraftStorage | null): void {
  try {
    (storage ?? windowStorage()).removeItem(EXPERIENCE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Build a fresh draft from selected values. Never trusts stored roles. */
export function buildExperienceDraft(input: {
  persona: SentinelPersona | null;
  intents: SentinelIntent[];
  objective: BusinessObjectiveId | null;
  context: Record<string, unknown>;
  fort: SentinelFort | null;
}): ExperienceDraft {
  return {
    persona: input.persona,
    intents: input.intents,
    objective: input.objective,
    context: sanitizeContext(input.context),
    fort: input.fort,
    createdAt: new Date().toISOString(),
  };
}

function windowStorage(): DraftStorage {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return window.localStorage;
}
