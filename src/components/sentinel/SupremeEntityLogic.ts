/**
 * SENTINEL FORT — Supreme Entity interaction logic.
 *
 * Pure, dependency-free functions for:
 *  - state machine transitions (with auto-reset to idle)
 *  - expression lookup (state → facial descriptor)
 *  - viewport clamping (keeps entity on-screen when dragged)
 *  - spring physics simulation (damped oscillation for drag settling)
 *
 * This module imports NO intelligence services, NO Supabase client, and
 * NO server functions. It is 100% UI presentation logic, testable in node.
 */
import type { SupremeEntityState, SupremeExpression } from "./SupremeEntity.types";

/**
 * State → expression mapping. Each state has its own subtle visual language.
 *
 * Design notes:
 * - Expressions are intentionally minimal (eyes + mouth + core glow).
 * - No exaggerated cartoon features — appropriate for enterprise-grade AI.
 */
export const SUPREME_EXPRESSIONS: Record<SupremeEntityState, SupremeExpression> = {
  idle: {
    eyes: "neutral",
    mouth: "smile", // calm, slightly smiling
    coreGlow: false,
    particles: false,
    scale: 1,
  },
  ready: {
    eyes: "neutral",
    mouth: "smile",
    coreGlow: true,
    particles: false,
    scale: 1,
  },
  aware: {
    eyes: "attentive",
    mouth: "smile",
    coreGlow: true,
    particles: false,
    scale: 1.05,
  },
  active: {
    eyes: "attentive",
    mouth: "attentive",
    coreGlow: true,
    particles: false,
    scale: 1.05,
  },
  hover: {
    eyes: "attentive",
    mouth: "smile",
    coreGlow: true,
    particles: false,
    scale: 1.05,
  },
  listening: {
    eyes: "attentive",
    mouth: "attentive",
    coreGlow: true,
    particles: false,
    scale: 1.05,
  },
  thinking: {
    eyes: "thinking",
    mouth: "thinking",
    coreGlow: true,
    particles: true,
    scale: 1.08,
  },
  processing: {
    eyes: "focused",
    mouth: "focused",
    coreGlow: true,
    particles: true,
    scale: 1.1,
  },
  success: {
    eyes: "closed",
    mouth: "pleased",
    coreGlow: true,
    particles: false,
    scale: 1.12,
  },
  insight: {
    eyes: "wide",
    mouth: "pleased",
    coreGlow: true,
    particles: true,
    scale: 1.08,
  },
  warning: {
    eyes: "attentive",
    mouth: "concerned",
    coreGlow: false,
    particles: false,
    scale: 1,
  },
  alert: {
    eyes: "attentive",
    mouth: "concerned",
    coreGlow: true,
    particles: false,
    scale: 1.02,
  },
  error: {
    eyes: "attentive",
    mouth: "concerned",
    coreGlow: false,
    particles: false,
    scale: 1,
  },
  dragging: {
    eyes: "attentive",
    mouth: "neutral",
    coreGlow: true,
    particles: false,
    scale: 1.1,
  },
  pressed: {
    eyes: "neutral",
    mouth: "neutral",
    coreGlow: true,
    particles: false,
    scale: 0.95,
  },
};

/**
 * Transient states that auto-reset to "idle" after a timeout.
 * These are momentary expressions.
 */
export const TRANSIENT_STATES: ReadonlySet<SupremeEntityState> = new Set([
  "success",
  "insight",
  "warning",
  "alert",
  "error",
  "pressed",
]);

/** Duration (ms) before a transient state resets to idle. */
export const TRANSIENT_TIMEOUT_MS = 2500;

/** Look up the expression descriptor for a given state. */
export function getExpression(state: SupremeEntityState): SupremeExpression {
  return SUPREME_EXPRESSIONS[state];
}

/** Determine whether a state should auto-reset to idle. */
export function isTransientState(state: SupremeEntityState): boolean {
  return TRANSIENT_STATES.has(state);
}

/** Get the expression name for a state (for testing / debugging). */
export function expressionName(state: SupremeEntityState): string {
  const expr = SUPREME_EXPRESSIONS[state];
  return `${expr.eyes}/${expr.mouth}`;
}

/**
 * Clamp a dragged position to viewport bounds with safe margins.
 *
 * Uses the element's own dimensions to ensure it never disappears off-screen.
 * Works across desktop, mobile, and browser zoom.
 *
 * @param x        Proposed left position (px from viewport left)
 * @param y        Proposed top position (px from viewport top)
 * @param elementWidth  Width of the draggable element
 * @param elementHeight Height of the draggable element
 * @param margins   Safe margin from each edge (px)
 * @param viewport Optional viewport dimensions (for testing)
 * @returns Clamped { x, y } position
 */
export function clampToViewport(
  x: number,
  y: number,
  elementWidth: number,
  elementHeight: number,
  margins: { top: number; right: number; bottom: number; left: number } = {
    top: 16,
    right: 16,
    bottom: 16,
    left: 16,
  },
  viewport?: { width: number; height: number },
): { x: number; y: number } {
  const vw = viewport?.width ??
    (typeof window !== "undefined" ? window.innerWidth : 1200);
  const vh = viewport?.height ??
    (typeof window !== "undefined" ? window.innerHeight : 800);

  const minX = margins.left;
  const maxX = vw - elementWidth - margins.right;
  const minY = margins.top;
  const maxY = vh - elementHeight - margins.bottom;

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}

/**
 * Default spring configuration for drag settling.
 * Critically damped — settles quickly without overshooting.
 */
export const DEFAULT_SPRING = {
  stiffness: 280,
  damping: 22,
  mass: 0.8,
};

/**
 * Damped spring physics simulator for organic drag settling.
 *
 * Models a simple critically-damped spring that returns the entity to its
 * target position. Avoids external physics dependencies.
 *
 * @param currentPos   Current position value
 * @param targetPos    Target position value (where entity should settle)
 * @param velocity     Current velocity
 * @param springConfig { stiffness, damping, mass }
 * @param dt           Time delta (ms) since last frame
 * @returns { position, velocity } after one physics step
 */
export function springStep(
  currentPos: number,
  targetPos: number,
  velocity: number,
  springConfig: { stiffness: number; damping: number; mass: number },
  dt: number,
): { position: number; velocity: number } {
  const k = springConfig.stiffness;
  const c = springConfig.damping;
  const m = springConfig.mass;
  const seconds = dt / 1000;

  // Hooke's law: F = -k * (x - target)
  const force = -k * (currentPos - targetPos);
  // Damping: F_d = -c * v
  const dampingForce = -c * velocity;
  // a = F / m
  const acceleration = (force + dampingForce) / m;

  const newVelocity = velocity + acceleration * seconds;
  const newPosition = currentPos + newVelocity * seconds;

  return { position: newPosition, velocity: newVelocity };
}

/**
 * Compute a "settle toward edge" target for magnetic resting behavior.
 *
 * When released near an edge, the entity gently settles toward that edge's
 * safe position. When released in open space, it stays approximately where
 * it was released (clamped).
 *
  * @param releaseX     Release position x
 * @param releaseY     Release position y
 * @param elementWidth  Element width
 * @param elementHeight Element height
 * @param viewport Optional viewport dimensions (for testing)
 * @returns Target { x, y } for spring settling
 */
export function computeSettleTarget(
  releaseX: number,
  releaseY: number,
  elementWidth: number,
  elementHeight: number,
  viewport?: { width: number; height: number },
): { x: number; y: number } {
  const clamped = clampToViewport(
    releaseX,
    releaseY,
    elementWidth,
    elementHeight,
    undefined,
    viewport,
  );

  const vw =
    viewport?.width ??
    (typeof window !== "undefined" ? window.innerWidth : 1200);
  const vh =
    viewport?.height ??
    (typeof window !== "undefined" ? window.innerHeight : 800);

  const proximityThreshold = 0.15; // 15% of viewport from edge
  const distToLeft = clamped.x;
  const distToRight = vw - clamped.x - elementWidth;
  const distToTop = clamped.y;
  const distToBottom = vh - clamped.y - elementHeight;

  const margin = 16;

  // If near left edge, settle to left; near right edge, settle to right; etc.
  if (distToLeft < vw * proximityThreshold) {
    return { x: margin, y: clamped.y };
  }
  if (distToRight < vw * proximityThreshold) {
    return { x: vw - elementWidth - margin, y: clamped.y };
  }
  if (distToTop < vh * proximityThreshold) {
    return { x: clamped.x, y: margin };
  }
  if (distToBottom < vh * proximityThreshold) {
    return { x: clamped.x, y: vh - elementHeight - margin };
  }

  // Released in open space — stay approximately here (clamped)
  return clamped;
}
