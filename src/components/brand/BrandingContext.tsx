import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/use-auth";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import { loadBranding, saveBrandingUrls, resetBranding } from "@/lib/services/branding.service";
import { loadWorkspaceThemeSettings, resolveEffectiveTheme } from "@/lib/services/workspace-theme.service";
import {
  mapRoleToExperience,
  loadExperienceOverride,
  resolveEffectiveExperienceTheme,
  type WorkspaceExperienceType,
} from "@/lib/services/workspace-experience-theme.service";
import {
  type ThemePreset,
  type ComponentConfig,
  DEFAULT_THEME,
  DEFAULT_COMPONENT_CONFIG,
  applyThemeToDOM,
} from "@/lib/theme.manager";
import {
  type MotionProfile,
  type AtmosphereConfig,
  DEFAULT_MOTION_PROFILE,
  DEFAULT_ATMOSPHERE_CONFIG,
  applyMotionToDOM,
} from "@/lib/motion.manager";
import { setRuntimeFavicon } from "@/lib/favicon.manager";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

export type BrandingState = {
  logoUrl: string | null;
  logoUrlDark: string | null;
  workspaceId: string | null;
  activeExperience: WorkspaceExperienceType;
  effectiveTheme: ThemePreset;
  motionProfile: MotionProfile;
  atmosphereConfig: AtmosphereConfig;
  componentConfig: ComponentConfig;
  setLogos: (urls: { logoUrl?: string | null; logoUrlDark?: string | null; workspaceId?: string | null }) => Promise<void>;
  resetToDefault: (targetWorkspaceId?: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
};

const BrandingContext = createContext<BrandingState>({
  logoUrl: null,
  logoUrlDark: null,
  workspaceId: null,
  activeExperience: "platform_administrator",
  effectiveTheme: DEFAULT_THEME,
  motionProfile: DEFAULT_MOTION_PROFILE,
  atmosphereConfig: DEFAULT_ATMOSPHERE_CONFIG,
  componentConfig: DEFAULT_COMPONENT_CONFIG,
  setLogos: async () => {},
  resetToDefault: async () => {},
  refresh: async () => {},
  loading: true,
});

export function BrandingProvider({
  children,
  workspaceId: explicitWorkspaceId,
}: {
  children: ReactNode;
  workspaceId?: string | null;
}) {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id;
  const userRole = auth?.roles?.[0] || "admin";
  const prefersReducedMotion = usePrefersReducedMotion();

  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState<string | null>(explicitWorkspaceId ?? null);
  const [logoUrl, setLogoUrlState] = useState<string | null>(null);
  const [logoUrlDark, setLogoUrlDarkState] = useState<string | null>(null);
  const [effectiveTheme, setEffectiveTheme] = useState<ThemePreset>(DEFAULT_THEME);
  const [motionProfile, setMotionProfile] = useState<MotionProfile>(DEFAULT_MOTION_PROFILE);
  const [atmosphereConfig, setAtmosphereConfig] = useState<AtmosphereConfig>(DEFAULT_ATMOSPHERE_CONFIG);
  const [componentConfig, setComponentConfig] = useState<ComponentConfig>(DEFAULT_COMPONENT_CONFIG);
  const [loading, setLoading] = useState(true);

  const activeExperience: WorkspaceExperienceType = mapRoleToExperience(userRole);

  // 1. Resolve active workspaceId if not explicitly provided
  useEffect(() => {
    if (explicitWorkspaceId !== undefined) {
      setResolvedWorkspaceId(explicitWorkspaceId);
      return;
    }
    let active = true;
    (async () => {
      try {
        const wsId = await getCurrentWorkspaceId(supabaseTyped, userId);
        if (active) {
          setResolvedWorkspaceId(wsId);
        }
      } catch {
        if (active) {
          setResolvedWorkspaceId(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [explicitWorkspaceId, userId]);

  // 2. Fetch branding, workspace theme, and experience overrides
  const fetchBranding = useCallback(async (targetWsId?: string | null) => {
    const wsId = targetWsId !== undefined ? targetWsId : resolvedWorkspaceId;
    setLoading(true);
    try {
      const [brandingData, themeSettings, experienceOverride] = await Promise.all([
        loadBranding(wsId),
        loadWorkspaceThemeSettings(wsId),
        loadExperienceOverride(wsId || "00000000-0000-0000-0000-00000000d3f7", activeExperience),
      ]);
      setLogoUrlState(brandingData.logoUrl);
      setLogoUrlDarkState(brandingData.logoUrlDark);

      // Base Workspace Effective Theme
      const baseWorkspaceTheme = resolveEffectiveTheme(
        themeSettings.presetId,
        themeSettings.customColors,
        {
          fontDisplay: themeSettings.fontDisplay,
          fontSans: themeSettings.fontSans,
          fontScale: themeSettings.fontScale,
          radius: themeSettings.radius,
        }
      );

      // Resolve Final Experience Theme with Accessibility Constraints
      const effectiveExp = resolveEffectiveExperienceTheme(
        baseWorkspaceTheme,
        experienceOverride,
        { prefersReducedMotion },
        {
          motionProfileId: themeSettings.motionProfileId,
          atmosphereConfig: themeSettings.atmosphereConfig,
          componentConfig: themeSettings.componentConfig,
        }
      );

      // Update Local State for Components
      setEffectiveTheme(effectiveExp.theme);
      setMotionProfile(effectiveExp.motionProfile);
      setAtmosphereConfig(effectiveExp.atmosphereConfig);
      setComponentConfig(effectiveExp.componentConfig);

      // Apply to document DOM & Favicon
      applyThemeToDOM(effectiveExp.theme, effectiveExp.componentConfig);
      applyMotionToDOM(effectiveExp.motionProfile, prefersReducedMotion);

      if (themeSettings.faviconUrl) {
        setRuntimeFavicon(themeSettings.faviconUrl);
      }
    } catch (err) {
      console.error("[BrandingContext] Failed to load branding:", err);
      setLogoUrlState(null);
      setLogoUrlDarkState(null);
    } finally {
      setLoading(false);
    }
  }, [resolvedWorkspaceId, activeExperience, prefersReducedMotion]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // 3. Save logos to DB and update local state immediately
  const setLogos = async (urls: {
    logoUrl?: string | null;
    logoUrlDark?: string | null;
    workspaceId?: string | null;
  }) => {
    const targetWsId = urls.workspaceId !== undefined ? urls.workspaceId : resolvedWorkspaceId;
    if (urls.logoUrl !== undefined) {
      setLogoUrlState(urls.logoUrl);
    }
    if (urls.logoUrlDark !== undefined) {
      setLogoUrlDarkState(urls.logoUrlDark);
    }

    await saveBrandingUrls({
      logoUrl: urls.logoUrl,
      logoUrlDark: urls.logoUrlDark,
      workspaceId: targetWsId,
    });
  };

  // 4. Reset logos to defaults
  const resetToDefault = async (targetWorkspaceId?: string | null) => {
    const targetWsId = targetWorkspaceId !== undefined ? targetWorkspaceId : resolvedWorkspaceId;
    setLogoUrlState(null);
    setLogoUrlDarkState(null);
    await resetBranding(targetWsId);
  };

  return (
    <BrandingContext.Provider
      value={{
        logoUrl,
        logoUrlDark,
        workspaceId: resolvedWorkspaceId,
        activeExperience,
        effectiveTheme,
        motionProfile,
        atmosphereConfig,
        componentConfig,
        setLogos,
        resetToDefault,
        refresh: fetchBranding,
        loading,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);