import React from "react";
import { cn } from "@/lib/utils";

/**
 * High-precision vector Spartan Shield Emblem in radiant luxury gold.
 */
export function SpartanShieldIcon({
  className,
  size = 64,
  showStar = true,
}: {
  className?: string;
  size?: number;
  showStar?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-[0_4px_16px_rgba(212,175,55,0.35)]", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="shieldGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D77F" />
          <stop offset="35%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#B89635" />
          <stop offset="100%" stopColor="#8C6D1F" />
        </linearGradient>
        <linearGradient id="shieldInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="100%" stopColor="#F5EEDB" />
        </linearGradient>
        <linearGradient id="helmetGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B89635" />
          <stop offset="50%" stopColor="#8C6D1F" />
          <stop offset="100%" stopColor="#684F12" />
        </linearGradient>
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#D4AF37" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Top Star */}
      {showStar && (
        <path
          d="M50 2 L52.5 8 L58.5 8.5 L54 12.5 L55.5 18.5 L50 15 L44.5 18.5 L46 12.5 L41.5 8.5 L47.5 8 Z"
          fill="url(#shieldGoldGrad)"
          filter="url(#goldGlow)"
        />
      )}

      {/* Outer Golden Shield Frame */}
      <path
        d="M50 16 L84 24 C84 62 68 88 50 98 C32 88 16 62 16 24 Z"
        fill="url(#shieldInnerGrad)"
        stroke="url(#shieldGoldGrad)"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />

      {/* Inner Inset Border */}
      <path
        d="M50 22 L78 28.5 C78 60 64 82 50 91 C36 82 22 60 22 28.5 Z"
        fill="none"
        stroke="#E6CF94"
        strokeWidth="1.5"
        opacity="0.8"
      />

      {/* Spartan Helmet Crest & Face Mask */}
      <g id="spartanHelmet" fill="url(#helmetGoldGrad)">
        {/* Helmet Crest / Ridge */}
        <path
          d="M48 27 C48 27 50 25 52 27 L52 38 C50 39 50 39 48 38 Z"
          fill="url(#shieldGoldGrad)"
        />
        {/* Crown Arch */}
        <path
          d="M34 46 C34 34 42 30 50 30 C58 30 66 34 66 46 C66 52 64 58 64 64 L59 64 C59 55 58 50 56 46 C54 44 46 44 44 46 C42 50 41 55 41 64 L36 64 C36 58 34 52 34 46 Z"
        />
        {/* Nose Bridge / T-Bar */}
        <path
          d="M47 44 L53 44 L52 68 L48 68 Z"
        />
        {/* Cheek Guards */}
        <path
          d="M36 52 L43 52 L44 68 L36 74 Z"
        />
        <path
          d="M64 52 L57 52 L56 68 L64 74 Z"
        />
        {/* Eye Openings (Negative Space) */}
        <path
          d="M41 47 L47 47 L46 51 L40 51 Z"
          fill="#FFFDF7"
        />
        <path
          d="M59 47 L53 47 L54 51 L60 51 Z"
          fill="#FFFDF7"
        />
      </g>
    </svg>
  );
}

/**
 * Topographical golden terrain lines + shimmering particle backdrop.
 */
export function GoldTerrainBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden select-none",
        className,
      )}
      aria-hidden="true"
    >
      {/* Radial soft gold ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[340px] bg-gradient-to-b from-[#FAF1D6]/70 via-[#FDF8EB]/30 to-transparent blur-3xl opacity-70" />

      {/* SVG Wave lines */}
      <svg
        className="absolute top-0 left-0 w-full h-[260px] opacity-40"
        viewBox="0 0 1440 260"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="goldLineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="25%" stopColor="#D4AF37" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#F5D77F" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#D4AF37" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="goldLineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B89635" stopOpacity="0" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#B89635" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M0 120 C320 180 540 80 720 130 C900 180 1120 70 1440 120"
          stroke="url(#goldLineGrad1)"
          strokeWidth="1.2"
        />
        <path
          d="M0 145 C280 90 480 190 720 140 C960 90 1160 190 1440 135"
          stroke="url(#goldLineGrad2)"
          strokeWidth="1"
        />
        <path
          d="M0 90 C360 140 600 60 720 100 C840 140 1080 50 1440 100"
          stroke="url(#goldLineGrad1)"
          strokeWidth="0.8"
          strokeDasharray="4 6"
        />
        <path
          d="M0 170 C400 230 640 140 720 160 C800 180 1040 230 1440 170"
          stroke="url(#goldLineGrad2)"
          strokeWidth="1"
        />
      </svg>

      {/* Floating golden particle dots */}
      <div className="absolute inset-0 fort-shimmer-particles opacity-30" />
    </div>
  );
}

/**
 * Mini Sparkline SVG for live visual metrics on cards.
 */
export function MiniSparkline({
  points = [10, 14, 12, 18, 16, 24, 22, 28, 32],
  height = 36,
  color = "#D4AF37",
  className,
}: {
  points?: number[];
  height?: number;
  color?: string;
  className?: string;
}) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 120;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  const linePath = `M ${coords.join(" L ")}`;
  const areaPath = `M 0,${height} L ${coords.join(" L ")} L ${width},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-full h-9 overflow-visible", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sparkGrad-${color.replace("#", "")})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Mini Bar Chart for Market Intelligence card.
 */
export function MiniBarChart({
  height = 36,
  color = "#D4AF37",
  className,
}: {
  height?: number;
  color?: string;
  className?: string;
}) {
  const bars = [35, 45, 30, 60, 50, 75, 90, 80, 65, 85, 95];
  return (
    <div className={cn("flex items-end gap-1.5 h-9 w-full", className)}>
      {bars.map((pct, idx) => (
        <div
          key={idx}
          className="flex-1 rounded-t-sm transition-all duration-300 hover:brightness-110"
          style={{
            height: `${pct}%`,
            background:
              idx >= bars.length - 3
                ? `linear-gradient(180deg, #F5D77F 0%, ${color} 100%)`
                : `linear-gradient(180deg, ${color}99 0%, ${color}44 100%)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Circular Progress Gauge for utilization & compliance.
 */
export function CircularGauge({
  percentage = 86,
  label = "Utilization",
  size = 54,
  strokeWidth = 5,
  color = "#D4AF37",
}: {
  percentage: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EBE5D8"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center">
        <span className="text-[12px] font-bold text-stone-900">{percentage}%</span>
        {label && <span className="text-[7px] text-stone-500 font-medium uppercase tracking-tight mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
