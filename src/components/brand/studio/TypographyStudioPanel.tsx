import React, { useState } from "react";
import { Type, RotateCcw, Check, Info, Sliders, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FONT_DISPLAY_OPTIONS,
  FONT_SANS_OPTIONS,
  FONT_SCALE_OPTIONS,
  type ThemePreset,
  saveThemeConfig,
  applyThemeToDOM,
} from "@/lib/theme.manager";
import { loadFontsForFamilyPair } from "@/lib/font.loader";

interface TypographyStudioPanelProps {
  selectedPreset: ThemePreset;
  onUpdateTypography: (updates: {
    fontDisplay?: string;
    fontSans?: string;
    fontScale?: number;
  }) => void;
}

export function TypographyStudioPanel({
  selectedPreset,
  onUpdateTypography,
}: TypographyStudioPanelProps) {
  const [sessionApplied, setSessionApplied] = useState(false);

  const currentDisplayFont = selectedPreset.fontDisplay;
  const currentSansFont = selectedPreset.fontSans;
  const currentScale = selectedPreset.fontScale ?? 1.0;

  const handleDisplayFontChange = (fontValue: string) => {
    loadFontsForFamilyPair(fontValue, currentSansFont);
    onUpdateTypography({ fontDisplay: fontValue });
  };

  const handleSansFontChange = (fontValue: string) => {
    loadFontsForFamilyPair(currentDisplayFont, fontValue);
    onUpdateTypography({ fontSans: fontValue });
  };

  const handleScaleChange = (scaleValue: number) => {
    onUpdateTypography({ fontScale: scaleValue });
  };

  const handleApplySession = () => {
    saveThemeConfig(selectedPreset);
    setSessionApplied(true);
    setTimeout(() => setSessionApplied(false), 3000);
  };

  const handleResetDefault = () => {
    const defaultDisplay = FONT_DISPLAY_OPTIONS[0].value; // Instrument Serif
    const defaultSans = FONT_SANS_OPTIONS[0].value; // Work Sans
    const defaultScale = 1.0;

    onUpdateTypography({
      fontDisplay: defaultDisplay,
      fontSans: defaultSans,
      fontScale: defaultScale,
    });

    const updated = {
      ...selectedPreset,
      fontDisplay: defaultDisplay,
      fontSans: defaultSans,
      fontScale: defaultScale,
    };
    saveThemeConfig(updated);
    setSessionApplied(true);
    setTimeout(() => setSessionApplied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Typography Studio
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Calibrate high-contrast display typography and readable body typefaces. Selected fonts are loaded on-demand and isolated to the live preview canvas until applied.
        </p>
      </div>

      {/* Display Font Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Display Font (Headings & Metric Numbers)
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            var(--font-display)
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {FONT_DISPLAY_OPTIONS.map((opt) => {
            const isSelected = currentDisplayFont === opt.value;
            const fontName = opt.label.split(" (")[0];
            const fontDescription = opt.label.split(" (")[1]?.replace(")", "") || "";

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleDisplayFontChange(opt.value)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary"
                    : "border-border bg-card/60 hover:border-border/80 hover:bg-card"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      {fontName}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {fontDescription}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div
                  className="mt-3 truncate text-lg text-foreground/90"
                  style={{ fontFamily: opt.value }}
                >
                  Sentinel Fort ₹84.2 Cr
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body Font Selector */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Body Font (Interface & Tables)
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            var(--font-sans)
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {FONT_SANS_OPTIONS.map((opt) => {
            const isSelected = currentSansFont === opt.value;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSansFontChange(opt.value)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative flex items-center justify-between rounded-xl border p-3 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary"
                    : "border-border bg-card/60 hover:border-border/80 hover:bg-card"
                )}
              >
                <div>
                  <span className="text-xs font-semibold text-foreground">
                    {opt.label}
                  </span>
                  <div
                    className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-[180px]"
                    style={{ fontFamily: opt.value }}
                  >
                    High-density lead matrix & pipeline
                  </div>
                </div>
                {isSelected && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Scale Control */}
      <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Typography Scale
            </label>
          </div>
          <span className="font-mono text-xs font-bold text-primary">
            {Math.round(currentScale * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {FONT_SCALE_OPTIONS.map((scaleOpt) => {
            const isSelected = Math.abs(currentScale - scaleOpt.value) < 0.01;
            return (
              <button
                key={scaleOpt.id}
                type="button"
                onClick={() => handleScaleChange(scaleOpt.value)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                    : "border-border bg-surface/50 text-muted-foreground hover:text-foreground hover:bg-surface"
                )}
              >
                {Math.round(scaleOpt.value * 100)}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleApplySession}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:bg-primary/90 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Apply to current session
          </button>
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-surface transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Typography to Sentinel default
          </button>
          {sessionApplied && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
              ✓ Typography applied for this browser session.
            </span>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/50 p-2.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Typography Persistence:</strong> Typography selections update the live preview deck instantly and apply to your current session. Database-backed multi-tenant typography profiles will be enabled in Phase 2C.
          </span>
        </div>
      </div>
    </div>
  );
}
