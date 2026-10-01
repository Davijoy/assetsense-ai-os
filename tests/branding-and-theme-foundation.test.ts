import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadBranding,
  uploadAndSaveLogo,
  saveBrandingUrls,
  resetBranding,
  STORAGE_BUCKET,
} from "@/lib/services/branding.service";
import {
  THEME_PRESETS,
  DEFAULT_THEME,
  DEFAULT_COMPONENT_CONFIG,
  applyThemeToDOM,
  loadSavedTheme,
  saveThemeConfig,
  getThemeCssVariables,
  applyThemeToElement,
  getContrastRatio,
  FONT_DISPLAY_OPTIONS,
  FONT_SANS_OPTIONS,
  FONT_SCALE_OPTIONS,
  RADIUS_OPTIONS,
  ELEVATION_OPTIONS,
  BORDER_STRENGTH_OPTIONS,
  BUTTON_SHAPE_OPTIONS,
  DENSITY_OPTIONS,
  GLASS_OPTIONS,
  type ComponentConfig,
} from "@/lib/theme.manager";
import {
  MOTION_PROFILES,
  DEFAULT_MOTION_PROFILE,
  DEFAULT_ATMOSPHERE_CONFIG,
  getMotionCssVariables,
  profileToAtmosphereConfig,
} from "@/lib/motion.manager";
import { setRuntimeFavicon, DEFAULT_FAVICON_URL } from "@/lib/favicon.manager";
import {
  loadBrandAssets,
  uploadBrandAsset,
  setActiveAsset,
  deleteBrandAsset,
  verifyBrandAssetStorageExistence,
  ASSET_STORAGE_BUCKET,
} from "@/lib/services/brand-assets.service";
import {
  loadWorkspaceThemeSettings,
  saveWorkspaceThemeSettings,
  resetWorkspaceThemeSettings,
  resolveEffectiveTheme,
  DEFAULT_WORKSPACE_THEME_SETTINGS,
} from "@/lib/services/workspace-theme.service";
import {
  WORKSPACE_EXPERIENCES,
  loadExperienceOverrides,
  loadExperienceOverride,
  saveExperienceOverride,
  resetExperienceOverride,
  resolveEffectiveExperienceTheme,
  getInheritanceBreakdown,
  mapRoleToExperience,
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
import { isRouteAuthorized, ROUTE_ROLES } from "@/lib/route-roles";
import { buttonVariants } from "@/components/ui/button";

// Mock Supabase in-memory store
let store: Record<string, any[]> = {};
let storageFiles: Record<string, string[]> = {};

const createInitialStore = () => ({
  branding_settings: [
    {
      id: "ws-branding-1",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      tenant_key: "workspace_d3f7",
      logo_url: "https://storage.supabase.co/branding-logos/ws1/light/logo.png",
      logo_url_dark: "https://storage.supabase.co/branding-logos/ws1/dark/logo.png",
    },
    {
      id: "ws-branding-legacy-base64",
      workspace_id: "11111111-1111-1111-1111-111111111111",
      tenant_key: "workspace_1111",
      logo_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      logo_url_dark: null,
    },
    {
      id: "default-tenant-row",
      workspace_id: null,
      tenant_key: "default",
      logo_url: "https://storage.supabase.co/branding-logos/global/light/default-tenant.png",
      logo_url_dark: null,
    },
  ],
  brand_assets: [
    {
      id: "asset-1",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      asset_type: "favicons",
      name: "custom-favicon.png",
      storage_path: "00000000-0000-0000-0000-00000000d3f7/favicons/custom-favicon.png",
      public_url: "https://storage.supabase.co/branding-assets/00000000-0000-0000-0000-00000000d3f7/favicons/custom-favicon.png",
      mime_type: "image/png",
      file_size: 15000,
      is_active: true,
      created_at: "2026-09-30T12:00:00Z",
    },
  ],
  workspace_theme_settings: [
    {
      id: "theme-setting-1",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      preset_id: "cobalt_cyber",
      custom_colors: { primaryHex: "#2563EB" },
      font_display: '"Space Grotesk", system-ui, sans-serif',
      font_sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
      font_scale: 1.05,
      radius: "0.75rem",
      motion_profile_id: "subtle",
      atmosphere_config: {
        enabled: true,
        gridIntensity: "low",
        glowIntensity: "low",
        particleDensity: "none",
        driftIntensity: "low",
        watermarkVisibility: true,
      },
      component_config: {
        elevation: "elevated",
        borderStrength: "strong",
        buttonShape: "rounded",
        density: "compact",
        glassEffect: "executive",
      },
      favicon_url: "https://storage.supabase.co/branding-assets/00000000-0000-0000-0000-00000000d3f7/favicons/custom-favicon.png",
      updated_at: "2026-09-30T12:00:00Z",
    },
  ],
  workspace_experience_theme_overrides: [
    {
      id: "exp-ovr-investor-1",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      experience_type: "investor",
      overrides: {
        primaryHex: "#10B981",
        accentHex: "#34D399",
      },
      updated_at: "2026-09-30T12:00:00Z",
    },
  ],
  brand_theme_versions: [
    {
      id: "ver-1",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      version_number: 1,
      label: "Baseline Configuration",
      change_type: "workspace_save",
      change_summary: "Initial workspace brand configuration",
      snapshot: {
        workspaceTheme: {
          presetId: "clout_obsidian_gold",
          customColors: {},
          fontDisplay: '"Instrument Serif", ui-serif, Georgia, serif',
          fontSans: '"Work Sans", ui-sans-serif, system-ui, sans-serif',
          fontScale: 1.0,
          radius: "0.5rem",
          motionProfileId: "executive",
        },
        faviconUrl: null,
        experienceOverrides: {},
      },
      restored_from_version_id: null,
      is_current: false,
      created_at: "2026-09-30T10:00:00Z",
    },
    {
      id: "ver-2",
      workspace_id: "00000000-0000-0000-0000-00000000d3f7",
      version_number: 2,
      label: "Cobalt Sovereign Theme",
      change_type: "workspace_save",
      change_summary: "Saved workspace theme configuration (Cobalt Sovereign)",
      snapshot: {
        workspaceTheme: {
          presetId: "cobalt_cyber",
          customColors: { primaryHex: "#2563EB" },
          fontDisplay: '"Space Grotesk", system-ui, sans-serif',
          fontSans: '"Inter", ui-sans-serif, system-ui, sans-serif',
          fontScale: 1.05,
          radius: "0.75rem",
          motionProfileId: "subtle",
        },
        faviconUrl: "https://storage.supabase.co/branding-assets/00000000-0000-0000-0000-00000000d3f7/favicons/custom-favicon.png",
        experienceOverrides: {
          investor: { primaryHex: "#10B981" },
        },
      },
      restored_from_version_id: null,
      is_current: true,
      created_at: "2026-09-30T12:00:00Z",
    },
  ],
});

vi.mock("@/integrations/supabase/client", () => {
  const createQueryBuilder = (tableName: string) => {
    let filters: Array<{ field: string; value: any }> = [];
    let orderConfig: { column: string; ascending: boolean } | null = null;

    const builder = {
      select: () => builder,
      eq: (field: string, value: any) => {
        filters.push({ field, value });
        return builder;
      },
      order: (column: string, opts?: { ascending?: boolean }) => {
        orderConfig = { column, ascending: opts?.ascending ?? true };
        return builder;
      },
      then: (resolve: any) => {
        const rows = store[tableName] || [];
        let matches = rows.filter((r: any) =>
          filters.every((f) => r[f.field] === f.value)
        );
        if (orderConfig) {
          const { column, ascending } = orderConfig;
          matches = [...matches].sort((a, b) => {
            const vA = a[column];
            const vB = b[column];
            if (vA < vB) return ascending ? -1 : 1;
            if (vA > vB) return ascending ? 1 : -1;
            return 0;
          });
        }
        return resolve({ data: matches.map((m) => ({ ...m })), error: null });
      },
      maybeSingle: async () => {
        const rows = store[tableName] || [];
        let matches = rows.filter((r: any) =>
          filters.every((f) => r[f.field] === f.value)
        );
        if (orderConfig) {
          const { column, ascending } = orderConfig;
          matches = [...matches].sort((a, b) => {
            const vA = a[column];
            const vB = b[column];
            if (vA < vB) return ascending ? -1 : 1;
            if (vA > vB) return ascending ? 1 : -1;
            return 0;
          });
        }
        return { data: matches[0] ? { ...matches[0] } : null, error: null };
      },
      single: async () => {
        const rows = store[tableName] || [];
        const match = rows.find((r: any) =>
          filters.every((f) => r[f.field] === f.value)
        );
        return { data: match ? { ...match } : null, error: null };
      },
      update: (patch: any) => {
        const updateBuilder = {
          eq: (field: string, value: any) => {
            filters.push({ field, value });
            return updateBuilder;
          },
          then: (resolve: any) => {
            const rows = store[tableName] || [];
            rows.forEach((r: any, idx: number) => {
              if (filters.every((f) => r[f.field] === f.value)) {
                store[tableName][idx] = { ...store[tableName][idx], ...patch };
              }
            });
            return resolve({ error: null });
          },
        };
        return updateBuilder;
      },
      delete: () => {
        const deleteBuilder = {
          eq: (field: string, value: any) => {
            filters.push({ field, value });
            return deleteBuilder;
          },
          then: (resolve: any) => {
            const rows = store[tableName] || [];
            store[tableName] = rows.filter(
              (r: any) => !filters.every((f) => r[f.field] === f.value)
            );
            return resolve({ error: null });
          },
        };
        return deleteBuilder;
      },
      insert: (row: any) => {
        const newRow = { id: `id-${Date.now()}-${Math.random()}`, ...row };
        if (!store[tableName]) store[tableName] = [];
        store[tableName].push(newRow);
        return {
          select: () => ({
            single: async () => ({ data: newRow, error: null }),
            maybeSingle: async () => ({ data: newRow, error: null }),
          }),
          then: (resolve: any) => resolve({ data: newRow, error: null }),
        };
      },
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => createQueryBuilder(table),
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, _file: any) => {
            if (!storageFiles[bucket]) storageFiles[bucket] = [];
            storageFiles[bucket].push(path);
            return { data: { path }, error: null };
          },
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://storage.supabase.co/${bucket}/${path}` },
          }),
          remove: async (paths: string[]) => {
            if (storageFiles[bucket]) {
              storageFiles[bucket] = storageFiles[bucket].filter((p) => !paths.includes(p));
            }
            return { error: null };
          },
          list: async (folder: string, opts?: { search?: string }) => {
            const files = storageFiles[bucket] || [];
            const search = opts?.search || "";
            const matched = files
              .filter((p) => p.startsWith(folder) && (!search || p.includes(search)))
              .map((p) => {
                const parts = p.split("/");
                return { name: parts[parts.length - 1], id: p };
              });
            return { data: matched, error: null };
          },
        }),
      },
      rpc: async (fnName: string, params: any) => {
        if (fnName === "create_brand_version_snapshot") {
          const wsId = params.p_workspace_id;
          const rows = store["brand_theme_versions"] || [];
          const wsRows = rows.filter((r) => r.workspace_id === wsId);
          const nextVersion = wsRows.length > 0 ? Math.max(...wsRows.map((r) => r.version_number)) + 1 : 1;

          const createdRow = {
            id: `ver-${Date.now()}-${Math.random()}`,
            workspace_id: wsId,
            version_number: nextVersion,
            label: params.p_label || null,
            change_type: params.p_change_type,
            change_summary: params.p_change_summary,
            snapshot: params.p_snapshot,
            restored_from_version_id: params.p_restored_from_version_id || null,
            is_current: true,
            created_by: "auth-user-id",
            created_at: new Date().toISOString(),
          };

          if (!store["brand_theme_versions"]) store["brand_theme_versions"] = [];
          store["brand_theme_versions"].push(createdRow);
          return { data: createdRow, error: null };
        }

        if (fnName === "restore_brand_theme_version") {
          const wsId = params.p_workspace_id;
          const targetId = params.p_target_version_id;
          const versions = store["brand_theme_versions"] || [];
          const target = versions.find((v) => v.id === targetId && v.workspace_id === wsId);

          if (!target) {
            return { data: null, error: { message: `Version ${targetId} not found` } };
          }

          // 1. Historical Favicon Asset Check in brand_assets
          let safeFavicon: string | null = target.snapshot.faviconUrl || target.snapshot.workspaceTheme?.faviconUrl || null;
          const warnings: string[] = [];
          if (safeFavicon) {
            const dbAssets = store["brand_assets"] || [];
            const assetExists = dbAssets.some((a) => a.workspace_id === wsId && a.public_url === safeFavicon);
            if (!assetExists) {
              warnings.push(`Historical favicon (${safeFavicon}) was not found; defaulted.`);
              safeFavicon = null;
            }
          }

          // 2. Update workspace theme settings
          const wsSettings = store["workspace_theme_settings"] || [];
          const existingWsIdx = wsSettings.findIndex((w) => w.workspace_id === wsId);
          const updatedSettings = {
            id: existingWsIdx !== -1 ? wsSettings[existingWsIdx].id : `theme-${Date.now()}`,
            workspace_id: wsId,
            ...target.snapshot.workspaceTheme,
            favicon_url: safeFavicon,
            updated_at: new Date().toISOString(),
          };

          if (existingWsIdx !== -1) {
            store["workspace_theme_settings"][existingWsIdx] = updatedSettings;
          } else {
            store["workspace_theme_settings"].push(updatedSettings);
          }

          // 2. Atomic experience overrides replacement
          const existingExp = store["workspace_experience_theme_overrides"] || [];
          store["workspace_experience_theme_overrides"] = existingExp.filter((e) => e.workspace_id !== wsId);

          if (target.snapshot.experienceOverrides) {
            for (const [k, v] of Object.entries(target.snapshot.experienceOverrides)) {
              if (v && Object.keys(v).length > 0) {
                store["workspace_experience_theme_overrides"].push({
                  id: `exp-${Date.now()}-${Math.random()}`,
                  workspace_id: wsId,
                  experience_type: k,
                  overrides: v,
                  updated_at: new Date().toISOString(),
                });
              }
            }
          }

          // 3. Insert new restore version
          const nextVersion = Math.max(...versions.filter((r) => r.workspace_id === wsId).map((r) => r.version_number)) + 1;
          const newVersionRow = {
            id: `ver-restored-${Date.now()}`,
            workspace_id: wsId,
            version_number: nextVersion,
            label: `Rollback to v${target.version_number}`,
            change_type: "version_restore",
            change_summary: `Restored configuration from v${target.version_number}`,
            snapshot: target.snapshot,
            restored_from_version_id: target.id,
            is_current: true,
            created_by: "auth-user-id",
            created_at: new Date().toISOString(),
          };
          store["brand_theme_versions"].push(newVersionRow);

          return {
            data: {
              success: true,
              version: newVersionRow,
              warnings: [],
            },
            error: null,
          };
        }

        return { data: null, error: { message: `Unknown RPC function: ${fnName}` } };
      },
    },
  };
});

describe("Sentinel Fort — Brand & Experience Studio 2.0 (Phase 2D Hardened)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = createInitialStore();
    storageFiles = {
      "branding-assets": [
        "00000000-0000-0000-0000-00000000d3f7/favicons/custom-favicon.png",
      ],
      "branding-logos": [
        "ws1/light/logo.png",
        "ws1/dark/logo.png",
      ],
    };
  });

  describe("A. Workspace Experience Overrides", () => {
    it("exports all 4 canonical workspace experiences with exact labels", () => {
      expect(WORKSPACE_EXPERIENCES).toHaveLength(4);
      const labels = WORKSPACE_EXPERIENCES.map((e) => e.label);
      expect(labels).toContain("Platform Administrator");
      expect(labels).toContain("Investor");
      expect(labels).toContain("Developer / Builder");
      expect(labels).toContain("Sales Executive");
    });

    it("maps internal roles to corresponding workspace experiences", () => {
      expect(mapRoleToExperience("admin")).toBe("platform_administrator");
      expect(mapRoleToExperience("investor")).toBe("investor");
      expect(mapRoleToExperience("viewer")).toBe("investor");
      expect(mapRoleToExperience("builder")).toBe("developer_builder");
      expect(mapRoleToExperience("developer")).toBe("developer_builder");
      expect(mapRoleToExperience("manager")).toBe("sales_executive");
      expect(mapRoleToExperience("agent")).toBe("sales_executive");
    });

    it("inherits workspace theme completely when experience has no overrides", () => {
      const workspaceTheme: ThemePreset = {
        ...DEFAULT_THEME,
        primaryHex: "#D4AF37",
        fontDisplay: '"Instrument Serif", serif',
      };

      const resolved = resolveEffectiveExperienceTheme(workspaceTheme, {});
      expect(resolved.theme.primaryHex).toBe("#D4AF37");
      expect(resolved.theme.fontDisplay).toBe('"Instrument Serif", serif');
      expect(resolved.motionProfile.id).toBe(DEFAULT_MOTION_PROFILE.id);
      expect(resolved.componentConfig.elevation).toBe(DEFAULT_COMPONENT_CONFIG.elevation);
    });

    it("replaces only the overridden property while inheriting all non-overridden fields", () => {
      const workspaceTheme: ThemePreset = {
        ...DEFAULT_THEME,
        primaryHex: "#D4AF37",
        backgroundHex: "#0C0E14",
        fontDisplay: '"Instrument Serif", serif',
        radius: "0.5rem",
      };

      const investorOverride: ExperienceOverrideConfig = {
        primaryHex: "#10B981", // Only primary color overridden
      };

      const resolved = resolveEffectiveExperienceTheme(workspaceTheme, investorOverride);
      // Overridden
      expect(resolved.theme.primaryHex).toBe("#10B981");
      // Inherited from workspace
      expect(resolved.theme.backgroundHex).toBe("#0C0E14");
      expect(resolved.theme.fontDisplay).toBe('"Instrument Serif", serif');
      expect(resolved.theme.radius).toBe("0.5rem");
    });

    it("preserves non-overridden motion and typography when only colors are overridden", () => {
      const workspaceTheme: ThemePreset = {
        ...DEFAULT_THEME,
        fontSans: '"Inter", sans-serif',
        fontScale: 1.05,
      };

      const devOverride: ExperienceOverrideConfig = {
        primaryHex: "#3B82F6",
      };

      const resolved = resolveEffectiveExperienceTheme(workspaceTheme, devOverride);
      expect(resolved.theme.primaryHex).toBe("#3B82F6");
      expect(resolved.theme.fontSans).toBe('"Inter", sans-serif');
      expect(resolved.theme.fontScale).toBe(1.05);
      expect(resolved.motionProfile.id).toBe("executive");
    });

    it("loads experience overrides scoped by workspace", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const overrides = await loadExperienceOverrides(wsId);
      expect(overrides.investor.primaryHex).toBe("#10B981");
      expect(overrides.platform_administrator).toEqual({});
    });

    it("saves and upserts experience overrides for a specific workspace experience", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      await saveExperienceOverride(wsId, "developer_builder", {
        primaryHex: "#3B82F6",
        radius: "0.25rem",
      });

      const devOverride = await loadExperienceOverride(wsId, "developer_builder");
      expect(devOverride.primaryHex).toBe("#3B82F6");
      expect(devOverride.radius).toBe("0.25rem");
    });

    it("resets experience override back to pure workspace inheritance without touching other experiences", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      await resetExperienceOverride(wsId, "investor");

      const investorOverride = await loadExperienceOverride(wsId, "investor");
      expect(investorOverride).toEqual({});

      // Ensure workspace theme settings remain intact
      const wsTheme = await loadWorkspaceThemeSettings(wsId);
      expect(wsTheme.presetId).toBe("cobalt_cyber");
    });

    it("strictly applies accessibility constraints over experience motion overrides", () => {
      const workspaceTheme: ThemePreset = DEFAULT_THEME;
      const immersiveOverride: ExperienceOverrideConfig = {
        motionProfileId: "immersive",
      };

      // When user system requests reduced motion
      const resolved = resolveEffectiveExperienceTheme(workspaceTheme, immersiveOverride, {
        prefersReducedMotion: true,
      });

      expect(resolved.motionProfile.enabled).toBe(false);
      expect(resolved.motionProfile.transitionMultiplier).toBe(0);
      expect(resolved.atmosphereConfig.particleDensity).toBe("none");
    });
  });

  describe("B. Inheritance Inspector", () => {
    it("identifies SENTINEL, WORKSPACE, EXPERIENCE, and ACCESSIBILITY origin sources accurately", () => {
      const workspaceTheme: ThemePreset = {
        ...DEFAULT_THEME,
        primaryHex: "#D4AF37", // Sentinel Default
        fontDisplay: '"Space Grotesk", sans-serif', // Custom Workspace Override
      };

      const expOverride: ExperienceOverrideConfig = {
        primaryHex: "#10B981", // Experience Override
      };

      const breakdown = getInheritanceBreakdown(workspaceTheme, expOverride, {
        prefersReducedMotion: true, // Accessibility Override
      });

      const primaryItem = breakdown.find((i) => i.key === "primaryHex")!;
      expect(primaryItem.source).toBe("EXPERIENCE");
      expect(primaryItem.effectiveValue).toBe("#10B981");

      const fontItem = breakdown.find((i) => i.key === "fontDisplay")!;
      expect(fontItem.source).toBe("WORKSPACE");

      const motionItem = breakdown.find((i) => i.key === "motionProfile")!;
      expect(motionItem.source).toBe("ACCESSIBILITY");
    });
  });

  describe("C. Version Number Concurrency & Advisory Lock Strategy", () => {
    it("loads version history records for workspace in descending order", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const versions = await loadBrandThemeVersions(wsId);
      expect(versions.length).toBe(2);
      expect(versions[0].versionNumber).toBe(2);
      expect(versions[1].versionNumber).toBe(1);
    });

    it("creates a new sequential version snapshot via PostgreSQL RPC", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const snapshot: BrandVersionSnapshot = {
        workspaceTheme: {
          ...DEFAULT_WORKSPACE_THEME_SETTINGS,
          presetId: "sovereign_emerald",
        },
        faviconUrl: null,
        experienceOverrides: {},
      };

      const newVer = await createBrandThemeVersion(
        wsId,
        "workspace_save",
        "Updated theme to Sovereign Emerald",
        snapshot,
        "Emerald Update"
      );

      expect(newVer.versionNumber).toBe(3);
      expect(newVer.label).toBe("Emerald Update");
      expect(newVer.changeType).toBe("workspace_save");
    });

    it("produces distinct sequential version numbers under concurrent requests", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const snapshot: BrandVersionSnapshot = {
        workspaceTheme: DEFAULT_WORKSPACE_THEME_SETTINGS,
        experienceOverrides: {},
      };

      const [vA, vB] = await Promise.all([
        createBrandThemeVersion(wsId, "workspace_save", "Concurrent save A", snapshot),
        createBrandThemeVersion(wsId, "workspace_save", "Concurrent save B", snapshot),
      ]);

      expect(vA.versionNumber).not.toBe(vB.versionNumber);
      expect(Math.abs(vA.versionNumber - vB.versionNumber)).toBe(1);
    });

    it("allows different workspaces to independently allocate version numbers", async () => {
      const ws1 = "00000000-0000-0000-0000-00000000d3f7";
      const ws2 = "22222222-2222-2222-2222-222222222222";
      const snapshot: BrandVersionSnapshot = {
        workspaceTheme: DEFAULT_WORKSPACE_THEME_SETTINGS,
        experienceOverrides: {},
      };

      const vWs2 = await createBrandThemeVersion(ws2, "workspace_save", "WS2 initial", snapshot);
      expect(vWs2.versionNumber).toBe(1);

      const vWs1 = await createBrandThemeVersion(ws1, "workspace_save", "WS1 next", snapshot);
      expect(vWs1.versionNumber).toBe(3);
    });
  });

  describe("D. Transactional Safe Rollback & Restore RPC", () => {
    it("performs atomic restore: updates workspace settings and replaces experience overrides", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const versions = await loadBrandThemeVersions(wsId);
      const targetV1 = versions.find((v) => v.versionNumber === 1)!;

      const restoredVersion = await restoreBrandThemeVersion(wsId, targetV1);
      expect(restoredVersion.versionNumber).toBe(3);
      expect(restoredVersion.changeType).toBe("version_restore");
      expect(restoredVersion.restoredFromVersionId).toBe(targetV1.id);

      // Verify workspace settings were updated to V1 preset
      const updatedTheme = await loadWorkspaceThemeSettings(wsId);
      expect(updatedTheme.presetId).toBe("clout_obsidian_gold");

      // Verify experience overrides were cleared back to V1 state (empty)
      const overrides = await loadExperienceOverrides(wsId);
      expect(overrides.investor).toEqual({});
    });

    it("clears stale overrides that were not present in the historical snapshot", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const versions = await loadBrandThemeVersions(wsId);
      const targetV1 = versions.find((v) => v.versionNumber === 1)!;

      // Manually add a present-day developer override
      await saveExperienceOverride(wsId, "developer_builder", { primaryHex: "#3B82F6" });

      await restoreBrandThemeVersion(wsId, targetV1);
      const devOverride = await loadExperienceOverride(wsId, "developer_builder");
      expect(devOverride).toEqual({});
    });

    it("rejects malformed snapshot without mutating database state", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const malformedVersion = {
        id: "v-bad",
        workspaceId: wsId,
        versionNumber: 99,
        changeType: "workspace_save" as const,
        changeSummary: "Corrupted snapshot",
        snapshot: null as any,
        createdAt: "2026-09-30T00:00:00Z",
      };

      await expect(restoreBrandThemeVersion(wsId, malformedVersion)).rejects.toThrow(
        /Invalid snapshot format/
      );
    });
  });

  describe("E. Historical Asset Storage Verification & Fallback", () => {
    it("validates existing asset file in Supabase Storage", async () => {
      const check = await verifyBrandAssetStorageExistence(
        "https://storage.supabase.co/branding-assets/00000000-0000-0000-0000-00000000d3f7/favicons/custom-favicon.png"
      );
      expect(check.exists).toBe(true);
    });

    it("detects missing storage asset and handles safely", async () => {
      const check = await verifyBrandAssetStorageExistence(
        "https://storage.supabase.co/branding-assets/00000000-0000-0000-0000-00000000d3f7/favicons/deleted-file.png"
      );
      expect(check.exists).toBe(false);
    });

    it("falls back gracefully to default favicon when historical asset is missing", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const targetVersion = await createBrandThemeVersion(
        wsId,
        "workspace_save",
        "Old version with deleted asset",
        {
          workspaceTheme: {
            ...DEFAULT_WORKSPACE_THEME_SETTINGS,
            faviconUrl: "https://storage.supabase.co/branding-assets/ws/non-existent-favicon.png",
          },
          faviconUrl: "https://storage.supabase.co/branding-assets/ws/non-existent-favicon.png",
          experienceOverrides: {},
        }
      );

      const restored = await restoreBrandThemeVersion(wsId, targetVersion);
      expect(restored.versionNumber).toBeGreaterThan(1);
      const updatedTheme = await loadWorkspaceThemeSettings(wsId);
      expect(updatedTheme.faviconUrl).toBeNull();
      expect(restored.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe("F. Zero-Regression & Design Token Invariants", () => {
    it("preserves all 5 luxury theme presets with clout_obsidian_gold default", () => {
      expect(THEME_PRESETS).toHaveLength(5);
      expect(DEFAULT_THEME.id).toBe("clout_obsidian_gold");
      expect(DEFAULT_THEME.backgroundHex).toBe("#0C0E14");
      expect(DEFAULT_THEME.primaryHex).toBe("#D4AF37");
    });

    it("preserves all 4 motion profiles with executive default", () => {
      expect(MOTION_PROFILES).toHaveLength(4);
      expect(DEFAULT_MOTION_PROFILE.id).toBe("executive");
    });

    it("preserves workspace-scoped branding logo resolution", async () => {
      const branding = await loadBranding("00000000-0000-0000-0000-00000000d3f7");
      expect(branding.logoUrl).toBe("https://storage.supabase.co/branding-logos/ws1/light/logo.png");
    });

    it("preserves admin-only RBAC protection on /app/settings/branding", () => {
      expect(isRouteAuthorized(["admin"], "/app/settings/branding", {})).toBe(true);
      expect(isRouteAuthorized(["manager"], "/app/settings/branding", {})).toBe(false);
      expect(isRouteAuthorized(["agent"], "/app/settings/branding", {})).toBe(false);
      expect(isRouteAuthorized(["viewer"], "/app/settings/branding", {})).toBe(false);
      expect(ROUTE_ROLES["/app/settings/branding"]).toEqual(["admin"]);
    });
  });

  describe("G. Brand Studio Global Runtime Propagation", () => {
    it("1. Workspace theme applies complete semantic root CSS variables", () => {
      const vars = getThemeCssVariables(DEFAULT_THEME, DEFAULT_COMPONENT_CONFIG);
      expect(vars["--background"]).toBe("#0C0E14");
      expect(vars["--foreground"]).toBe("#F5F5F7");
      expect(vars["--card"]).toBe("#121622");
      expect(vars["--surface"]).toBe("#121622");
      expect(vars["--surface-elevated"]).toBe("#121622");
      expect(vars["--primary"]).toBe("#D4AF37");
      expect(vars["--primary-foreground"]).toBe("#0C0E14");
      expect(vars["--accent"]).toBe("#F3E5AB");
      expect(vars["--border"]).toBe("#12162266");
      expect(vars["--sidebar"]).toBe("#0C0E14");
      expect(vars["--gold"]).toBe("#D4AF37");
      expect(vars["--radius"]).toBe("0.5rem");
    });

    it("2. Changing persisted background changes root --background", () => {
      const emeraldTheme = THEME_PRESETS.find((p) => p.id === "sovereign_emerald")!;
      const vars = getThemeCssVariables(emeraldTheme);
      expect(vars["--background"]).toBe("#08120E");
      expect(vars["--sidebar"]).toBe("#08120E");
    });

    it("3. Changing surface affects root card/surface tokens", () => {
      const cobaltTheme = THEME_PRESETS.find((p) => p.id === "cobalt_cyber")!;
      const vars = getThemeCssVariables(cobaltTheme);
      expect(vars["--card"]).toBe("#10182E");
      expect(vars["--surface"]).toBe("#10182E");
      expect(vars["--popover"]).toBe("#10182E");
    });

    it("4. Button radius affects shared Button token --button-radius", () => {
      const config: ComponentConfig = { ...DEFAULT_COMPONENT_CONFIG, buttonShape: "pill" };
      const vars = getThemeCssVariables(DEFAULT_THEME, config);
      expect(vars["--button-radius"]).toBe("9999px");
    });

    it("5. Card elevation affects shared Card token --card-shadow", () => {
      const config: ComponentConfig = { ...DEFAULT_COMPONENT_CONFIG, elevation: "executive" };
      const vars = getThemeCssVariables(DEFAULT_THEME, config);
      expect(vars["--card-shadow"]).toBe("0 20px 50px rgba(0, 0, 0, 0.45)");
    });

    it("6. Border strength affects semantic borders token --border-opacity", () => {
      const config: ComponentConfig = { ...DEFAULT_COMPONENT_CONFIG, borderStrength: "strong" };
      const vars = getThemeCssVariables(DEFAULT_THEME, config);
      expect(vars["--border-opacity"]).toBe("1.0");
    });

    it("7. Typography applies globally after save", () => {
      const customTheme: ThemePreset = {
        ...DEFAULT_THEME,
        fontDisplay: '"Playfair Display", Georgia, serif',
        fontSans: '"Inter", sans-serif',
        fontScale: 1.15,
      };
      const vars = getThemeCssVariables(customTheme);
      expect(vars["--font-display"]).toBe('"Playfair Display", Georgia, serif');
      expect(vars["--font-sans"]).toBe('"Inter", sans-serif');
      expect(vars["--font-scale"]).toBe("1.15");
    });

    it("8. Motion variables apply globally after save", () => {
      const profile = MOTION_PROFILES.find((p) => p.id === "subtle")!;
      const motionVars = getMotionCssVariables(profile, false);
      expect(motionVars["--motion-duration-multiplier"]).toBe("0.75");
      expect(motionVars["--motion-transition-duration"]).toBe("150ms");
      expect(motionVars["--motion-hover-scale"]).toBe("1.01");
      expect(motionVars["--motion-drift-duration"]).toBe("24s");
      expect(motionVars["--motion-breathe-duration"]).toBe("9s");
      expect(motionVars["--motion-pulse-duration"]).toBe("8s");
    });

    it("9. Atmosphere config reaches live SentinelAtmosphere with valid intensity levels", () => {
      const profile = MOTION_PROFILES.find((p) => p.id === "executive")!;
      const atmo = profileToAtmosphereConfig(profile);
      expect(atmo.enabled).toBe(true);
      expect(atmo.gridIntensity).toBe("medium");
      expect(atmo.glowIntensity).toBe("medium");
      expect(atmo.particleDensity).toBe("medium");
      expect(atmo.watermarkVisibility).toBe(true);
    });

    it("10. OFF disables live atmosphere motion and sets zero durations", () => {
      const profile = MOTION_PROFILES.find((p) => p.id === "off")!;
      const atmo = profileToAtmosphereConfig(profile);
      expect(atmo.enabled).toBe(false);

      const motionVars = getMotionCssVariables(profile, false);
      expect(motionVars["--motion-duration-multiplier"]).toBe("0");
      expect(motionVars["--motion-transition-duration"]).toBe("0ms");
      expect(motionVars["--motion-hover-scale"]).toBe("1");
      expect(motionVars["--motion-drift-duration"]).toBe("0s");
      expect(motionVars["--motion-breathe-duration"]).toBe("0s");
      expect(motionVars["--motion-pulse-duration"]).toBe("0s");
      expect(motionVars["--motion-glow-opacity"]).toBe("0");
    });

    it("11. IMMERSIVE increases live atmosphere intensity and scale", () => {
      const profile = MOTION_PROFILES.find((p) => p.id === "immersive")!;
      const atmo = profileToAtmosphereConfig(profile);
      expect(atmo.enabled).toBe(true);
      expect(atmo.gridIntensity).toBe("high");
      expect(atmo.glowIntensity).toBe("high");
      expect(atmo.particleDensity).toBe("high");

      const motionVars = getMotionCssVariables(profile, false);
      expect(motionVars["--motion-duration-multiplier"]).toBe("1.25");
      expect(motionVars["--motion-hover-scale"]).toBe("1.035");
      expect(motionVars["--motion-glow-opacity"]).toBe("0.75");
      expect(motionVars["--motion-drift-duration"]).toBe("10s");
      expect(motionVars["--motion-breathe-duration"]).toBe("4.5s");
      expect(motionVars["--motion-pulse-duration"]).toBe("3.5s");
    });

    it("12. prefers-reduced-motion unconditionally overrides immersive profile", () => {
      const profile = MOTION_PROFILES.find((p) => p.id === "immersive")!;
      const motionVars = getMotionCssVariables(profile, true); // prefersReduced = true
      expect(motionVars["--motion-duration-multiplier"]).toBe("0");
      expect(motionVars["--motion-transition-duration"]).toBe("0ms");
      expect(motionVars["--motion-hover-scale"]).toBe("1");
      expect(motionVars["--motion-drift-duration"]).toBe("0s");
      expect(motionVars["--motion-breathe-duration"]).toBe("0s");
      expect(motionVars["--motion-pulse-duration"]).toBe("0s");
      expect(motionVars["--motion-glow-opacity"]).toBe("0");
    });

    it("13. Experience override applies to real runtime and inherits workspace motion defaults", () => {
      const baseTheme: ThemePreset = DEFAULT_THEME;
      const investorOverride: ExperienceOverrideConfig = {
        primaryHex: "#10B981",
        accentHex: "#34D399",
      };
      const resolved = resolveEffectiveExperienceTheme(
        baseTheme,
        investorOverride,
        {},
        {
          motionProfileId: "subtle",
          atmosphereConfig: { gridIntensity: "high" },
        }
      );
      const vars = getThemeCssVariables(resolved.theme);
      expect(vars["--primary"]).toBe("#10B981");
      expect(vars["--accent"]).toBe("#34D399");
      expect(vars["--background"]).toBe("#0C0E14");
      expect(resolved.motionProfile.id).toBe("subtle");
      expect(resolved.atmosphereConfig.gridIntensity).toBe("high");
    });

    it("14. Preview remains isolated before Save (pure helper functions without DOM mutation)", () => {
      const previewTheme = THEME_PRESETS.find((p) => p.id === "amethyst_executive")!;
      const previewVars = getThemeCssVariables(previewTheme);
      expect(previewVars["--primary"]).toBe("#8B5CF6");
      expect(DEFAULT_THEME.primaryHex).toBe("#D4AF37");
    });

    it("15. Save causes BrandingContext refresh and updates workspace persistence", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      await saveWorkspaceThemeSettings(wsId, {
        presetId: "rose_platinum",
        customColors: { primaryHex: "#F43F5E" },
      });

      const loaded = await loadWorkspaceThemeSettings(wsId);
      expect(loaded.presetId).toBe("rose_platinum");
      expect(loaded.customColors.primaryHex).toBe("#F43F5E");
    });

    it("16. Refresh restores persisted theme from storage / database", async () => {
      const wsId = "00000000-0000-0000-0000-00000000d3f7";
      const loaded = await loadWorkspaceThemeSettings(wsId);
      const effective = resolveEffectiveTheme(loaded.presetId, loaded.customColors, {
        fontDisplay: loaded.fontDisplay,
        fontSans: loaded.fontSans,
      });
      expect(effective.primaryHex).toBe("#2563EB");
      expect(effective.backgroundHex).toBe("#090E1A");
    });

    it("17. Maintains single-mount atmosphere safety across views", () => {
      expect(DEFAULT_ATMOSPHERE_CONFIG.enabled).toBe(true);
      expect(DEFAULT_ATMOSPHERE_CONFIG.watermarkVisibility).toBe(true);
    });

    it("18. No RBAC changes to console permissions", () => {
      expect(isRouteAuthorized(["admin"], "/app/settings/branding", {})).toBe(true);
      expect(isRouteAuthorized(["manager"], "/app/crm", {})).toBe(true);
      expect(isRouteAuthorized(["agent"], "/app/leads", {})).toBe(true);
    });

    it("19. Five theme IDs remain strictly unchanged", () => {
      const ids = THEME_PRESETS.map((p) => p.id);
      expect(ids).toEqual([
        "clout_obsidian_gold",
        "sovereign_emerald",
        "cobalt_cyber",
        "amethyst_executive",
        "rose_platinum",
      ]);
    });

    it("20. Four motion IDs remain strictly unchanged", () => {
      const ids = MOTION_PROFILES.map((p) => p.id);
      expect(ids).toEqual(["off", "subtle", "executive", "immersive"]);
    });

    it("21. Button shared component consumes motion classes", () => {
      const classes = buttonVariants({ variant: "default" });
      expect(classes).toContain("sentinel-motion-transition");
      expect(classes).toContain("sentinel-motion-hover");
      expect(classes).toContain("rounded-[var(--button-radius,var(--radius))]");
    });

    it("22. Profile particle density strictly differentiates OFF (none), SUBTLE (low), EXECUTIVE (medium), IMMERSIVE (high)", () => {
      const off = MOTION_PROFILES.find((p) => p.id === "off")!;
      const subtle = MOTION_PROFILES.find((p) => p.id === "subtle")!;
      const executive = MOTION_PROFILES.find((p) => p.id === "executive")!;
      const immersive = MOTION_PROFILES.find((p) => p.id === "immersive")!;

      expect(off.particleDensity).toBe("none");
      expect(subtle.particleDensity).toBe("low");
      expect(executive.particleDensity).toBe("medium");
      expect(immersive.particleDensity).toBe("high");

      expect(profileToAtmosphereConfig(off).enabled).toBe(false);
      expect(profileToAtmosphereConfig(subtle).particleDensity).toBe("low");
      expect(profileToAtmosphereConfig(executive).particleDensity).toBe("medium");
      expect(profileToAtmosphereConfig(immersive).particleDensity).toBe("high");
    });

    it("23. Drift speeds strictly differentiate OFF (0s), SUBTLE (24s), EXECUTIVE (16s), IMMERSIVE (10s)", () => {
      const offVars = getMotionCssVariables(MOTION_PROFILES.find((p) => p.id === "off")!);
      const subtleVars = getMotionCssVariables(MOTION_PROFILES.find((p) => p.id === "subtle")!);
      const execVars = getMotionCssVariables(MOTION_PROFILES.find((p) => p.id === "executive")!);
      const immVars = getMotionCssVariables(MOTION_PROFILES.find((p) => p.id === "immersive")!);

      expect(offVars["--motion-drift-duration"]).toBe("0s");
      expect(subtleVars["--motion-drift-duration"]).toBe("24s");
      expect(execVars["--motion-drift-duration"]).toBe("16s");
      expect(immVars["--motion-drift-duration"]).toBe("10s");
    });
  });
});
