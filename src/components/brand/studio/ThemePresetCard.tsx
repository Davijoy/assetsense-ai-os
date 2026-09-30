import React from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemePreset } from "@/lib/theme.manager";

interface ThemePresetCardProps {
  preset: ThemePreset;
  isSelected: boolean;
  onSelect: (preset: ThemePreset) => void;
}

export function ThemePresetCard({
  preset,
  isSelected,
  onSelect,
}: ThemePresetCardProps) {
  // Extract clean font names for readable display
  const displayFontClean = preset.fontDisplay.split(",")[0].replace(/['"]/g, "");
  const sansFontClean = preset.fontSans.split(",")[0].replace(/['"]/g, "");

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      aria-pressed={isSelected}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isSelected
          ? "border-primary bg-primary/[0.04] shadow-md ring-1 ring-primary"
          : "border-border bg-card/60 hover:bg-card"
      )}
      style={{
        borderRadius: preset.radius || "0.5rem",
      }}
    >
      {/* Top Title & Badge */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              {preset.name}
            </h3>
            {isSelected && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
          </div>
          <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {preset.badge}
          </span>
        </div>

        {/* Selected Pill */}
        {isSelected && (
          <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[9px] font-bold text-primary uppercase">
            Active
          </span>
        )}
      </div>

      {/* Palette Swatches */}
      <div className="mt-3.5 flex items-center gap-1.5 w-full">
        <div className="flex items-center gap-1">
          <div
            className="h-5 w-5 rounded-full border border-white/10 shadow-xs"
            style={{ backgroundColor: preset.primaryHex }}
            title={`Primary: ${preset.primaryHex}`}
          />
          <div
            className="h-5 w-5 rounded-full border border-white/10 shadow-xs"
            style={{ backgroundColor: preset.accentHex }}
            title={`Accent: ${preset.accentHex}`}
          />
          <div
            className="h-5 w-5 rounded-full border border-white/10 shadow-xs"
            style={{ backgroundColor: preset.surfaceHex }}
            title={`Surface: ${preset.surfaceHex}`}
          />
          <div
            className="h-5 w-5 rounded-full border border-white/10 shadow-xs"
            style={{ backgroundColor: preset.backgroundHex }}
            title={`Background: ${preset.backgroundHex}`}
          />
        </div>
      </div>

      {/* Font & Token Metadata */}
      <div className="mt-3 border-t border-border/50 pt-2.5 flex items-center justify-between text-[10px] text-muted-foreground w-full">
        <div className="truncate">
          <span className="font-semibold text-foreground/80">{displayFontClean}</span>
          <span className="text-muted-foreground/60"> / </span>
          <span>{sansFontClean}</span>
        </div>
        <span className="font-mono text-[9px] bg-background/80 px-1.5 py-0.5 rounded border border-border/60">
          r: {preset.radius}
        </span>
      </div>
    </button>
  );
}
