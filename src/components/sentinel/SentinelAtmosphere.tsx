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

export interface SentinelAtmosphereProps {
  className?: string;
  /** Lower intensity for compact shell surfaces (default ambient). */
  subtle?: boolean;
}

export function SentinelAtmosphere({ className, subtle = false }: SentinelAtmosphereProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 -z-20 overflow-hidden", className)}
    >
      {/* slow vertical light wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-primary/[0.03]" />
      {/* faint centered grid (see .bg-grid utility) */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      {/* drifting watermark emblem */}
      <div className="absolute right-[8%] top-[12%] h-56 w-56 -rotate-12 sentinel-atmosphere-drift opacity-70">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-card/20">
          <SentinelMark className="h-14 w-14 opacity-60" />
        </div>
      </div>
      {/* soft particle field — restful, non-interfering */}
      {!subtle && (
        <div className="absolute inset-0">
          <Dust className="left-[12%] top-[28%]" />
          <Dust className="left-[72%] top-[18%]" />
          <Dust className="left-[38%] top-[64%]" />
          <Dust className="left-[90%] top-[52%]" />
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
        className,
      )}
    />
  );
}