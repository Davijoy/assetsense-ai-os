import React, { useState } from "react";
import { Sparkles, RotateCcw, Check, Palette, Info, ArrowRight } from "lucide-react";
import { THEME_PRESETS, DEFAULT_THEME, type ThemePreset, saveThemeConfig } from "@/lib/theme.manager";
import type { CustomColorOverrides } from "@/lib/services/workspace-theme.service";
import { ThemePresetCard } from "./ThemePresetCard";
import { CustomPaletteEditor } from "./CustomPaletteEditor";

interface ThemePresetGridProps {
  selectedPreset: ThemePreset;
  onSelectPreset: (preset: ThemePreset) => void;
  customColors?: CustomColorOverrides;
  onUpdateColor?: (token: keyof CustomColorOverrides, hex: string) => void;
  onResetColors?: () => void;
}

export function ThemePresetGrid({
  selectedPreset,
  onSelectPreset,
  customColors = {},
  onUpdateColor = () => {},
  onResetColors = () => {},
}: ThemePresetGridProps) {
  const [sessionApplied, setSessionApplied] = useState(false);

  const handleApplySession = () => {
    saveThemeConfig(selectedPreset);
    setSessionApplied(true);
    setTimeout(() => setSessionApplied(false), 3000);
  };

  const handleResetDefault = () => {
    onSelectPreset(DEFAULT_THEME);
    onResetColors();
    saveThemeConfig(DEFAULT_THEME);
    setSessionApplied(true);
    setTimeout(() => setSessionApplied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Curated Luxury Themes
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Select from executive-grade design presets calibrated for high-contrast intelligence surfaces,
          bespoke typography pairings, and tactile visual depth.
        </p>
      </div>

      {/* Preset Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_PRESETS.map((preset) => (
          <ThemePresetCard
            key={preset.id}
            preset={preset}
            isSelected={selectedPreset.id === preset.id}
            onSelect={onSelectPreset}
          />
        ))}
      </div>

      {/* Custom Color Palette Builder */}
      <CustomPaletteEditor
        basePreset={selectedPreset}
        customColors={customColors}
        onUpdateColor={onUpdateColor}
        onResetColors={onResetColors}
      />

      {/* Active Theme Summary Card */}
      <div className="rounded-xl border border-border bg-card/80 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: customColors.primaryHex || selectedPreset.primaryHex }}
            />
            <span className="text-xs font-bold text-foreground">
              Active Selection: {selectedPreset.name} {Object.keys(customColors).length > 0 ? "(Customized)" : ""}
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
            {selectedPreset.id}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted-foreground border-t border-border/60 pt-3">
          <div>
            <span className="block font-semibold text-foreground/70 uppercase text-[8px] tracking-wider">Primary Hex</span>
            <span className="font-mono">{customColors.primaryHex || selectedPreset.primaryHex}</span>
          </div>
          <div>
            <span className="block font-semibold text-foreground/70 uppercase text-[8px] tracking-wider">Accent Hex</span>
            <span className="font-mono">{customColors.accentHex || selectedPreset.accentHex}</span>
          </div>
          <div>
            <span className="block font-semibold text-foreground/70 uppercase text-[8px] tracking-wider">Display Font</span>
            <span className="truncate block font-serif">{selectedPreset.fontDisplay.split(",")[0].replace(/['"]/g, "")}</span>
          </div>
          <div>
            <span className="block font-semibold text-foreground/70 uppercase text-[8px] tracking-wider">Corner Radius</span>
            <span className="font-mono">{selectedPreset.radius}</span>
          </div>
        </div>
      </div>

      {/* Session Action Toolbar & Notice */}
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
            Reset to Sentinel default
          </button>
          {sessionApplied && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
              ✓ Theme applied for this browser session.
            </span>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/50 p-2.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Theme Persistence:</strong> Selections apply to the live preview canvas immediately. Click "Save Changes" in the top studio bar to persist across all workspace users.
          </span>
        </div>
      </div>
    </div>
  );
}
