/**
 * SENTINEL FORT — Dynamic Theme & Typography Studio Engine
 */

export interface ThemePreset {
  id: string;
  name: string;
  badge: string;
  backgroundHex: string;
  surfaceHex: string;
  primaryHex: string;
  accentHex: string;
  fontDisplay: string;
  fontSans: string;
  radius: string;
  fontScale: number;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "clout_obsidian_gold",
    name: "Clout Obsidian & Gold",
    badge: "Default Luxury",
    backgroundHex: "#0C0E14",
    surfaceHex: "#121622",
    primaryHex: "#D4AF37",
    accentHex: "#F3E5AB",
    fontDisplay: '"Instrument Serif", ui-serif, Georgia, serif',
    fontSans: '"Work Sans", ui-sans-serif, system-ui, sans-serif',
    radius: "0.5rem",
    fontScale: 1.0,
  },
  {
    id: "sovereign_emerald",
    name: "Sovereign Emerald",
    badge: "High Growth",
    backgroundHex: "#08120E",
    surfaceHex: "#0E1F18",
    primaryHex: "#10B981",
    accentHex: "#34D399",
    fontDisplay: '"Space Grotesk", system-ui, sans-serif',
    fontSans: '"Inter", ui-sans-serif, system-ui, sans-serif',
    radius: "0.625rem",
    fontScale: 1.0,
  },
  {
    id: "cobalt_cyber",
    name: "Cobalt Sovereign",
    badge: "Fintech Grade",
    backgroundHex: "#090E1A",
    surfaceHex: "#10182E",
    primaryHex: "#3B82F6",
    accentHex: "#60A5FA",
    fontDisplay: '"Inter", system-ui, sans-serif',
    fontSans: '"Inter", ui-sans-serif, system-ui, sans-serif',
    radius: "0.5rem",
    fontScale: 1.0,
  },
  {
    id: "amethyst_executive",
    name: "Amethyst Executive",
    badge: "Prestige Tier",
    backgroundHex: "#10091A",
    surfaceHex: "#1C112E",
    primaryHex: "#8B5CF6",
    accentHex: "#A78BFA",
    fontDisplay: '"Playfair Display", Georgia, serif',
    fontSans: '"Plus Jakarta Sans", system-ui, sans-serif',
    radius: "0.75rem",
    fontScale: 1.0,
  },
  {
    id: "rose_platinum",
    name: "Rose Platinum",
    badge: "Bespoke",
    backgroundHex: "#14090F",
    surfaceHex: "#22111A",
    primaryHex: "#F43F5E",
    accentHex: "#FB7185",
    fontDisplay: '"Instrument Serif", ui-serif, Georgia, serif',
    fontSans: '"Outfit", system-ui, sans-serif',
    radius: "0.5rem",
    fontScale: 1.0,
  },
];

export const FONT_DISPLAY_OPTIONS = [
  { id: "instrument_serif", label: "Instrument Serif (Editorial Luxury)", value: '"Instrument Serif", ui-serif, Georgia, serif' },
  { id: "playfair", label: "Playfair Display (High Prestige)", value: '"Playfair Display", Georgia, serif' },
  { id: "space_grotesk", label: "Space Grotesk (Tech Modern)", value: '"Space Grotesk", system-ui, sans-serif' },
  { id: "inter_display", label: "Inter Display (Clean Minimal)", value: '"Inter", system-ui, sans-serif' },
  { id: "jetbrains_mono", label: "JetBrains Mono (Obsidian Terminal)", value: '"JetBrains Mono", monospace' },
];

export const FONT_SANS_OPTIONS = [
  { id: "work_sans", label: "Work Sans", value: '"Work Sans", ui-sans-serif, system-ui, sans-serif' },
  { id: "inter", label: "Inter", value: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: "plus_jakarta", label: "Plus Jakarta Sans", value: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { id: "outfit", label: "Outfit", value: '"Outfit", system-ui, sans-serif' },
  { id: "system_ui", label: "System UI", value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
];

export const RADIUS_OPTIONS = [
  { id: "sharp", label: "Sharp (4px)", value: "0.25rem" },
  { id: "sleek", label: "Luxury Sleek (8px)", value: "0.5rem" },
  { id: "curved", label: "Modern Curved (12px)", value: "0.75rem" },
  { id: "soft", label: "Pill Soft (20px)", value: "1.25rem" },
];

export const FONT_SCALE_OPTIONS = [
  { id: "0.90", label: "Compact (90%)", value: 0.9 },
  { id: "0.95", label: "Subtle (95%)", value: 0.95 },
  { id: "1.00", label: "Standard (100%)", value: 1.0 },
  { id: "1.05", label: "Comfortable (105%)", value: 1.05 },
  { id: "1.10", label: "Large (110%)", value: 1.1 },
  { id: "1.15", label: "Executive (115%)", value: 1.15 },
];

export type ElevationLevel = "flat" | "subtle" | "elevated" | "executive";
export type BorderStrength = "minimal" | "subtle" | "standard" | "strong";
export type ButtonShape = "sharp" | "sleek" | "rounded" | "pill";
export type DensityLevel = "compact" | "comfortable" | "spacious";
export type GlassEffect = "none" | "subtle" | "executive";

export interface ComponentConfig {
  elevation: ElevationLevel;
  borderStrength: BorderStrength;
  buttonShape: ButtonShape;
  density: DensityLevel;
  glassEffect: GlassEffect;
}

export const DEFAULT_COMPONENT_CONFIG: ComponentConfig = {
  elevation: "subtle",
  borderStrength: "standard",
  buttonShape: "sleek",
  density: "comfortable",
  glassEffect: "subtle",
};

export const ELEVATION_OPTIONS = [
  { id: "flat", label: "Flat (No Shadow)", shadow: "none" },
  { id: "subtle", label: "Subtle Depth", shadow: "0 2px 8px rgba(0, 0, 0, 0.18)" },
  { id: "elevated", label: "Elevated Shadow", shadow: "0 10px 30px rgba(0, 0, 0, 0.28)" },
  { id: "executive", label: "Executive Prestige", shadow: "0 20px 50px rgba(0, 0, 0, 0.45)" },
];

export const BORDER_STRENGTH_OPTIONS = [
  { id: "minimal", label: "Minimal (30%)", opacity: "0.3" },
  { id: "subtle", label: "Subtle (50%)", opacity: "0.5" },
  { id: "standard", label: "Standard (70%)", opacity: "0.7" },
  { id: "strong", label: "High Contrast (100%)", opacity: "1.0" },
];

export const BUTTON_SHAPE_OPTIONS = [
  { id: "sharp", label: "Sharp Box (2px)", radius: "0.125rem" },
  { id: "sleek", label: "Sleek (6px)", radius: "0.375rem" },
  { id: "rounded", label: "Rounded (8px)", radius: "0.5rem" },
  { id: "pill", label: "Pill (Full)", radius: "9999px" },
];

export const DENSITY_OPTIONS = [
  { id: "compact", label: "High Density (Compact)", multiplier: "0.875" },
  { id: "comfortable", label: "Comfortable (Standard)", multiplier: "1.0" },
  { id: "spacious", label: "Spacious (Executive)", multiplier: "1.15" },
];

export const GLASS_OPTIONS = [
  { id: "none", label: "Solid Backgrounds (No Blur)", blur: "0px", bgOpacity: "1.0" },
  { id: "subtle", label: "Subtle Glass (8px Blur)", blur: "8px", bgOpacity: "0.85" },
  { id: "executive", label: "Executive Frosted (16px Blur)", blur: "16px", bgOpacity: "0.7" },
];

export const DEFAULT_THEME: ThemePreset = THEME_PRESETS[0];

const STORAGE_THEME_KEY = "sentinel_custom_theme_config_v1";

export function loadSavedTheme(): ThemePreset {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(STORAGE_THEME_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.primaryHex) return parsed;
  } catch (e) {
    console.warn("Failed to read theme config:", e);
  }
  return DEFAULT_THEME;
}

export function saveThemeConfig(theme: ThemePreset): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_THEME_KEY, JSON.stringify(theme));
    applyThemeToDOM(theme);
  } catch (e) {
    console.error("Failed to save theme config:", e);
  }
}

export function getThemeCssVariables(
  theme: ThemePreset = DEFAULT_THEME,
  components: ComponentConfig = DEFAULT_COMPONENT_CONFIG
): Record<string, string> {
  const vars: Record<string, string> = {};
  if (theme.fontDisplay) vars["--font-display"] = theme.fontDisplay;
  if (theme.fontSans) vars["--font-sans"] = theme.fontSans;
  if (theme.radius) vars["--radius"] = theme.radius;
  if (theme.fontScale) vars["--font-scale"] = String(theme.fontScale);
  if (theme.primaryHex) {
    vars["--primary-hex"] = theme.primaryHex;
    vars["--gold"] = (theme as any).goldHex || theme.primaryHex;
  }
  if (theme.backgroundHex) vars["--bg-custom"] = theme.backgroundHex;
  if (theme.surfaceHex) vars["--surface-custom"] = theme.surfaceHex;
  if (theme.accentHex) vars["--accent-custom"] = theme.accentHex;
  if ((theme as any).borderHex) vars["--border-custom"] = (theme as any).borderHex;
  if ((theme as any).foregroundHex) vars["--foreground-custom"] = (theme as any).foregroundHex;

  // Component Tokens
  const elevation = ELEVATION_OPTIONS.find((e) => e.id === components.elevation);
  if (elevation) vars["--card-shadow"] = elevation.shadow;

  const border = BORDER_STRENGTH_OPTIONS.find((b) => b.id === components.borderStrength);
  if (border) vars["--border-opacity"] = border.opacity;

  const btn = BUTTON_SHAPE_OPTIONS.find((b) => b.id === components.buttonShape);
  if (btn) vars["--button-radius"] = btn.radius;

  const density = DENSITY_OPTIONS.find((d) => d.id === components.density);
  if (density) vars["--density-scale"] = density.multiplier;

  const glass = GLASS_OPTIONS.find((g) => g.id === components.glassEffect);
  if (glass) {
    vars["--glass-blur"] = glass.blur;
    vars["--glass-opacity"] = glass.bgOpacity;
  }

  return vars;
}

export function applyThemeToElement(
  element: HTMLElement,
  theme: ThemePreset = DEFAULT_THEME,
  components: ComponentConfig = DEFAULT_COMPONENT_CONFIG
): void {
  const vars = getThemeCssVariables(theme, components);
  for (const [key, value] of Object.entries(vars)) {
    element.style.setProperty(key, value);
  }
}

export function applyThemeToDOM(
  theme: ThemePreset = DEFAULT_THEME,
  components: ComponentConfig = DEFAULT_COMPONENT_CONFIG
): void {
  if (typeof document === "undefined") return;
  applyThemeToElement(document.documentElement, theme, components);
}

/**
 * Calculates WCAG 2.1 relative luminance contrast ratio between two hex colors.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length !== 6) return 0.5;
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const [rr, gg, bb] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
  };

  try {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch {
    return 4.5;
  }
}
