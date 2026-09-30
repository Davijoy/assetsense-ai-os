import React, { useState } from "react";
import {
  Building2,
  Sparkles,
  RotateCcw,
  Check,
  Save,
  Palette,
  Type,
  Activity,
  Component as ComponentIcon,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_EXPERIENCES,
  type WorkspaceExperienceType,
  type ExperienceOverrideConfig,
  getInheritanceBreakdown,
} from "@/lib/services/workspace-experience-theme.service";
import {
  FONT_DISPLAY_OPTIONS,
  FONT_SANS_OPTIONS,
  FONT_SCALE_OPTIONS,
  RADIUS_OPTIONS,
  type ThemePreset,
} from "@/lib/theme.manager";
import { MOTION_PROFILES } from "@/lib/motion.manager";
import { InheritanceInspector } from "./InheritanceInspector";

interface WorkspaceExperiencesPanelProps {
  workspaceTheme: ThemePreset;
  overrides: Record<WorkspaceExperienceType, ExperienceOverrideConfig>;
  activeExperience: WorkspaceExperienceType;
  onSelectExperience: (exp: WorkspaceExperienceType) => void;
  onSaveExperience: (exp: WorkspaceExperienceType, override: ExperienceOverrideConfig) => Promise<void>;
  onResetExperience: (exp: WorkspaceExperienceType) => Promise<void>;
}

export function WorkspaceExperiencesPanel({
  workspaceTheme,
  overrides,
  activeExperience,
  onSelectExperience,
  onSaveExperience,
  onResetExperience,
}: WorkspaceExperiencesPanelProps) {
  const [draftOverrides, setDraftOverrides] = useState<Record<WorkspaceExperienceType, ExperienceOverrideConfig>>(overrides);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const currentDraft = draftOverrides[activeExperience] || {};
  const selectedDef = WORKSPACE_EXPERIENCES.find((e) => e.id === activeExperience)!;

  const countOverrides = (ovr: ExperienceOverrideConfig) => {
    let count = 0;
    if (ovr.primaryHex) count++;
    if (ovr.accentHex) count++;
    if (ovr.backgroundHex) count++;
    if (ovr.surfaceHex) count++;
    if (ovr.fontDisplay) count++;
    if (ovr.fontSans) count++;
    if (ovr.fontScale !== undefined) count++;
    if (ovr.radius) count++;
    if (ovr.motionProfileId) count++;
    return count;
  };

  const handleToggleProperty = (prop: keyof ExperienceOverrideConfig, enable: boolean, defaultValue?: any) => {
    setDraftOverrides((prev) => {
      const expDraft = { ...(prev[activeExperience] || {}) };
      if (!enable) {
        delete expDraft[prop];
      } else {
        (expDraft as any)[prop] = defaultValue ?? "";
      }
      return {
        ...prev,
        [activeExperience]: expDraft,
      };
    });
  };

  const handleUpdateProperty = (prop: keyof ExperienceOverrideConfig, value: any) => {
    setDraftOverrides((prev) => ({
      ...prev,
      [activeExperience]: {
        ...(prev[activeExperience] || {}),
        [prop]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedbackMsg(null);
    try {
      await onSaveExperience(activeExperience, currentDraft);
      setFeedbackMsg({
        type: "success",
        text: `Saved overrides for "${selectedDef.label}".`,
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err?.message || "Failed to save experience overrides.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setFeedbackMsg(null);
    try {
      await onResetExperience(activeExperience);
      setDraftOverrides((prev) => ({
        ...prev,
        [activeExperience]: {},
      }));
      setFeedbackMsg({
        type: "success",
        text: `Reset "${selectedDef.label}" to workspace theme inheritance.`,
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err?.message || "Failed to reset experience overrides.",
      });
    } finally {
      setSaving(false);
    }
  };

  const inheritanceBreakdown = getInheritanceBreakdown(workspaceTheme, currentDraft);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Workspace Experience Overrides
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Customize role-specific luxury experiences for Platform Administrators, Investors, Developers, and Sales Executives with fine-grained visual inheritance.
        </p>
      </div>

      {/* 4 Experience Selection Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {WORKSPACE_EXPERIENCES.map((exp) => {
          const isSelected = activeExperience === exp.id;
          const expOverrides = draftOverrides[exp.id] || {};
          const numOverrides = countOverrides(expOverrides);
          const activeAccent = expOverrides.primaryHex || workspaceTheme.primaryHex;

          return (
            <button
              key={exp.id}
              type="button"
              onClick={() => onSelectExperience(exp.id)}
              className={cn(
                "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/[0.04] shadow-md ring-1 ring-primary"
                  : "border-border bg-card/60 hover:bg-card"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border border-border/80"
                      style={{ backgroundColor: activeAccent }}
                    />
                    <h3 className="text-xs font-bold text-foreground">{exp.label}</h3>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-mono font-bold",
                      numOverrides > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-surface text-muted-foreground border border-border"
                    )}
                  >
                    {numOverrides > 0 ? `${numOverrides} Overrides` : "Inheriting"}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">
                  {exp.description}
                </p>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
                <span className="font-mono text-primary font-semibold">{exp.badge}</span>
                <span className="flex items-center gap-0.5 font-medium text-foreground hover:text-primary">
                  <span>{isSelected ? "Editing" : "Customize"}</span>
                  <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Experience Editor */}
      <div className="rounded-xl border border-border bg-card/70 p-5 space-y-6 shadow-sm">
        {/* Editor Title Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                EXPERIENCE CUSTOMIZER
              </span>
              <span className="text-xs font-bold text-foreground">· {selectedDef.label}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Configure selective overrides for this experience. Every non-overridden token seamlessly inherits from the workspace theme.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || countOverrides(currentDraft) === 0}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset to Workspace</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:bg-primary/90 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Saving…" : "Save Experience"}</span>
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg p-2.5 text-xs animate-in fade-in",
              feedbackMsg.type === "success"
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border border-destructive/30 bg-destructive/10 text-destructive"
            )}
          >
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* 1. Group: Colors */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <Palette className="h-3.5 w-3.5 text-primary" />
            <span>Color Overrides</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Primary Accent */}
            <div className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Primary Accent</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleToggleProperty("primaryHex", false)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      !currentDraft.primaryHex ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    Inherit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleProperty("primaryHex", true, workspaceTheme.primaryHex)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      currentDraft.primaryHex ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    Override
                  </button>
                </div>
              </div>

              {currentDraft.primaryHex ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={currentDraft.primaryHex}
                    onChange={(e) => handleUpdateProperty("primaryHex", e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={currentDraft.primaryHex}
                    onChange={(e) => handleUpdateProperty("primaryHex", e.target.value)}
                    className="w-24 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground uppercase"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1 opacity-60">
                  <div
                    className="h-5 w-5 rounded border border-border"
                    style={{ backgroundColor: workspaceTheme.primaryHex }}
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    Inherits: {workspaceTheme.primaryHex}
                  </span>
                </div>
              )}
            </div>

            {/* Secondary Accent */}
            <div className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Secondary Accent</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleToggleProperty("accentHex", false)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      !currentDraft.accentHex ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    Inherit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleProperty("accentHex", true, workspaceTheme.accentHex)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      currentDraft.accentHex ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    Override
                  </button>
                </div>
              </div>

              {currentDraft.accentHex ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={currentDraft.accentHex}
                    onChange={(e) => handleUpdateProperty("accentHex", e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={currentDraft.accentHex}
                    onChange={(e) => handleUpdateProperty("accentHex", e.target.value)}
                    className="w-24 rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground uppercase"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1 opacity-60">
                  <div
                    className="h-5 w-5 rounded border border-border"
                    style={{ backgroundColor: workspaceTheme.accentHex }}
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    Inherits: {workspaceTheme.accentHex}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Group: Typography */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <Type className="h-3.5 w-3.5 text-primary" />
            <span>Typography Overrides</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Display Font */}
            <div className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Display Font</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleToggleProperty("fontDisplay", false)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      !currentDraft.fontDisplay ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    Inherit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleProperty("fontDisplay", true, workspaceTheme.fontDisplay)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      currentDraft.fontDisplay ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    Override
                  </button>
                </div>
              </div>

              {currentDraft.fontDisplay ? (
                <select
                  value={currentDraft.fontDisplay}
                  onChange={(e) => handleUpdateProperty("fontDisplay", e.target.value)}
                  className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                >
                  {FONT_DISPLAY_OPTIONS.map((f) => (
                    <option key={f.id} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="block pt-1 font-mono text-xs text-muted-foreground opacity-60 truncate">
                  Inherits: {workspaceTheme.fontDisplay.split(",")[0].replace(/['"]/g, "")}
                </span>
              )}
            </div>

            {/* Corner Radius */}
            <div className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Corner Radius</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleToggleProperty("radius", false)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      !currentDraft.radius ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    Inherit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleProperty("radius", true, workspaceTheme.radius)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      currentDraft.radius ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    Override
                  </button>
                </div>
              </div>

              {currentDraft.radius ? (
                <select
                  value={currentDraft.radius}
                  onChange={(e) => handleUpdateProperty("radius", e.target.value)}
                  className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                >
                  {RADIUS_OPTIONS.map((r) => (
                    <option key={r.id} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="block pt-1 font-mono text-xs text-muted-foreground opacity-60">
                  Inherits: {workspaceTheme.radius}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Group: Motion */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span>Motion Profile Override</span>
          </div>

          <div className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Living Motion Profile</span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleToggleProperty("motionProfileId", false)}
                  className={cn(
                    "px-2 py-0.5 rounded transition-colors",
                    !currentDraft.motionProfileId ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                  )}
                >
                  Inherit
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleProperty("motionProfileId", true, "executive")}
                  className={cn(
                    "px-2 py-0.5 rounded transition-colors",
                    currentDraft.motionProfileId ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-surface"
                  )}
                >
                  Override
                </button>
              </div>
            </div>

            {currentDraft.motionProfileId ? (
              <select
                value={currentDraft.motionProfileId}
                onChange={(e) => handleUpdateProperty("motionProfileId", e.target.value)}
                className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
              >
                {MOTION_PROFILES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.badge})
                  </option>
                ))}
              </select>
            ) : (
              <span className="block pt-1 font-mono text-xs text-muted-foreground opacity-60">
                Inherits workspace motion profile (executive)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inheritance Inspector Component */}
      <InheritanceInspector
        breakdown={inheritanceBreakdown}
        experienceLabel={selectedDef.label}
      />
    </div>
  );
}
