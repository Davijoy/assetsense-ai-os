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
  const showWatermark = config ? config.watermarkVisibility : true;

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
        "pointer-events-none -z-20 overflow-hidden",
        containerMode ? "absolute inset-0" : "fixed inset-0",
        className
      )}
    >
      {/* slow vertical light wash */}
      <div className={cn("absolute inset-0", glowGradientClass)} />

      {/* faint centered grid (see .bg-grid utility) */}
      <div className={cn("absolute inset-0 bg-grid", gridOpacityClass)} />

      {/* drifting watermark emblem */}
      {showWatermark && gridIntensity !== "none" && (
        <div className="absolute right-[8%] top-[12%] h-56 w-56 -rotate-12 sentinel-atmosphere-drift opacity-70">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-card/20">
            <SentinelMark className="h-14 w-14 opacity-60" />
          </div>
        </div>
      )}

      {/* soft particle field — restful, non-interfering */}
      {particleDensity !== "none" && (
        <div className="absolute inset-0">
          <Dust className="left-[12%] top-[28%]" />
          <Dust className="left-[72%] top-[18%]" />
          {(particleDensity === "medium" || particleDensity === "high") && (
            <>
              <Dust className="left-[38%] top-[64%]" />
              <Dust className="left-[90%] top-[52%]" />
            </>
          )}
          {particleDensity === "high" && (
            <>
              <Dust className="left-[25%] top-[80%]" />
              <Dust className="left-[82%] top-[75%]" />
              <Dust className="left-[55%] top-[22%]" />
              <Dust className="left-[48%] top-[45%]" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Dust({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute h-1.5 w-1.5 rounded-full bg-primary/25 sentinel-atmosphere-drift",
        className
      )}
    />
  );
}