import React from "react";
import {
  Sparkles,
  Search,
  Bell,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SpartanShieldIcon } from "@/components/sentinel/FortEmblem";
import { DEFAULT_SENTINEL_LOGO } from "@/components/brand/Logo";
import { SentinelAtmosphere } from "@/components/sentinel/SentinelAtmosphere";
import {
  getThemeCssVariables,
  type ThemePreset,
  type ComponentConfig,
  DEFAULT_COMPONENT_CONFIG,
} from "@/lib/theme.manager";
import {
  getMotionCssVariables,
  type MotionProfile,
  type AtmosphereConfig,
  DEFAULT_MOTION_PROFILE,
  DEFAULT_ATMOSPHERE_CONFIG,
} from "@/lib/motion.manager";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import type { ViewportMode, PreviewMode } from "./PreviewToolbar";

interface BrandPreviewCanvasProps {
  theme: ThemePreset;
  viewport: ViewportMode;
  previewMode: PreviewMode;
  logoLight: string | null;
  logoDark: string | null;
  motionProfile?: MotionProfile;
  atmosphereConfig?: AtmosphereConfig;
  componentConfig?: ComponentConfig;
}

export function BrandPreviewCanvas({
  theme,
  viewport,
  previewMode,
  logoLight,
  logoDark,
  motionProfile = DEFAULT_MOTION_PROFILE,
  atmosphereConfig = DEFAULT_ATMOSPHERE_CONFIG,
  componentConfig = DEFAULT_COMPONENT_CONFIG,
}: BrandPreviewCanvasProps) {
  const prefersReduced = usePrefersReducedMotion();
  const themeVars = getThemeCssVariables(theme, componentConfig);
  const motionVars = getMotionCssVariables(motionProfile, prefersReduced);
  const activeLogoDark = logoDark || logoLight || DEFAULT_SENTINEL_LOGO;

  const viewportClass =
    viewport === "mobile"
      ? "max-w-[340px]"
      : viewport === "tablet"
      ? "max-w-[560px]"
      : "w-full";

  const fontScale = theme.fontScale ?? 1.0;

  return (
    <div className="w-full overflow-hidden rounded-b-xl border border-t-0 border-border bg-background/90 p-3 sm:p-4">
      <div
        className={cn(
          "relative isolate mx-auto transition-all duration-300 overflow-hidden rounded-xl border border-border shadow-2xl",
          viewportClass
        )}
        style={{
          ...themeVars,
          ...motionVars,
          backgroundColor: theme.backgroundHex || "var(--background)",
          fontFamily: theme.fontSans,
          fontSize: `${fontScale}rem`,
          borderRadius: theme.radius || "0.5rem",
        }}
      >
        {/* Render Isolated Sentinel Atmosphere */}
        <SentinelAtmosphere containerMode={true} config={atmosphereConfig} />

        {/* Content Container (Layered above atmosphere with semi-translucent surfaces) */}
        <div className="relative z-10">
          {/* Simulated Top Navbar */}
          <header
            className="flex items-center justify-between border-b border-border/80 px-3 py-2.5 backdrop-blur-md transition-all duration-200"
            style={{ backgroundColor: theme.surfaceHex ? `${theme.surfaceHex}D9` : "var(--card)" }}
          >
            <div className="flex items-center gap-2">
              {activeLogoDark ? (
                <img
                  src={activeLogoDark}
                  alt="Brand logo"
                  className="h-6 max-w-[100px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <SpartanShieldIcon size={20} showStar={false} />
                  <span
                    className="text-xs font-bold tracking-tight text-foreground"
                    style={{ fontFamily: theme.fontDisplay }}
                  >
                    SENTINEL FORT
                  </span>
                </div>
              )}
              <span
                className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${theme.primaryHex}20`,
                  color: theme.primaryHex,
                  border: `1px solid ${theme.primaryHex}40`,
                }}
              >
                {theme.badge}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">
                <Search className="h-3 w-3" />
                <span>Quick search…</span>
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface border border-border text-[9px] font-bold text-foreground">
                SF
              </div>
            </div>
          </header>

          {/* Main Content Preview */}
          <div className="p-4 space-y-3.5 text-foreground">
            {/* Header Title & Action */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                  {previewMode === "fort"
                    ? "Executive Intelligence"
                    : previewMode === "crm"
                    ? "Pipeline & Deals"
                    : "Lead Management"}
                </p>
                <h2
                  className="text-xl font-bold tracking-tight mt-0.5"
                  style={{ fontFamily: theme.fontDisplay }}
                >
                  {previewMode === "fort"
                    ? "Executive Overview"
                    : previewMode === "crm"
                    ? "Active Deal Room"
                    : "Qualified Prospects"}
                </h2>
              </div>
              <button
                type="button"
                className="sentinel-motion-transition sentinel-motion-hover inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
                style={{
                  backgroundColor: theme.primaryHex,
                  borderRadius: themeVars["--button-radius"] || theme.radius,
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{previewMode === "fort" ? "Run Assessment" : "New Record"}</span>
              </button>
            </div>

            {/* Metric KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div
                className="sentinel-motion-transition sentinel-motion-hover rounded-lg border border-border/70 p-2.5 backdrop-blur-xs"
                style={{
                  backgroundColor: theme.surfaceHex ? `${theme.surfaceHex}D0` : "var(--card)",
                  borderRadius: theme.radius,
                  boxShadow: themeVars["--card-shadow"] || "none",
                }}
              >
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{previewMode === "leads" ? "Active Leads" : "Pipeline Volume"}</span>
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                </div>
                <div
                  className="mt-1 text-base font-bold font-mono tracking-tight text-foreground"
                  style={{ fontFamily: theme.fontSans }}
                >
                  {previewMode === "leads" ? "142" : "₹48.6 Cr"}
                </div>
                <div className="mt-0.5 text-[9px] font-medium text-emerald-400">
                  +14.2% vs baseline
                </div>
              </div>

              <div
                className="sentinel-motion-transition sentinel-motion-hover rounded-lg border border-border/70 p-2.5 backdrop-blur-xs"
                style={{
                  backgroundColor: theme.surfaceHex ? `${theme.surfaceHex}D0` : "var(--card)",
                  borderRadius: theme.radius,
                  boxShadow: themeVars["--card-shadow"] || "none",
                }}
              >
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Conversion</span>
                  <CheckCircle2 className="h-3 w-3" style={{ color: theme.primaryHex }} />
                </div>
                <div className="mt-1 text-base font-bold font-mono tracking-tight text-foreground">
                  18.4%
                </div>
                <div className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                  98 Qualified
                </div>
              </div>

              <div
                className="col-span-2 sm:col-span-1 sentinel-motion-transition sentinel-motion-hover rounded-lg border border-border/70 p-2.5 backdrop-blur-xs"
                style={{
                  backgroundColor: theme.surfaceHex ? `${theme.surfaceHex}D0` : "var(--card)",
                  borderRadius: theme.radius,
                  boxShadow: themeVars["--card-shadow"] || "none",
                }}
              >
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>System Status</span>
                  <ShieldCheck className="h-3 w-3 text-primary" />
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 sentinel-pulse" />
                  <span>SOVEREIGN ACTIVE</span>
                </div>
                <div className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                  Sentinel Guard 2.0
                </div>
              </div>
            </div>

            {/* Sample Interactive Component Deck */}
            <div
              className="sentinel-motion-transition rounded-lg border border-border/70 p-3 space-y-2.5 backdrop-blur-xs"
              style={{
                backgroundColor: theme.surfaceHex ? `${theme.surfaceHex}D0` : "var(--card)",
                borderRadius: theme.radius,
                boxShadow: themeVars["--card-shadow"] || "none",
              }}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  Theme Visual Elements
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: theme.primaryHex }}
                >
                  {theme.name}
                </span>
              </div>

              {/* Buttons & Badges Demo */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  className="sentinel-motion-transition sentinel-motion-hover rounded-md px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-xs"
                  style={{
                    backgroundColor: theme.primaryHex,
                    borderRadius: themeVars["--button-radius"] || theme.radius,
                  }}
                >
                  Primary Button
                </button>
                <button
                  type="button"
                  className="sentinel-motion-transition sentinel-motion-hover rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface/60"
                  style={{ borderRadius: themeVars["--button-radius"] || theme.radius }}
                >
                  Outline Button
                </button>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                  style={{
                    backgroundColor: `${theme.primaryHex}25`,
                    color: theme.primaryHex,
                    border: `1px solid ${theme.primaryHex}50`,
                  }}
                >
                  Active Badge
                </span>
              </div>

              {/* Sample Table Row */}
              <div className="sentinel-motion-transition sentinel-motion-hover rounded-md border border-border/50 bg-background/50 p-2 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full sentinel-orb"
                    style={{ backgroundColor: theme.primaryHex }}
                  />
                  <div>
                    <div className="font-semibold text-foreground text-[11px]">
                      The Luminary Penthouse · Mumbai
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      Investor Group · Deal Room #DR-809
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground">
                  <span>₹14.5 Cr</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer info strip */}
          <footer
            className="border-t border-border/60 px-3 py-1.5 text-[9px] text-muted-foreground flex items-center justify-between"
            style={{ backgroundColor: theme.surfaceHex ? `${theme.surfaceHex}99` : "var(--card)" }}
          >
            <span>Preview Canvas · Visual Simulation</span>
            <span className="font-mono">{theme.id}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
