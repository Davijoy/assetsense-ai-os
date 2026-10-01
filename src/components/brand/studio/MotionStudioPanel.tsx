import React, { useState } from "react";
import {
  Activity,
  RotateCcw,
  Check,
  Info,
  ShieldAlert,
  Sparkles,
  Wind,
  Layers,
  SunMedium,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOTION_PROFILES,
  DEFAULT_MOTION_PROFILE,
  DEFAULT_ATMOSPHERE_CONFIG,
  type MotionProfile,
  type AtmosphereConfig,
  type IntensityLevel,
  profileToAtmosphereConfig,
  applyMotionToDOM,
} from "@/lib/motion.manager";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

interface MotionStudioPanelProps {
  selectedProfile: MotionProfile;
  atmosphereConfig: AtmosphereConfig;
  onUpdateProfile: (profile: MotionProfile) => void;
  onUpdateAtmosphere: (config: AtmosphereConfig) => void;
}

const INTENSITY_OPTIONS: { id: IntensityLevel; label: string }[] = [
  { id: "none", label: "None" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export function MotionStudioPanel({
  selectedProfile,
  atmosphereConfig,
  onUpdateProfile,
  onUpdateAtmosphere,
}: MotionStudioPanelProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [sessionApplied, setSessionApplied] = useState(false);

  const handleProfileSelect = (profile: MotionProfile) => {
    onUpdateProfile(profile);
    const derivedAtmosphere = profileToAtmosphereConfig(profile);
    onUpdateAtmosphere(derivedAtmosphere);
  };

  const handleApplySession = () => {
    applyMotionToDOM(selectedProfile, prefersReducedMotion);
    setSessionApplied(true);
    setTimeout(() => setSessionApplied(false), 3000);
  };

  const handleResetDefault = () => {
    onUpdateProfile(DEFAULT_MOTION_PROFILE);
    onUpdateAtmosphere(DEFAULT_ATMOSPHERE_CONFIG);
    applyMotionToDOM(DEFAULT_MOTION_PROFILE, prefersReducedMotion);
    setSessionApplied(true);
    setTimeout(() => setSessionApplied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Motion & Living Atmosphere Studio
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Configure living ambient presence, transition physics, and background depth. All motion systems automatically respect system accessibility preferences.
        </p>
      </div>

      {/* Reduced Motion Accessibility Banner */}
      {prefersReducedMotion && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Reduced Motion is active on your operating system</span>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              In accordance with accessibility standards (WCAG 2.1), heavy background continuous animations, orbital loops, and long transitions are automatically minimized regardless of selected profile.
            </p>
          </div>
        </div>
      )}

      {/* Motion Profiles Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Motion Profiles
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            var(--motion-duration-multiplier)
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {MOTION_PROFILES.map((profile) => {
            const isSelected = selectedProfile.id === profile.id;

            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => handleProfileSelect(profile)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary"
                    : "border-border bg-card/60 hover:border-border/80 hover:bg-card"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {profile.name}
                      </h3>
                      <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {profile.badge}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                    {profile.description}
                  </p>
                </div>

                <div className="mt-3.5 border-t border-border/50 pt-2.5 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Speed: {profile.transitionMultiplier}x</span>
                  <span>Hover: {profile.hoverStrength}</span>
                  <span>Ambiance: {profile.atmosphereIntensity}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Atmosphere Customizer */}
      <div className="space-y-4 rounded-xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Sentinel Atmosphere Tuning
            </h3>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateAtmosphere({
                ...atmosphereConfig,
                enabled: !atmosphereConfig.enabled,
              })
            }
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-colors border",
              atmosphereConfig.enabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-surface border-border text-muted-foreground"
            )}
          >
            {atmosphereConfig.enabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        {atmosphereConfig.enabled && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/60">
            {/* Grid Intensity */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <Grid className="h-3 w-3 text-muted-foreground" />
                <span>Grid Intensity</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onUpdateAtmosphere({
                        ...atmosphereConfig,
                        gridIntensity: opt.id,
                      })
                    }
                    className={cn(
                      "rounded-md border py-1 text-[10px] font-medium transition-colors",
                      atmosphereConfig.gridIntensity === opt.id
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-border bg-surface/50 text-muted-foreground hover:bg-surface"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ambient Glow */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <SunMedium className="h-3 w-3 text-muted-foreground" />
                <span>Ambient Glow</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onUpdateAtmosphere({
                        ...atmosphereConfig,
                        glowIntensity: opt.id,
                      })
                    }
                    className={cn(
                      "rounded-md border py-1 text-[10px] font-medium transition-colors",
                      atmosphereConfig.glowIntensity === opt.id
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-border bg-surface/50 text-muted-foreground hover:bg-surface"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Particle Density */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                <span>Particle Density</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onUpdateAtmosphere({
                        ...atmosphereConfig,
                        particleDensity: opt.id,
                      })
                    }
                    className={cn(
                      "rounded-md border py-1 text-[10px] font-medium transition-colors",
                      atmosphereConfig.particleDensity === opt.id
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-border bg-surface/50 text-muted-foreground hover:bg-surface"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drift Intensity */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <Wind className="h-3 w-3 text-muted-foreground" />
                <span>Drift Speed</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onUpdateAtmosphere({
                        ...atmosphereConfig,
                        driftIntensity: opt.id,
                      })
                    }
                    className={cn(
                      "rounded-md border py-1 text-[10px] font-medium transition-colors",
                      (atmosphereConfig.driftIntensity || "medium") === opt.id
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-border bg-surface/50 text-muted-foreground hover:bg-surface"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark Visibility */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <Layers className="h-3 w-3 text-muted-foreground" />
                <span>Watermark Emblem</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateAtmosphere({
                    ...atmosphereConfig,
                    watermarkVisibility: !atmosphereConfig.watermarkVisibility,
                  })
                }
                className={cn(
                  "w-full rounded-md border py-1.5 text-[10px] font-medium transition-colors",
                  atmosphereConfig.watermarkVisibility
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-surface/50 text-muted-foreground hover:bg-surface"
                )}
              >
                {atmosphereConfig.watermarkVisibility ? "Visible (Drifting)" : "Hidden"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
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
            Reset Motion to Sentinel default
          </button>
          {sessionApplied && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
              ✓ Motion applied for this browser session.
            </span>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/50 p-2.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Motion Persistence:</strong> Motion configuration changes update the preview deck immediately and can be applied to your session. Cross-workspace persistence will be enabled in Phase 2C.
          </span>
        </div>
      </div>
    </div>
  );
}
