import React from "react";
import { Palette, AlertTriangle, Check, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContrastRatio, type ThemePreset } from "@/lib/theme.manager";
import type { CustomColorOverrides } from "@/lib/services/workspace-theme.service";

interface CustomPaletteEditorProps {
  basePreset: ThemePreset;
  customColors: CustomColorOverrides;
  onUpdateColor: (token: keyof CustomColorOverrides, hex: string) => void;
  onResetColors: () => void;
}

const COLOR_TOKENS: {
  key: keyof CustomColorOverrides;
  label: string;
  defaultKey: keyof ThemePreset;
  description: string;
}[] = [
  { key: "primaryHex", label: "Primary Brand Accent", defaultKey: "primaryHex", description: "Buttons, active badges, key metrics" },
  { key: "accentHex", label: "Secondary Accent", defaultKey: "accentHex", description: "Hover rings, secondary highlights" },
  { key: "backgroundHex", label: "Base Background", defaultKey: "backgroundHex", description: "Deep canvas backdrop color" },
  { key: "surfaceHex", label: "Card & Surface", defaultKey: "surfaceHex", description: "Container cards, tables, popovers" },
  { key: "borderHex", label: "Border Line", defaultKey: "surfaceHex", description: "Card borders, section dividers" },
  { key: "foregroundHex", label: "Text / Foreground", defaultKey: "accentHex", description: "Primary body & heading typography" },
  { key: "goldHex", label: "Luxury Gold / Seal", defaultKey: "primaryHex", description: "Emblem gradients, luxury highlights" },
];

export function CustomPaletteEditor({
  basePreset,
  customColors,
  onUpdateColor,
  onResetColors,
}: CustomPaletteEditorProps) {
  const currentBg = customColors.backgroundHex || basePreset.backgroundHex;
  const currentFg = customColors.foregroundHex || "#F4F4F5";
  const contrastRatio = getContrastRatio(currentFg, currentBg);
  const isLowContrast = contrastRatio < 4.0;

  const handleHexChange = (token: keyof CustomColorOverrides, val: string) => {
    let clean = val.trim();
    if (!clean.startsWith("#")) clean = `#${clean}`;
    if (/^#[0-9A-F]{6}$/i.test(clean) || clean.length <= 7) {
      onUpdateColor(token, clean);
    }
  };

  const hasCustomOverrides = Object.keys(customColors).length > 0;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Custom Palette Overrides (Template: {basePreset.name})
          </h3>
        </div>
        {hasCustomOverrides && (
          <button
            type="button"
            onClick={onResetColors}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Colors</span>
          </button>
        )}
      </div>

      {/* Contrast Alert */}
      {isLowContrast && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">Contrast Warning ({contrastRatio.toFixed(2)}:1)</span>
            <p className="text-[11px] text-amber-300/80">
              The contrast between your background and text color is below recommended WCAG 2.1 AA standards (4.5:1). Consider a lighter text color or darker background.
            </p>
          </div>
        </div>
      )}

      {/* Color Tokens Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {COLOR_TOKENS.map((token) => {
          const currentVal =
            customColors[token.key] || (basePreset as any)[token.defaultKey] || "#121622";

          return (
            <div
              key={token.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 p-2.5"
            >
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground">
                  {token.label}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {token.description}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentVal.length === 7 ? currentVal : "#D4AF37"}
                  onChange={(e) => onUpdateColor(token.key, e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={currentVal}
                  onChange={(e) => handleHexChange(token.key, e.target.value)}
                  maxLength={7}
                  className="w-20 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground uppercase focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
