import { supabase } from "@/integrations/supabase/client";
import {
  THEME_PRESETS,
  DEFAULT_THEME,
  DEFAULT_COMPONENT_CONFIG,
  type ThemePreset,
  type ComponentConfig,
} from "@/lib/theme.manager";
import {
  DEFAULT_MOTION_PROFILE,
  DEFAULT_ATMOSPHERE_CONFIG,
  type AtmosphereConfig,
} from "@/lib/motion.manager";

export interface CustomColorOverrides {
  primaryHex?: string;
  accentHex?: string;
  backgroundHex?: string;
  surfaceHex?: string;
  borderHex?: string;
  foregroundHex?: string;
  goldHex?: string;
}

export interface WorkspaceThemeSettings {
  id?: string;
  workspaceId: string;
  presetId: string;
  customColors: CustomColorOverrides;
  fontDisplay: string;
  fontSans: string;
  fontScale: number;
  radius: string;
  motionProfileId: string;
  atmosphereConfig: AtmosphereConfig;
  componentConfig: ComponentConfig;
  faviconUrl: string | null;
  updatedAt?: string;
}

export const DEFAULT_WORKSPACE_THEME_SETTINGS: WorkspaceThemeSettings = {
  workspaceId: "00000000-0000-0000-0000-00000000d3f7",
  presetId: DEFAULT_THEME.id,
  customColors: {},
  fontDisplay: DEFAULT_THEME.fontDisplay,
  fontSans: DEFAULT_THEME.fontSans,
  fontScale: 1.0,
  radius: DEFAULT_THEME.radius,
  motionProfileId: DEFAULT_MOTION_PROFILE.id,
  atmosphereConfig: DEFAULT_ATMOSPHERE_CONFIG,
  componentConfig: DEFAULT_COMPONENT_CONFIG,
  faviconUrl: null,
};

/**
 * Resolves a full runtime ThemePreset by merging a base preset with custom color overrides and typography.
 */
export function resolveEffectiveTheme(
  presetId: string = DEFAULT_THEME.id,
  customColors: CustomColorOverrides = {},
  overrides?: {
    fontDisplay?: string;
    fontSans?: string;
    fontScale?: number;
    radius?: string;
  }
): ThemePreset {
  const basePreset = THEME_PRESETS.find((p) => p.id === presetId) || DEFAULT_THEME;

  return {
    ...basePreset,
    primaryHex: customColors.primaryHex || basePreset.primaryHex,
    accentHex: customColors.accentHex || basePreset.accentHex,
    backgroundHex: customColors.backgroundHex || basePreset.backgroundHex,
    surfaceHex: customColors.surfaceHex || basePreset.surfaceHex,
    fontDisplay: overrides?.fontDisplay || basePreset.fontDisplay,
    fontSans: overrides?.fontSans || basePreset.fontSans,
    fontScale: overrides?.fontScale ?? basePreset.fontScale ?? 1.0,
    radius: overrides?.radius || basePreset.radius,
    ...(customColors.borderHex ? { borderHex: customColors.borderHex } : {}),
    ...(customColors.foregroundHex ? { foregroundHex: customColors.foregroundHex } : {}),
    ...(customColors.goldHex ? { goldHex: customColors.goldHex } : {}),
  } as ThemePreset;
}

/**
 * Load persisted workspace theme settings from database with Sentinel fallback.
 */
export async function loadWorkspaceThemeSettings(
  workspaceId?: string | null
): Promise<WorkspaceThemeSettings> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  try {
    const { data, error } = await (supabase as any)
      .from("workspace_theme_settings")
      .select("*")
      .eq("workspace_id", wsId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        workspaceId: data.workspace_id,
        presetId: data.preset_id || DEFAULT_THEME.id,
        customColors: data.custom_colors || {},
        fontDisplay: data.font_display || DEFAULT_THEME.fontDisplay,
        fontSans: data.font_sans || DEFAULT_THEME.fontSans,
        fontScale: data.font_scale ? Number(data.font_scale) : 1.0,
        radius: data.radius || DEFAULT_THEME.radius,
        motionProfileId: data.motion_profile_id || DEFAULT_MOTION_PROFILE.id,
        atmosphereConfig: data.atmosphere_config || DEFAULT_ATMOSPHERE_CONFIG,
        componentConfig: data.component_config || DEFAULT_COMPONENT_CONFIG,
        faviconUrl: data.favicon_url || null,
        updatedAt: data.updated_at,
      };
    }
  } catch (err) {
    console.warn("[workspace-theme.service] Failed to load workspace theme settings:", err);
  }

  return {
    ...DEFAULT_WORKSPACE_THEME_SETTINGS,
    workspaceId: wsId,
  };
}

/**
 * Save / Upsert workspace theme settings to database.
 */
export async function saveWorkspaceThemeSettings(
  workspaceId: string,
  settings: Partial<WorkspaceThemeSettings>
): Promise<void> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  const payload: Record<string, any> = {
    workspace_id: wsId,
    preset_id: settings.presetId || DEFAULT_THEME.id,
    custom_colors: settings.customColors || {},
    font_display: settings.fontDisplay || DEFAULT_THEME.fontDisplay,
    font_sans: settings.fontSans || DEFAULT_THEME.fontSans,
    font_scale: settings.fontScale ?? 1.0,
    radius: settings.radius || DEFAULT_THEME.radius,
    motion_profile_id: settings.motionProfileId || DEFAULT_MOTION_PROFILE.id,
    atmosphere_config: settings.atmosphereConfig || DEFAULT_ATMOSPHERE_CONFIG,
    component_config: settings.componentConfig || DEFAULT_COMPONENT_CONFIG,
    favicon_url: settings.faviconUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await (supabase as any)
    .from("workspace_theme_settings")
    .select("id")
    .eq("workspace_id", wsId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from("workspace_theme_settings")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await (supabase as any)
      .from("workspace_theme_settings")
      .insert(payload);

    if (error) throw error;
  }
}

/**
 * Reset workspace theme settings in DB back to Sentinel default.
 * Does NOT delete custom uploaded logos or assets.
 */
export async function resetWorkspaceThemeSettings(workspaceId: string): Promise<void> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  const resetPayload = {
    preset_id: DEFAULT_THEME.id,
    custom_colors: {},
    font_display: DEFAULT_THEME.fontDisplay,
    font_sans: DEFAULT_THEME.fontSans,
    font_scale: 1.0,
    radius: DEFAULT_THEME.radius,
    motion_profile_id: DEFAULT_MOTION_PROFILE.id,
    atmosphere_config: DEFAULT_ATMOSPHERE_CONFIG,
    component_config: DEFAULT_COMPONENT_CONFIG,
    favicon_url: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from("workspace_theme_settings")
    .update(resetPayload)
    .eq("workspace_id", wsId);

  if (error) {
    console.warn("[workspace-theme.service] Reset DB error:", error);
  }
}
