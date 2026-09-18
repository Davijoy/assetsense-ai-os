/**
 * SENTINEL FORT — Supreme Entity facial expression.
 *
 * A pure SVG face that renders different expressions based on the entity's
 * visual state. The face consists of:
 *  - Central intelligence core (glowing disc at center)
 *  - Two eyes that shift shape per expression
 *  - A mouth that curves per emotion
 *  - Optional micro-particles (small orbital dots) for thinking/processing
 *
 * All shapes are drawn with simple SVG paths — no canvas, no heavy libs.
 *
 * The entity looks bot-like and premium — NOT cartoonish or childish.
 */
import { cn } from "@/lib/utils";
import { getExpression } from "./SupremeEntityLogic";
import type { SupremeEntityState } from "./SupremeEntity.types";

interface SupremeEntityFaceProps {
  state: SupremeEntityState;
  className?: string;
}

/**
 * Eye shape paths per expression variant.
 * Each path fits in a 24×12 viewBox per eye.
 */
const EYE_PATHS: Record<string, { cx: number; cy: number; path: string; width: number }> = {
  neutral: {
    cx: 12,
    cy: 6,
    width: 12,
    path: "M6 6a6 6 0 1 1 12 0c0 3.31-5.39 5.58-6.24 6.05a.75.75 0 0 1-.76 0C7.39 11.58 6 9.31 6 6Z",
  },
  attentive: {
    cx: 12,
    cy: 6,
    width: 14,
    path: "M5 5.5a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z",
  },
  thinking: {
    cx: 12,
    cy: 5.5,
    width: 10,
    path: "M7 5.5a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z",
  },
  focused: {
    cx: 12,
    cy: 6,
    width: 12,
    path: "M6 6a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z M3 6a9 9 0 0 1 18 0 9 9 0 0 1-18 0Z",
  },
  closed: {
    cx: 12,
    cy: 6,
    width: 8,
    path: "M8 6.5c0-2 4-2 4 0",
  },
  wide: {
    cx: 12,
    cy: 6,
    width: 16,
    path: "M4 6a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z M6 6a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z",
  },
};

/**
 * Mouth path per expression variant.
 * Each path fits in a 32×16 viewBox centered at (16, 8).
 */
const MOUTH_PATHS: Record<string, string> = {
  neutral: "M10 8.5c1.5-1 3-1 5 0",
  smile: "M8 7.5c2-2 6-2 8 0",
  attentive: "M10 6.5c1.5 1 3 1 5 0",
  thinking: "M12 7.5c1-1 2-1 3 0",
  focused: "M8 7c2-2 6-2 8 0",
  pleased: "M7 7c3-2.5 7-2.5 9 0",
  concerned: "M7 7.5c2 1 4 1 6 0",
};

export function SupremeEntityFace({ state, className }: SupremeEntityFaceProps) {
  const expr = getExpression(state);

  const eye = EYE_PATHS[expr.eyes] ?? EYE_PATHS.neutral;
  const mouthPath = MOUTH_PATHS[expr.mouth] ?? MOUTH_PATHS.neutral;
  const showGlow = expr.coreGlow;
  const showParticles = expr.particles;

  return (
    <svg
      className={cn("h-full w-full", className)}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Central intelligence core — the "face" foundation */}
      <circle
        cx="40"
        cy="40"
        r="16"
        className="fill-card stroke-2 stroke-primary/30"
      />

      {/* Core glow (subtle) */}
      {showGlow && (
        <circle
          cx="40"
          cy="40"
          r="20"
          className="fill-primary/10"
        />
      )}

      {/* Left eye */}
      <g transform="translate(16, 20) scale(0.8)">
        <path
          d={eye.path}
          className="fill-foreground/80"
        />
      </g>

      {/* Right eye — mirrored */}
      <g transform="translate(44, 20) scale(-0.8, 0.8)">
        <path
          d={eye.path}
          className="fill-foreground/80"
        />
      </g>

      {/* Mouth / expression */}
      <path
        d={mouthPath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-foreground/70"
        transform="translate(24, 46) scale(0.8)"
      />

      {/* Micro-particles (orbital dots for thinking/processing) */}
      {showParticles && (
        <>
          <circle
            cx="40"
            cy="40"
            r="2"
            className="fill-primary/60 animate-ping"
            style={{ animationDelay: "0ms", animationDuration: "2s" }}
          />
          <circle
            cx="28"
            cy="40"
            r="1.5"
            className="fill-primary/40"
          />
          <circle
            cx="52"
            cy="40"
            r="1.5"
            className="fill-primary/40"
          />
        </>
      )}
    </svg>
  );
}
