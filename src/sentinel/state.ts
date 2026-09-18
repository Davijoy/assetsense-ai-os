/**
 * SENTINEL FORT — Onboarding state derivation.
 *
 * Existing authenticated users with complete profiles must continue normally.
 * This derivation is PURE and deterministic: it never touches auth, never
 * force-bounces, and never writes to the DB.
 */
import type { OnboardingState, SentinelIntent, SentinelPersona } from "./types";

export interface OnboardingInput {
  /** Collected personae (may be empty). */
  personae: SentinelPersona[];
  /** Collected intents (may be empty). */
  intents: SentinelIntent[];
  /** Whether the user has pre-existing profile/visit data. */
  hasProfile: boolean;
  /** Whether the user has been seen before this session. */
  isReturning: boolean;
}

/** Deterministic onboarding state. Deliberately conservative: never forces a
 *  complete profile to re-onboard. */
export function deriveOnboardingState(input: OnboardingInput): OnboardingState {
  const { personae, intents, hasProfile, isReturning } = input;
  const personaeCount = personae.length;
  const collectedBaseline =
    hasProfile && personaeCount > 0 && intents.length > 0;

  if (collectedBaseline && isReturning) {
    return personaeCount > 1 ? "MULTI_PERSONA" : "RETURNING_USER";
  }
  if (collectedBaseline) {
    return personaeCount > 1 ? "MULTI_PERSONA" : "PROFILE_COMPLETE";
  }
  if (hasProfile) return "PROFILE_INCOMPLETE";
  return "NEW_USER";
}

/** A profile is complete when it has at least one persona + one intent. */
export function isProfileComplete(
  personae: readonly SentinelPersona[],
  intents: readonly SentinelIntent[],
): boolean {
  return personae.length > 0 && intents.length > 0;
}