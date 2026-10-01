/**
 * SENTINEL FORT — global atmospheric identity layer.
 *
 * A subtle, reusable behind-everything background that makes each Sentinel
 * surface feel like the same living intelligence environment: a faint grid, a
 * slow-moving light gradient, soft drifting emblem, and dust-like particles.
 *
 * Always `pointer-events-none` and absolutely inset so it never intercepts
 * clicks or covers content. Motion is restrained and disabled entirely under
 * `prefers-reduced-motion` (see styles.css `.sentinel-*` utilities).
 */
import { cn } from "@/lib/utils";
import { SentinelMark } from "@/components/brand/Logo";
import type { AtmosphereConfig } from "@/lib/motion.manager";

export interface WatermarkPreset {
  id: string;
  top: string;
  left: string;
  size: number;
  opacity: number;
  delay: string;
  animClass: string;
  responsiveClass?: string;
}

export const WATERMARK_PRESETS: WatermarkPreset[] = [
  {
    id: "wm-1",
    top: "12%",
    left: "78%",
    size: 28,
    opacity: 0.14,
    delay: "-3s",
    animClass: "sentinel-watermark-float-1",
  },
  {
    id: "wm-2",
    top: "32%",
    left: "8%",
    size: 22,
    opacity: 0.11,
    delay: "-8s",
    animClass: "sentinel-watermark-float-2",
  },
  {
    id: "wm-3",
    top: "67%",
    left: "84%",
    size: 26,
    opacity: 0.13,
    delay: "-13s",
    animClass: "sentinel-watermark-float-3",
    responsiveClass: "hidden sm:block",
  },
  {
    id: "wm-4",
    top: "78%",
    left: "28%",
    size: 20,
    opacity: 0.10,
    delay: "-18s",
    animClass: "sentinel-watermark-float-4",
    responsiveClass: "hidden md:block",
  },
];

export function resolveWatermarkCount(
  showWatermark: boolean,
  particleDensity: string,
  driftIntensity: string,
  explicitCount?: number
): number {
  if (!showWatermark) return 0;
  if (explicitCount !== undefined) return explicitCount;
  if (particleDensity === "none" || driftIntensity === "none") return 0;
  if (particleDensity === "low") return 2;
  if (particleDensity === "medium") return 3;
  if (particleDensity === "high") return 4;
  return 3;
}

export interface SentinelAtmosphereProps {
  className?: string;
  /** Lower intensity for compact shell surfaces (default ambient). */
  subtle?: boolean;
  /** Custom studio atmosphere configuration overrides. */
  config?: AtmosphereConfig;
  /** Render with absolute positioning within a parent container (e.g. preview canvas). */
  containerMode?: boolean;
}

export function SentinelAtmosphere({
  className,
  subtle = false,
  config,
  containerMode = false,
}: SentinelAtmosphereProps) {
  // If explicitly disabled via config, render nothing
  if (config && config.enabled === false) {
    return null;
  }

  // Derive active intensities from config or fallback defaults
  const gridIntensity = config?.gridIntensity ?? (subtle ? "low" : "medium");
  const glowIntensity = config?.glowIntensity ?? (subtle ? "low" : "medium");
  const particleDensity = config?.particleDensity ?? (subtle ? "none" : "medium");
  const driftIntensity = config?.driftIntensity ?? (subtle ? "low" : "medium");
  const showWatermark = config ? config.watermarkVisibility : true;

  const driftClass = driftIntensity === "none" ? "" : "sentinel-atmosphere-drift";
  const watermarkCount = resolveWatermarkCount(
    showWatermark,
    particleDensity,
    driftIntensity,
    config?.watermarkCount
  );

  // Compute CSS classes based on intensity levels
  const gridOpacityClass =
    gridIntensity === "none"
      ? "hidden"
      : gridIntensity === "low"
      ? "opacity-20"
      : gridIntensity === "high"
      ? "opacity-60"
      : "opacity-40";

  const glowGradientClass =
    glowIntensity === "none"
      ? "hidden"
      : glowIntensity === "low"
      ? "bg-gradient-to-b from-primary/[0.02] via-transparent to-primary/[0.015]"
      : glowIntensity === "high"
      ? "bg-gradient-to-b from-primary/[0.08] via-primary/[0.02] to-primary/[0.06]"
      : "bg-gradient-to-b from-primary/[0.04] via-transparent to-primary/[0.03]";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none z-0 overflow-hidden",
        containerMode ? "absolute inset-0" : "fixed inset-0",
        className
      )}
    >
      {/* slow vertical light wash with breathing glow */}
      <div className={cn("absolute inset-0", glowGradientClass, driftClass ? "sentinel-orb" : "")} />

      {/* faint centered grid (see .bg-grid utility) */}
      <div className={cn("absolute inset-0 bg-grid", gridOpacityClass)} />

      {/* multiple floating watermark marks (no circular container, transparent background, subtle glow) */}
      {watermarkCount > 0 && (
        <div
          data-testid="sentinel-watermarks"
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          {WATERMARK_PRESETS.slice(0, watermarkCount).map((preset) => (
            <div
              key={preset.id}
              data-testid={`sentinel-watermark-${preset.id}`}
              className={cn(
                "absolute pointer-events-none select-none transition-opacity",
                driftClass ? preset.animClass : "",
                preset.responsiveClass
              )}
              style={{
                top: preset.top,
                left: preset.left,
                animationDelay: preset.delay,
                opacity: preset.opacity,
                filter: "drop-shadow(0 0 6px var(--primary))",
              }}
            >
              <div
                style={{
                  width: `${preset.size}px`,
                  height: `${preset.size}px`,
                }}
              >
                <SentinelMark className="h-full w-full object-contain" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* soft particle field — restful, non-interfering */}
      {particleDensity !== "none" && (
        <div className="absolute inset-0">
          <Dust className="left-[12%] top-[28%]" driftClass={driftClass} delay="0s" />
          <Dust className="left-[72%] top-[18%]" driftClass={driftClass} delay="2.5s" alt={true} />
          {(particleDensity === "medium" || particleDensity === "high") && (
            <>
              <Dust className="left-[38%] top-[64%]" driftClass={driftClass} delay="1.2s" />
              <Dust className="left-[90%] top-[52%]" driftClass={driftClass} delay="3.8s" alt={true} />
            </>
          )}
          {particleDensity === "high" && (
            <>
              <Dust className="left-[25%] top-[80%]" driftClass={driftClass} delay="0.5s" />
              <Dust className="left-[82%] top-[75%]" driftClass={driftClass} delay="2.0s" alt={true} />
              <Dust className="left-[55%] top-[22%]" driftClass={driftClass} delay="3.2s" />
              <Dust className="left-[48%] top-[45%]" driftClass={driftClass} delay="4.5s" alt={true} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Dust({
  className,
  driftClass = "",
  delay = "0s",
  alt = false,
}: {
  className?: string;
  driftClass?: string;
  delay?: string;
  alt?: boolean;
}) {
  const animClass = driftClass ? (alt ? "sentinel-atmosphere-drift-alt" : "sentinel-atmosphere-drift") : "";
  return (
    <span
      className={cn(
        "absolute h-2 w-2 rounded-full bg-primary/70 shadow-[0_0_8px_var(--primary)]",
        animClass,
        className
      )}
      style={{
        animationDelay: delay,
      }}
    />
  );
}