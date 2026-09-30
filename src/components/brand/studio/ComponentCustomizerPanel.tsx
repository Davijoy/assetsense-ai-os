import React from "react";
import {
  Component as ComponentIcon,
  Box,
  Layers,
  Square,
  Sparkles,
  Maximize2,
  Sliders,
  Check,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RADIUS_OPTIONS,
  ELEVATION_OPTIONS,
  BORDER_STRENGTH_OPTIONS,
  BUTTON_SHAPE_OPTIONS,
  DENSITY_OPTIONS,
  GLASS_OPTIONS,
  type ComponentConfig,
  type ElevationLevel,
  type BorderStrength,
  type ButtonShape,
  type DensityLevel,
  type GlassEffect,
  DEFAULT_COMPONENT_CONFIG,
} from "@/lib/theme.manager";

interface ComponentCustomizerPanelProps {
  currentRadius: string;
  componentConfig: ComponentConfig;
  onUpdateRadius: (radius: string) => void;
  onUpdateComponentConfig: (config: ComponentConfig) => void;
}

export function ComponentCustomizerPanel({
  currentRadius,
  componentConfig,
  onUpdateRadius,
  onUpdateComponentConfig,
}: ComponentCustomizerPanelProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Component & Surface Styling
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Calibrate tactile elevation shadows, border definition, button geometry, and backdrop blur across all dashboard cards and action triggers.
        </p>
      </div>

      {/* 1. Global Corner Radius */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Global Corner Radius
          </label>
          <span className="font-mono text-[10px] text-muted-foreground">
            var(--radius)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RADIUS_OPTIONS.map((opt) => {
            const isSelected = currentRadius === opt.value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateRadius(opt.value)}
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary"
                    : "border-border bg-card/60 hover:bg-card"
                )}
              >
                <div
                  className="h-8 w-12 border-2 border-primary/70 bg-surface/80"
                  style={{ borderRadius: opt.value }}
                />
                <span className="mt-2 text-xs font-semibold text-foreground">
                  {opt.label.split(" (")[0]}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {opt.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Card Elevation Depth */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Card Elevation & Depth
          </label>
          <span className="font-mono text-[10px] text-muted-foreground">
            var(--card-shadow)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ELEVATION_OPTIONS.map((opt) => {
            const isSelected = componentConfig.elevation === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUpdateComponentConfig({
                    ...componentConfig,
                    elevation: opt.id as ElevationLevel,
                  })
                }
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-3 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary"
                    : "border-border bg-card/60 hover:bg-card"
                )}
              >
                <span className="text-xs font-semibold text-foreground">
                  {opt.label.split(" (")[0]}
                </span>
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {opt.label.split(" (")[1]?.replace(")", "") || "Default"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Border Strength */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Border Line Strength
          </label>
          <span className="font-mono text-[10px] text-muted-foreground">
            var(--border-opacity)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BORDER_STRENGTH_OPTIONS.map((opt) => {
            const isSelected = componentConfig.borderStrength === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUpdateComponentConfig({
                    ...componentConfig,
                    borderStrength: opt.id as BorderStrength,
                  })
                }
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-2.5 transition-all",
                  isSelected
                    ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                    : "border-border bg-card/60 hover:bg-card"
                )}
              >
                <span className="text-xs font-medium text-foreground">
                  {opt.label.split(" (")[0]}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {opt.opacity}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Button Geometry Shape */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Button Geometry
          </label>
          <span className="font-mono text-[10px] text-muted-foreground">
            var(--button-radius)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BUTTON_SHAPE_OPTIONS.map((opt) => {
            const isSelected = componentConfig.buttonShape === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUpdateComponentConfig({
                    ...componentConfig,
                    buttonShape: opt.id as ButtonShape,
                  })
                }
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-col items-center justify-between rounded-xl border p-3 transition-all",
                  isSelected
                    ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                    : "border-border bg-card/60 hover:bg-card"
                )}
              >
                <div
                  className="h-6 w-16 bg-primary/80"
                  style={{ borderRadius: opt.radius }}
                />
                <span className="mt-2 text-xs font-semibold text-foreground">
                  {opt.label.split(" (")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. UI Density & Glass Effect Grid */}
      <div className="grid gap-4 sm:grid-cols-2 pt-2">
        {/* Density */}
        <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3.5">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Layout Density
          </label>
          <div className="grid grid-cols-3 gap-1 pt-1">
            {DENSITY_OPTIONS.map((opt) => {
              const isSelected = componentConfig.density === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onUpdateComponentConfig({
                      ...componentConfig,
                      density: opt.id as DensityLevel,
                    })
                  }
                  className={cn(
                    "rounded-md border py-1.5 text-center text-xs font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground font-bold"
                      : "border-border bg-surface/50 text-muted-foreground hover:bg-surface"
                  )}
                >
                  {opt.label.split(" (")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Glass Effect */}
        <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3.5">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Backdrop Glass Effect
          </label>
          <div className="grid grid-cols-3 gap-1 pt-1">
            {GLASS_OPTIONS.map((opt) => {
              const isSelected = componentConfig.glassEffect === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onUpdateComponentConfig({
                      ...componentConfig,
                      glassEffect: opt.id as GlassEffect,
                    })
                  }
                  className={cn(
                    "rounded-md border py-1.5 text-center text-xs font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground font-bold"
                      : "border-border bg-surface/50 text-muted-foreground hover:bg-surface"
                  )}
                >
                  {opt.label.split(" (")[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
