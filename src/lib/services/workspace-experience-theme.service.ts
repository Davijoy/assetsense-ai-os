import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_THEME,
  DEFAULT_COMPONENT_CONFIG,
  type ThemePreset,
  type ComponentConfig,
} from "@/lib/theme.manager";
import {
  MOTION_PROFILES,
  DEFAULT_MOTION_PROFILE,
  DEFAULT_ATMOSPHERE_CONFIG,
  type MotionProfile,
  type AtmosphereConfig,
} from "@/lib/motion.manager";
import type { CustomColorOverrides } from "@/lib/services/workspace-theme.service";

export type WorkspaceExperienceType =
  | "platform_administrator"
  | "investor"
  | "developer_builder"
  | "sales_executive";

export interface ExperienceDefinition {
  id: WorkspaceExperienceType;
  label: string;
  description: string;
  badge: string;
  defaultAccent: string;
}

export const WORKSPACE_EXPERIENCES: ExperienceDefinition[] = [
  {
    id: "platform_administrator",
    label: "Platform Administrator",
    description: "Executive control, multi-tenant governance, system health, and cross-workspace orchestration.",
    badge: "Sovereign Command",
    defaultAccent: "#D4AF37",
  },
  {
    id: "investor",
    label: "Investor",
    description: "Portfolio performance, yield analytics, deal room access, and luxury capital opportunities.",
    badge: "Capital & Yield",
    defaultAccent: "#10B981",
  },
  {
    id: "developer_builder",
    label: "Developer / Builder",
    description: "Project phases, inventory velocity, unit matrices, construction milestones, and launch schedules.",
    badge: "Inventory & Assets",
    defaultAccent: "#3B82F6",
  },
  {
    id: "sales_executive",
    label: "Sales Executive",
    description: "High-intent lead routing, CRM intelligence, deal negotiation rooms, and voice outreach pipelines.",
    badge: "Pipeline & Deals",
    defaultAccent: "#F43F5E",
  },
];

export interface ExperienceOverrideConfig {
  primaryHex?: string;
  accentHex?: string;
  backgroundHex?: string;
  surfaceHex?: string;
  borderHex?: string;
  foregroundHex?: string;
  goldHex?: string;
  fontDisplay?: string;
  fontSans?: string;
  fontScale?: number;
  radius?: string;
  motionProfileId?: string;
  atmosphereConfig?: Partial<AtmosphereConfig>;
  componentConfig?: Partial<ComponentConfig>;
}

export interface WorkspaceExperienceRecord {
  id: string;
  workspaceId: string;
  experienceType: WorkspaceExperienceType;
  overrides: ExperienceOverrideConfig;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type InheritanceSource = "SENTINEL" | "WORKSPACE" | "EXPERIENCE" | "ACCESSIBILITY";

export interface InheritancePropertyItem {
  key: string;
  label: string;
  category: "Colors" | "Typography" | "Motion" | "Atmosphere" | "Components" | "Accessibility";
  effectiveValue: string;
  source: InheritanceSource;
  workspaceValue: string;
  experienceValue?: string;
}

/**
 * Maps internal application roles to one of the 4 canonical workspace experiences.
 */
export function mapRoleToExperience(role: string = "admin"): WorkspaceExperienceType {
  const normalized = role.toLowerCase().trim();
  if (normalized === "admin" || normalized === "platform_admin" || normalized === "owner") {
    return "platform_administrator";
  }
  if (normalized === "investor" || normalized === "buyer" || normalized === "viewer") {
    return "investor";
  }
  if (normalized === "builder" || normalized === "developer" || normalized === "architect") {
    return "developer_builder";
  }
  return "sales_executive"; // manager, agent, broker, channel_partner, sales_executive
}

export interface WorkspaceDefaults {
  motionProfileId?: string;
  atmosphereConfig?: Partial<AtmosphereConfig>;
  componentConfig?: Partial<ComponentConfig>;
}

/**
 * Resolves effective theme, motion, atmosphere, and component styling following the strict hierarchy:
 * Sentinel Default -> Workspace Theme -> Experience Override -> Accessibility Constraints
 */
export function resolveEffectiveExperienceTheme(
  workspaceTheme: ThemePreset = DEFAULT_THEME,
  experienceOverride: ExperienceOverrideConfig = {},
  accessibilityState: { prefersReducedMotion?: boolean } = {},
  workspaceDefaults?: WorkspaceDefaults
): {
  theme: ThemePreset;
  motionProfile: MotionProfile;
  atmosphereConfig: AtmosphereConfig;
  componentConfig: ComponentConfig;
} {
  // 1. Resolve Effective ThemePreset
  const theme: ThemePreset = {
    ...workspaceTheme,
    primaryHex: experienceOverride.primaryHex || workspaceTheme.primaryHex || DEFAULT_THEME.primaryHex,
    accentHex: experienceOverride.accentHex || workspaceTheme.accentHex || DEFAULT_THEME.accentHex,
    backgroundHex: experienceOverride.backgroundHex || workspaceTheme.backgroundHex || DEFAULT_THEME.backgroundHex,
    surfaceHex: experienceOverride.surfaceHex || workspaceTheme.surfaceHex || DEFAULT_THEME.surfaceHex,
    fontDisplay: experienceOverride.fontDisplay || workspaceTheme.fontDisplay || DEFAULT_THEME.fontDisplay,
    fontSans: experienceOverride.fontSans || workspaceTheme.fontSans || DEFAULT_THEME.fontSans,
    fontScale: experienceOverride.fontScale ?? workspaceTheme.fontScale ?? 1.0,
    radius: experienceOverride.radius || workspaceTheme.radius || DEFAULT_THEME.radius,
    ...(experienceOverride.borderHex || (workspaceTheme as any).borderHex
      ? { borderHex: experienceOverride.borderHex || (workspaceTheme as any).borderHex }
      : {}),
    ...(experienceOverride.foregroundHex || (workspaceTheme as any).foregroundHex
      ? { foregroundHex: experienceOverride.foregroundHex || (workspaceTheme as any).foregroundHex }
      : {}),
    ...(experienceOverride.goldHex || (workspaceTheme as any).goldHex
      ? { goldHex: experienceOverride.goldHex || (workspaceTheme as any).goldHex }
      : {}),
  };

  // 2. Resolve Effective Motion Profile
  const targetMotionId =
    experienceOverride.motionProfileId ||
    workspaceDefaults?.motionProfileId ||
    DEFAULT_MOTION_PROFILE.id;
  const baseMotion =
    MOTION_PROFILES.find((p) => p.id === targetMotionId) || DEFAULT_MOTION_PROFILE;

  // 3. Resolve Effective Atmosphere Config
  const atmosphereConfig: AtmosphereConfig = {
    ...DEFAULT_ATMOSPHERE_CONFIG,
    ...(workspaceDefaults?.atmosphereConfig || {}),
    ...(experienceOverride.atmosphereConfig || {}),
  };

  // 4. Resolve Effective Component Config
  const componentConfig: ComponentConfig = {
    ...DEFAULT_COMPONENT_CONFIG,
    ...(workspaceDefaults?.componentConfig || {}),
    ...(experienceOverride.componentConfig || {}),
  };

  // 5. Accessibility Override Layer (Always Applied Last)
  let motionProfile = baseMotion;
  if (accessibilityState.prefersReducedMotion) {
    const offProfile = MOTION_PROFILES.find((p) => p.id === "off") || DEFAULT_MOTION_PROFILE;
    motionProfile = {
      ...offProfile,
      enabled: false,
      transitionMultiplier: 0,
    };
    atmosphereConfig.particleDensity = "none";
    atmosphereConfig.driftIntensity = "none";
  }

  return {
    theme,
    motionProfile,
    atmosphereConfig,
    componentConfig,
  };
}

/**
 * Returns a detailed property-by-property breakdown for the Inheritance Inspector.
 */
export function getInheritanceBreakdown(
  workspaceTheme: ThemePreset = DEFAULT_THEME,
  experienceOverride: ExperienceOverrideConfig = {},
  accessibilityState: { prefersReducedMotion?: boolean } = {},
  workspaceDefaults?: WorkspaceDefaults
): InheritancePropertyItem[] {
  const isExp = (val: any) => val !== undefined && val !== null && val !== "";
  const isWs = (val: any, def: any) => val !== undefined && val !== null && val !== def;

  const wsMotionId = workspaceDefaults?.motionProfileId || "executive";

  const items: InheritancePropertyItem[] = [
    {
      key: "primaryHex",
      label: "Primary Brand Accent",
      category: "Colors",
      effectiveValue: experienceOverride.primaryHex || workspaceTheme.primaryHex,
      source: isExp(experienceOverride.primaryHex)
        ? "EXPERIENCE"
        : isWs(workspaceTheme.primaryHex, DEFAULT_THEME.primaryHex)
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: workspaceTheme.primaryHex,
      experienceValue: experienceOverride.primaryHex,
    },
    {
      key: "accentHex",
      label: "Secondary Accent",
      category: "Colors",
      effectiveValue: experienceOverride.accentHex || workspaceTheme.accentHex,
      source: isExp(experienceOverride.accentHex)
        ? "EXPERIENCE"
        : isWs(workspaceTheme.accentHex, DEFAULT_THEME.accentHex)
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: workspaceTheme.accentHex,
      experienceValue: experienceOverride.accentHex,
    },
    {
      key: "backgroundHex",
      label: "Base Canvas Background",
      category: "Colors",
      effectiveValue: experienceOverride.backgroundHex || workspaceTheme.backgroundHex,
      source: isExp(experienceOverride.backgroundHex)
        ? "EXPERIENCE"
        : isWs(workspaceTheme.backgroundHex, DEFAULT_THEME.backgroundHex)
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: workspaceTheme.backgroundHex,
      experienceValue: experienceOverride.backgroundHex,
    },
    {
      key: "surfaceHex",
      label: "Card & Surface Container",
      category: "Colors",
      effectiveValue: experienceOverride.surfaceHex || workspaceTheme.surfaceHex,
      source: isExp(experienceOverride.surfaceHex)
        ? "EXPERIENCE"
        : isWs(workspaceTheme.surfaceHex, DEFAULT_THEME.surfaceHex)
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: workspaceTheme.surfaceHex,
      experienceValue: experienceOverride.surfaceHex,
    },
    {
      key: "fontDisplay",
      label: "Display / Heading Typography",
      category: "Typography",
      effectiveValue: experienceOverride.fontDisplay || workspaceTheme.fontDisplay,
      source: isExp(experienceOverride.fontDisplay)
        ? "EXPERIENCE"
        : isWs(workspaceTheme.fontDisplay, DEFAULT_THEME.fontDisplay)
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: workspaceTheme.fontDisplay,
      experienceValue: experienceOverride.fontDisplay,
    },
    {
      key: "fontSans",
      label: "Body Sans Typography",
      category: "Typography",
      effectiveValue: experienceOverride.fontSans || workspaceTheme.fontSans,
      source: isExp(experienceOverride.fontSans)
        ? "EXPERIENCE"
        : isWs(workspaceTheme.fontSans, DEFAULT_THEME.fontSans)
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: workspaceTheme.fontSans,
      experienceValue: experienceOverride.fontSans,
    },
    {
      key: "fontScale",
      label: "Typography Scale",
      category: "Typography",
      effectiveValue: `${Math.round((experienceOverride.fontScale ?? workspaceTheme.fontScale ?? 1.0) * 100)}%`,
      source: isExp(experienceOverride.fontScale)
        ? "EXPERIENCE"
        : isWs(workspaceTheme.fontScale, 1.0)
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: `${Math.round((workspaceTheme.fontScale ?? 1.0) * 100)}%`,
      experienceValue: experienceOverride.fontScale ? `${Math.round(experienceOverride.fontScale * 100)}%` : undefined,
    },
    {
      key: "radius",
      label: "Global Corner Radius",
      category: "Components",
      effectiveValue: experienceOverride.radius || workspaceTheme.radius,
      source: isExp(experienceOverride.radius)
        ? "EXPERIENCE"
        : isWs(workspaceTheme.radius, DEFAULT_THEME.radius)
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: workspaceTheme.radius,
      experienceValue: experienceOverride.radius,
    },
    {
      key: "motionProfile",
      label: "Motion & Transition Profile",
      category: "Motion",
      effectiveValue: accessibilityState.prefersReducedMotion
        ? "Static Focus (Reduced Motion)"
        : experienceOverride.motionProfileId || `${wsMotionId} (Workspace)`,
      source: accessibilityState.prefersReducedMotion
        ? "ACCESSIBILITY"
        : isExp(experienceOverride.motionProfileId)
        ? "EXPERIENCE"
        : wsMotionId !== "executive"
        ? "WORKSPACE"
        : "SENTINEL",
      workspaceValue: wsMotionId,
      experienceValue: experienceOverride.motionProfileId,
    },
  ];

  return items;
}

/**
 * Load all experience overrides for a workspace from database.
 */
export async function loadExperienceOverrides(
  workspaceId?: string | null
): Promise<Record<WorkspaceExperienceType, ExperienceOverrideConfig>> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  const emptyMap: Record<WorkspaceExperienceType, ExperienceOverrideConfig> = {
    platform_administrator: {},
    investor: {},
    developer_builder: {},
    sales_executive: {},
  };

  try {
    const { data, error } = await (supabase as any)
      .from("workspace_experience_theme_overrides")
      .select("*")
      .eq("workspace_id", wsId);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (row.experience_type in emptyMap) {
          emptyMap[row.experience_type as WorkspaceExperienceType] = row.overrides || {};
        }
      }
    }
  } catch (err) {
    console.warn("[workspace-experience-theme.service] Failed to load experience overrides:", err);
  }

  return emptyMap;
}

/**
 * Load a single experience override from database.
 */
export async function loadExperienceOverride(
  workspaceId: string,
  experienceType: WorkspaceExperienceType
): Promise<ExperienceOverrideConfig> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  try {
    const { data, error } = await (supabase as any)
      .from("workspace_experience_theme_overrides")
      .select("overrides")
      .eq("workspace_id", wsId)
      .eq("experience_type", experienceType)
      .maybeSingle();

    if (!error && data?.overrides) {
      return data.overrides;
    }
  } catch (err) {
    console.warn(`[workspace-experience-theme.service] Failed to load ${experienceType} override:`, err);
  }

  return {};
}

/**
 * Save or Upsert an experience override.
 */
export async function saveExperienceOverride(
  workspaceId: string,
  experienceType: WorkspaceExperienceType,
  overrides: ExperienceOverrideConfig
): Promise<void> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  const payload = {
    workspace_id: wsId,
    experience_type: experienceType,
    overrides: overrides || {},
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await (supabase as any)
    .from("workspace_experience_theme_overrides")
    .select("id")
    .eq("workspace_id", wsId)
    .eq("experience_type", experienceType)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from("workspace_experience_theme_overrides")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await (supabase as any)
      .from("workspace_experience_theme_overrides")
      .insert(payload);

    if (error) throw error;
  }
}

/**
 * Reset a single experience override back to pure workspace inheritance.
 * Does not delete workspace theme, other experiences, or brand assets.
 */
export async function resetExperienceOverride(
  workspaceId: string,
  experienceType: WorkspaceExperienceType
): Promise<void> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  const { error } = await (supabase as any)
    .from("workspace_experience_theme_overrides")
    .delete()
    .eq("workspace_id", wsId)
    .eq("experience_type", experienceType);

  if (error) {
    console.warn(`[workspace-experience-theme.service] Failed to delete ${experienceType} override:`, error);
  }
}
