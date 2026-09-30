import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  Palette,
  Type,
  Activity,
  Layers,
  Component as ComponentIcon,
  Building2,
  Eye,
  History,
  ShieldCheck,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X,
  Layers as LayersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  THEME_PRESETS,
  DEFAULT_THEME,
  DEFAULT_COMPONENT_CONFIG,
  applyThemeToDOM,
  type ThemePreset,
  type ComponentConfig,
} from "@/lib/theme.manager";
import {
  MOTION_PROFILES,
  DEFAULT_MOTION_PROFILE,
  DEFAULT_ATMOSPHERE_CONFIG,
  applyMotionToDOM,
  profileToAtmosphereConfig,
  type MotionProfile,
  type AtmosphereConfig,
} from "@/lib/motion.manager";
import { setRuntimeFavicon } from "@/lib/favicon.manager";
import {
  loadWorkspaceThemeSettings,
  saveWorkspaceThemeSettings,
  resetWorkspaceThemeSettings,
  resolveEffectiveTheme,
  DEFAULT_WORKSPACE_THEME_SETTINGS,
  type WorkspaceThemeSettings,
  type CustomColorOverrides,
} from "@/lib/services/workspace-theme.service";
import {
  loadExperienceOverrides,
  saveExperienceOverride,
  resetExperienceOverride,
  resolveEffectiveExperienceTheme,
  WORKSPACE_EXPERIENCES,
  type WorkspaceExperienceType,
  type ExperienceOverrideConfig,
} from "@/lib/services/workspace-experience-theme.service";
import {
  loadBrandThemeVersions,
  createBrandThemeVersion,
  restoreBrandThemeVersion,
  type BrandThemeVersionRecord,
  type BrandVersionSnapshot,
} from "@/lib/services/brand-version.service";
import { useBranding } from "@/components/brand/BrandingContext";
import { BrandIdentityPanel } from "./BrandIdentityPanel";
import { ThemePresetGrid } from "./ThemePresetGrid";
import { TypographyStudioPanel } from "./TypographyStudioPanel";
import { MotionStudioPanel } from "./MotionStudioPanel";
import { BrandAssetLibraryPanel } from "./BrandAssetLibraryPanel";
import { ComponentCustomizerPanel } from "./ComponentCustomizerPanel";
import { WorkspaceExperiencesPanel } from "./WorkspaceExperiencesPanel";
import { BrandVersionsPanel } from "./BrandVersionsPanel";
import { BrandPreviewCanvas } from "./BrandPreviewCanvas";
import { PreviewToolbar, type ViewportMode, type PreviewMode } from "./PreviewToolbar";

export type StudioTabId =
  | "identity"
  | "themes"
  | "typography"
  | "motion"
  | "assets"
  | "components"
  | "experiences"
  | "preview"
  | "versions";

interface StudioTabItem {
  id: StudioTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  comingSoon?: boolean;
}

const STUDIO_TABS: StudioTabItem[] = [
  { id: "identity", label: "Identity", icon: Sparkles, active: true },
  { id: "themes", label: "Themes", icon: Palette, active: true },
  { id: "typography", label: "Typography", icon: Type, active: true },
  { id: "motion", label: "Motion", icon: Activity, active: true },
  { id: "assets", label: "Assets", icon: Layers, active: true },
  { id: "components", label: "Components", icon: ComponentIcon, active: true },
  { id: "experiences", label: "Workspace Experiences", icon: Building2, active: true },
  { id: "preview", label: "Preview", icon: Eye, active: true },
  { id: "versions", label: "Versions", icon: History, active: true },
];

export function BrandStudioShell() {
  const { logoUrl, logoUrlDark, workspaceId } = useBranding();
  const [activeTab, setActiveTab] = useState<StudioTabId>("identity");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("fort");
  const [liveLogoOverride, setLiveLogoOverride] = useState<{ light: string | null; dark: string | null }>({
    light: null,
    dark: null,
  });

  // Workspace-Level Theme Settings State
  const [savedSettings, setSavedSettings] = useState<WorkspaceThemeSettings>(DEFAULT_WORKSPACE_THEME_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<WorkspaceThemeSettings>(DEFAULT_WORKSPACE_THEME_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Experience Overrides State
  const [experienceOverrides, setExperienceOverrides] = useState<Record<WorkspaceExperienceType, ExperienceOverrideConfig>>({
    platform_administrator: {},
    investor: {},
    developer_builder: {},
    sales_executive: {},
  });
  const [activeExperience, setActiveExperience] = useState<WorkspaceExperienceType>("platform_administrator");
  const [experiencePreviewSelection, setExperiencePreviewSelection] = useState<WorkspaceExperienceType | "workspace">("workspace");

  // Version History State
  const [versions, setVersions] = useState<BrandThemeVersionRecord[]>([]);
  const [activePreviewVersion, setActivePreviewVersion] = useState<BrandThemeVersionRecord | null>(null);

  const targetWsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  // 1. Initial Data Loading (Workspace Theme Settings + Experience Overrides + Versions)
  const refreshAll = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const [themeRes, expRes, verRes] = await Promise.all([
        loadWorkspaceThemeSettings(workspaceId),
        loadExperienceOverrides(workspaceId),
        loadBrandThemeVersions(workspaceId),
      ]);
      setSavedSettings(themeRes);
      setDraftSettings(themeRes);
      setExperienceOverrides(expRes);
      setVersions(verRes);
      if (themeRes.faviconUrl) {
        setRuntimeFavicon(themeRes.faviconUrl);
      }
    } catch (err) {
      console.warn("[BrandStudioShell] Refresh failed:", err);
    } finally {
      setLoadingSettings(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Derive Effective Theme & Motion from Draft Settings
  const effectiveTheme = useMemo(() => {
    return resolveEffectiveTheme(draftSettings.presetId, draftSettings.customColors, {
      fontDisplay: draftSettings.fontDisplay,
      fontSans: draftSettings.fontSans,
      fontScale: draftSettings.fontScale,
      radius: draftSettings.radius,
    });
  }, [draftSettings]);

  const selectedMotionProfile = useMemo(() => {
    return (
      MOTION_PROFILES.find((p) => p.id === draftSettings.motionProfileId) ||
      DEFAULT_MOTION_PROFILE
    );
  }, [draftSettings.motionProfileId]);

  // Check if draft state differs from saved state
  const isDirty = useMemo(() => {
    return (
      draftSettings.presetId !== savedSettings.presetId ||
      JSON.stringify(draftSettings.customColors) !== JSON.stringify(savedSettings.customColors) ||
      draftSettings.fontDisplay !== savedSettings.fontDisplay ||
      draftSettings.fontSans !== savedSettings.fontSans ||
      draftSettings.fontScale !== savedSettings.fontScale ||
      draftSettings.radius !== savedSettings.radius ||
      draftSettings.motionProfileId !== savedSettings.motionProfileId ||
      JSON.stringify(draftSettings.atmosphereConfig) !== JSON.stringify(savedSettings.atmosphereConfig) ||
      JSON.stringify(draftSettings.componentConfig) !== JSON.stringify(savedSettings.componentConfig) ||
      draftSettings.faviconUrl !== savedSettings.faviconUrl
    );
  }, [draftSettings, savedSettings]);

  // Resolve Canvas Theme & Motion (Handling Experience Selection and Historical Version Preview)
  const canvasConfig = useMemo(() => {
    // A. Version Preview Mode
    if (activePreviewVersion) {
      const snapTheme = resolveEffectiveTheme(
        activePreviewVersion.snapshot.workspaceTheme?.presetId || DEFAULT_THEME.id,
        activePreviewVersion.snapshot.workspaceTheme?.customColors || {},
        {
          fontDisplay: activePreviewVersion.snapshot.workspaceTheme?.fontDisplay,
          fontSans: activePreviewVersion.snapshot.workspaceTheme?.fontSans,
          fontScale: activePreviewVersion.snapshot.workspaceTheme?.fontScale,
          radius: activePreviewVersion.snapshot.workspaceTheme?.radius,
        }
      );
      const snapMotion =
        MOTION_PROFILES.find((p) => p.id === activePreviewVersion.snapshot.workspaceTheme?.motionProfileId) ||
        DEFAULT_MOTION_PROFILE;

      return {
        theme: snapTheme,
        motion: snapMotion,
        atmosphere: activePreviewVersion.snapshot.workspaceTheme?.atmosphereConfig || DEFAULT_ATMOSPHERE_CONFIG,
        component: activePreviewVersion.snapshot.workspaceTheme?.componentConfig || DEFAULT_COMPONENT_CONFIG,
      };
    }

    // B. Experience Override Preview Mode
    if (experiencePreviewSelection !== "workspace") {
      const expOverride = experienceOverrides[experiencePreviewSelection] || {};
      const resolved = resolveEffectiveExperienceTheme(effectiveTheme, expOverride);
      return {
        theme: resolved.theme,
        motion: resolved.motionProfile,
        atmosphere: resolved.atmosphereConfig,
        component: resolved.componentConfig,
      };
    }

    // C. Standard Workspace Draft Theme
    return {
      theme: effectiveTheme,
      motion: selectedMotionProfile,
      atmosphere: draftSettings.atmosphereConfig,
      component: draftSettings.componentConfig,
    };
  }, [
    activePreviewVersion,
    experiencePreviewSelection,
    experienceOverrides,
    effectiveTheme,
    selectedMotionProfile,
    draftSettings,
  ]);

  const effectiveLightLogo = liveLogoOverride.light ?? logoUrl;
  const effectiveDarkLogo = liveLogoOverride.dark ?? logoUrlDark ?? logoUrl;

  const handleLogoPreviewChange = (variant: "light" | "dark", url: string | null) => {
    setLiveLogoOverride((prev) => ({ ...prev, [variant]: url }));
  };

  const handleUpdateTypography = (updates: {
    fontDisplay?: string;
    fontSans?: string;
    fontScale?: number;
  }) => {
    setDraftSettings((prev) => ({
      ...prev,
      ...(updates.fontDisplay ? { fontDisplay: updates.fontDisplay } : {}),
      ...(updates.fontSans ? { fontSans: updates.fontSans } : {}),
      ...(updates.fontScale !== undefined ? { fontScale: updates.fontScale } : {}),
    }));
  };

  // 2. Save Workspace Changes (DB Persistence + Version Snapshot + Runtime Apply)
  const handleSaveChanges = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await saveWorkspaceThemeSettings(targetWsId, draftSettings);
      setSavedSettings(draftSettings);

      // Create Version Snapshot
      const snapshot: BrandVersionSnapshot = {
        workspaceTheme: draftSettings,
        faviconUrl: draftSettings.faviconUrl,
        experienceOverrides: experienceOverrides,
      };
      await createBrandThemeVersion(
        targetWsId,
        "workspace_save",
        `Saved workspace theme configuration (${effectiveTheme.name})`,
        snapshot
      );

      // Refresh version history
      const updatedVersions = await loadBrandThemeVersions(targetWsId);
      setVersions(updatedVersions);

      // Apply to document DOM & Favicon
      applyThemeToDOM(effectiveTheme, draftSettings.componentConfig);
      applyMotionToDOM(selectedMotionProfile);
      setRuntimeFavicon(draftSettings.faviconUrl);

      setStatusMessage({
        type: "success",
        text: "Workspace brand & theme settings successfully saved and snapshot recorded.",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error("[BrandStudioShell] Save failed:", err);
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to persist workspace theme settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 3. Discard Changes Action
  const handleDiscardChanges = () => {
    setDraftSettings(savedSettings);
    setStatusMessage({
      type: "success",
      text: "Unsaved modifications reverted to saved workspace state.",
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // 4. Reset Workspace Theme to Sentinel Default
  const handleResetWorkspaceDefault = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await resetWorkspaceThemeSettings(targetWsId);
      const defaults = {
        ...DEFAULT_WORKSPACE_THEME_SETTINGS,
        workspaceId: targetWsId,
      };
      setSavedSettings(defaults);
      setDraftSettings(defaults);

      // Create Version Snapshot for Reset
      const snapshot: BrandVersionSnapshot = {
        workspaceTheme: defaults,
        faviconUrl: null,
        experienceOverrides: experienceOverrides,
      };
      await createBrandThemeVersion(
        targetWsId,
        "workspace_reset",
        "Workspace theme reset to Sentinel defaults",
        snapshot,
        "Sentinel Default Reset"
      );

      const updatedVersions = await loadBrandThemeVersions(targetWsId);
      setVersions(updatedVersions);

      applyThemeToDOM(DEFAULT_THEME, DEFAULT_COMPONENT_CONFIG);
      applyMotionToDOM(DEFAULT_MOTION_PROFILE);
      setRuntimeFavicon(null);

      setStatusMessage({
        type: "success",
        text: "Workspace theme settings reset to Sentinel defaults.",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error("[BrandStudioShell] Reset failed:", err);
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to reset workspace theme settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 5. Save Experience Override Handler
  const handleSaveExperienceOverride = async (
    expType: WorkspaceExperienceType,
    overrides: ExperienceOverrideConfig
  ) => {
    await saveExperienceOverride(targetWsId, expType, overrides);
    const updatedMap = {
      ...experienceOverrides,
      [expType]: overrides,
    };
    setExperienceOverrides(updatedMap);

    const expDef = WORKSPACE_EXPERIENCES.find((e) => e.id === expType)!;
    // Create Version Snapshot
    const snapshot: BrandVersionSnapshot = {
      workspaceTheme: savedSettings,
      faviconUrl: savedSettings.faviconUrl,
      experienceOverrides: updatedMap,
    };
    await createBrandThemeVersion(
      targetWsId,
      "experience_save",
      `Customized experience overrides for "${expDef.label}"`,
      snapshot,
      `${expDef.label} Override`
    );

    const updatedVersions = await loadBrandThemeVersions(targetWsId);
    setVersions(updatedVersions);
  };

  // 6. Reset Experience Override Handler
  const handleResetExperienceOverride = async (expType: WorkspaceExperienceType) => {
    await resetExperienceOverride(targetWsId, expType);
    const updatedMap = {
      ...experienceOverrides,
      [expType]: {},
    };
    setExperienceOverrides(updatedMap);

    const expDef = WORKSPACE_EXPERIENCES.find((e) => e.id === expType)!;
    const snapshot: BrandVersionSnapshot = {
      workspaceTheme: savedSettings,
      faviconUrl: savedSettings.faviconUrl,
      experienceOverrides: updatedMap,
    };
    await createBrandThemeVersion(
      targetWsId,
      "experience_reset",
      `Reset "${expDef.label}" experience to workspace inheritance`,
      snapshot
    );

    const updatedVersions = await loadBrandThemeVersions(targetWsId);
    setVersions(updatedVersions);
  };

  // 7. Version Restore Handler
  const handleRestoreVersion = async (targetVersion: BrandThemeVersionRecord) => {
    try {
      const result = await restoreBrandThemeVersion(targetWsId, targetVersion);
      await refreshAll();
      setActivePreviewVersion(null);

      if (result.warnings && result.warnings.length > 0) {
        setStatusMessage({
          type: "success",
          text: `Restored to v${targetVersion.versionNumber}. Note: ${result.warnings.join("; ")}`,
        });
      } else {
        setStatusMessage({
          type: "success",
          text: `Successfully restored configuration from v${targetVersion.versionNumber}.`,
        });
      }
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error("[BrandStudioShell] Restore failed:", err);
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to restore version snapshot.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Studio Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-[0.24em] text-gold">
              ADMIN · BRAND & EXPERIENCE STUDIO 2.0
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ACTIVE
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Brand & Visual Identity
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Control your workspace's visual identity, brand marks, curated luxury theme palette, typography studio, component geometry, experience overrides, and living motion atmosphere.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {workspaceId && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[11px] truncate max-w-[180px]">
                {workspaceId}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetWorkspaceDefault}
            disabled={saving || loadingSettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50 transition-colors"
            title="Reset theme and component styling to Sentinel defaults (does not delete uploaded logos or brand assets)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>
      </header>

      {/* Version Preview Mode Banner */}
      {activePreviewVersion && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-500/50 bg-amber-500/15 p-3.5 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-amber-300">
                Previewing Historical Snapshot: v{activePreviewVersion.versionNumber} {activePreviewVersion.label ? `("${activePreviewVersion.label}")` : ""}
              </span>
              <p className="text-[11px] text-amber-200/80">
                Live preview displays this immutable historical configuration without modifying database state.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActivePreviewVersion(null)}
            className="inline-flex items-center gap-1 rounded-md bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span>Exit Version Preview</span>
          </button>
        </div>
      )}

      {/* Dirty State / Unsaved Changes Global Action Banner */}
      {isDirty && !activePreviewVersion && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-amber-300">
                You have unsaved workspace theme customizations
              </span>
              <p className="text-[11px] text-amber-300/80">
                Changes are previewed live below. Click "Save Changes" to commit them and record an audit version snapshot.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardChanges}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-background/60 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-background transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Discard</span>
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:bg-primary/90 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Status Feedback Toast / Banner */}
      {statusMessage && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg p-3 text-xs animate-in fade-in",
            statusMessage.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Primary Section Navigation Tabs (All 9 Active) */}
      <nav className="flex items-center gap-1.5 overflow-x-auto border-b border-border pb-2 scrollbar-none">
        {STUDIO_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          const isDisabled = !tab.active;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                isSelected
                  ? "bg-primary/15 text-primary border border-primary/30 font-semibold shadow-xs"
                  : isDisabled
                  ? "text-muted-foreground/40 cursor-not-allowed hover:bg-transparent"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Experience Preview Filter Bar (Available on Preview & Components) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card/40 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <LayersIcon className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Preview Perspective:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setExperiencePreviewSelection("workspace")}
            className={cn(
              "rounded px-2.5 py-1 text-[10px] font-medium transition-colors",
              experiencePreviewSelection === "workspace"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-surface text-muted-foreground hover:text-foreground"
            )}
          >
            Workspace Base
          </button>
          {WORKSPACE_EXPERIENCES.map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => setExperiencePreviewSelection(exp.id)}
              className={cn(
                "rounded px-2.5 py-1 text-[10px] font-medium transition-colors",
                experiencePreviewSelection === exp.id
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {exp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Deck */}
      {activeTab === "preview" ? (
        /* Full Width Preview View */
        <div className="space-y-3">
          <PreviewToolbar
            viewport={viewport}
            onViewportChange={setViewport}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            activeTheme={canvasConfig.theme}
          />
          <BrandPreviewCanvas
            theme={canvasConfig.theme}
            viewport={viewport}
            previewMode={previewMode}
            logoLight={effectiveLightLogo}
            logoDark={effectiveDarkLogo}
            motionProfile={canvasConfig.motion}
            atmosphereConfig={canvasConfig.atmosphere}
            componentConfig={canvasConfig.component}
          />
        </div>
      ) : (
        /* Split-Pane View: Left Control Deck (60%) / Right Live Preview (40%) */
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Control Deck */}
          <div className="lg:col-span-7 space-y-6">
            {activeTab === "identity" && (
              <BrandIdentityPanel onLogoChange={handleLogoPreviewChange} />
            )}
            {activeTab === "themes" && (
              <ThemePresetGrid
                selectedPreset={effectiveTheme}
                onSelectPreset={(preset) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    presetId: preset.id,
                    fontDisplay: preset.fontDisplay,
                    fontSans: preset.fontSans,
                    radius: preset.radius,
                  }))
                }
                customColors={draftSettings.customColors}
                onUpdateColor={(token: keyof CustomColorOverrides, hex: string) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    customColors: {
                      ...prev.customColors,
                      [token]: hex,
                    },
                  }))
                }
                onResetColors={() =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    customColors: {},
                  }))
                }
              />
            )}
            {activeTab === "typography" && (
              <TypographyStudioPanel
                selectedPreset={effectiveTheme}
                onUpdateTypography={handleUpdateTypography}
              />
            )}
            {activeTab === "motion" && (
              <MotionStudioPanel
                selectedProfile={selectedMotionProfile}
                atmosphereConfig={draftSettings.atmosphereConfig}
                onUpdateProfile={(profile) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    motionProfileId: profile.id,
                    atmosphereConfig: profileToAtmosphereConfig(profile),
                  }))
                }
                onUpdateAtmosphere={(config) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    atmosphereConfig: config,
                  }))
                }
              />
            )}
            {activeTab === "assets" && (
              <BrandAssetLibraryPanel
                workspaceId={workspaceId}
                onFaviconChange={(url) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    faviconUrl: url,
                  }))
                }
              />
            )}
            {activeTab === "components" && (
              <ComponentCustomizerPanel
                currentRadius={draftSettings.radius}
                componentConfig={draftSettings.componentConfig}
                onUpdateRadius={(radius) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    radius,
                  }))
                }
                onUpdateComponentConfig={(componentConfig: ComponentConfig) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    componentConfig,
                  }))
                }
              />
            )}
            {activeTab === "experiences" && (
              <WorkspaceExperiencesPanel
                workspaceTheme={effectiveTheme}
                overrides={experienceOverrides}
                activeExperience={activeExperience}
                onSelectExperience={setActiveExperience}
                onSaveExperience={handleSaveExperienceOverride}
                onResetExperience={handleResetExperienceOverride}
              />
            )}
            {activeTab === "versions" && (
              <BrandVersionsPanel
                versions={versions}
                activePreviewVersionId={activePreviewVersion?.id || null}
                onPreviewVersion={setActivePreviewVersion}
                onRestoreVersion={handleRestoreVersion}
              />
            )}
          </div>

          {/* Right Live Preview Sticky Deck */}
          <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">
                Interactive Live Preview
              </span>
              <span
                className="text-[10px] font-bold"
                style={{ color: canvasConfig.theme.primaryHex }}
              >
                {canvasConfig.theme.name}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card/40 shadow-xl overflow-hidden">
              <PreviewToolbar
                viewport={viewport}
                onViewportChange={setViewport}
                previewMode={previewMode}
                onPreviewModeChange={setPreviewMode}
                activeTheme={canvasConfig.theme}
              />
              <BrandPreviewCanvas
                theme={canvasConfig.theme}
                viewport={viewport}
                previewMode={previewMode}
                logoLight={effectiveLightLogo}
                logoDark={effectiveDarkLogo}
                motionProfile={canvasConfig.motion}
                atmosphereConfig={canvasConfig.atmosphere}
                componentConfig={canvasConfig.component}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
