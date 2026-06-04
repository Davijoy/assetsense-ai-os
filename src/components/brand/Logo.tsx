import { cn } from "@/lib/utils";
import shieldAsset from "@/assets/sentinel-shield.png.asset.json";

/**
 * Sentinel Fort Group mark — official shield + fort + flag emblem (navy & gold).
 */
export function SentinelMark({ className }: { className?: string }) {
  return (
    <img
      src={shieldAsset.url}
      alt="Sentinel Fort Group"
      className={cn("h-7 w-7 object-contain", className)}
      draggable={false}
    />
  );
}

export function SentinelWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <SentinelMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl tracking-tight">Sentinel Fort</span>
        <span className="text-[9px] uppercase tracking-[0.22em] text-gold/80">Group</span>
      </span>
    </span>
  );
}