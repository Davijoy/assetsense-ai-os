/**
 * SENTINEL FORT — Supreme Entity visual state types.
 *
 * Pure type definitions only — no runtime imports of intelligence services.
 * This module is consumed by the SupremeEntity UI layer and its tests.
 */

/**
 * Deterministic visual state model for the Supreme floating entity.
 *
 * A single discriminated string is used instead of scattered booleans so
 * the expression engine, motion controller, and tests can switch on a
 * single value.
 */
export type SupremeEntityState =
  | "idle"
  | "ready"
  | "aware"
  | "active"
  | "hover"
  | "listening"
  | "thinking"
  | "processing"
  | "success"
  | "insight"
  | "warning"
  | "alert"
  | "error"
  | "dragging"
  | "pressed";

/**
 * Expression descriptors — which facial features apply per state.
 *
 * The face is drawn by `SupremeEntityFace` using these values. This keeps
 * the expression system declarative and testable without rendering.
 */
export interface SupremeExpression {
  /** Eye shape variant. */
  eyes: "neutral" | "attentive" | "thinking" | "focused" | "closed" | "wide";
  /** Mouth / smile shape variant. */
  mouth: "neutral" | "smile" | "attentive" | "thinking" | "concerned" | "pleased" | "focused";
  /** Whether the intelligence core glows. */
  coreGlow: boolean;
  /** Whether micro-particles are visible. */
  particles: boolean;
  /** Scale multiplier for subtle state emphasis. */
  scale: number;
}

export interface SupremeEntityContextValue {
  /** Current visual state of the entity. */
  state: SupremeEntityState;
  /** Set a new state (external control, e.g. from Companion activity). */
  setState: (state: SupremeEntityState) => void;
}
