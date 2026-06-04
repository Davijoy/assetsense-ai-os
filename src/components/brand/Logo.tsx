import { cn } from "@/lib/utils";

/**
 * Sentinel Fort Group mark — shield + fort + flag with emerald body and gold accents.
 */
export function SentinelMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-7 w-7", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sf-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.85 0.2 158)" />
          <stop offset="100%" stopColor="oklch(0.6 0.15 158)" />
        </linearGradient>
        <linearGradient id="sf-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.86 0.15 88)" />
          <stop offset="100%" stopColor="oklch(0.7 0.11 82)" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path
        d="M20 2 L36 7 V20 C36 29 28.5 35.5 20 38 C11.5 35.5 4 29 4 20 V7 Z"
        fill="url(#sf-shield)"
        stroke="url(#sf-gold)"
        strokeWidth="1.2"
      />
      {/* Fort crenellations */}
      <path
        d="M11 18 H13 V15 H16 V18 H18 V15 H22 V18 H24 V15 H27 V18 H29 V28 H11 Z"
        fill="oklch(0.13 0.03 260)"
        stroke="url(#sf-gold)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Fort door */}
      <rect x="18" y="22" width="4" height="6" fill="url(#sf-gold)" />
      {/* Flag pole */}
      <line x1="20" y1="6" x2="20" y2="15" stroke="url(#sf-gold)" strokeWidth="1" />
      {/* Flag */}
      <path d="M20 7 L26 8.5 L20 10 Z" fill="url(#sf-gold)" />
    </svg>
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