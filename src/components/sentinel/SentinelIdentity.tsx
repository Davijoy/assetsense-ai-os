/**
 * SENTINEL FORT — living, reusable identity core.
 *
 * A single animated identity element used across the experience. The same
 * visual language (breathing orb, slow drift, occasional pulse) is reused for
 * the welcome moment, the Fort header, compact embeds and the atmospheric
 * background watermark — no duplicated animation code per page.
 *
 * Animation is restrained and GPU-friendly; every motion utility is disabled
 * under `prefers-reduced-motion` (see styles.css). The identity never blocks
 * input and never competes with content.
 */
import { cn } from "@/lib/utils";
import { SentinelMark, SentinelWordmark } from "@/components/brand/Logo";

export interface SentinelIdentityProps {
  /** Background watermark → welcome centerpiece → small compact mark → fort lockup. */
  variant?: "background" | "welcome" | "compact" | "fort";
  className?: string;
  /** Low-opacity watermark (only used by the `background` variant). */
  subtle?: boolean;
}

export function SentinelIdentity({
  variant = "welcome",
  className,
  subtle = false,
}: SentinelIdentityProps) {
  if (variant === "background") {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -z-10 sentinel-drift",
          subtle && "opacity-40",
          className,
        )}
      >
        <span className="sentinel-orb inline-flex h-64 w-64 items-center justify-center rounded-full bg-card/30 sentinel-pulse text-gold/40">
          <SentinelMark className="h-16 w-16 opacity-70" />
        </span>
      </div>
    );
  }

  if (variant === "fort") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <span className="sentinel-orb inline-flex h-20 w-20 items-center justify-center rounded-full bg-card/50 ring-1 ring-primary/20">
          <SentinelMark className="h-10 w-10" />
        </span>
        <SentinelWordmark className="text-muted-foreground/70" />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <span
        title="Sentinel Fort"
        className={cn("sentinel-orb relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-card/60", className)}
      >
        <SentinelMark className="h-6 w-6" />
      </span>
    );
  }

  // welcome
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className="sentinel-orb inline-flex h-24 w-24 items-center justify-center rounded-full bg-card/10 ring-1 ring-primary/15">
        <SentinelMark className="h-12 w-12" />
      </span>
      <SentinelWordmark className="text-gold/90" />
    </div>
  );
}