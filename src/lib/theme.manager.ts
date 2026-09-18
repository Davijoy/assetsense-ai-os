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

const STORAGE_THEME_KEY = "sentinel_custom_theme_config_v1";

export function loadSavedTheme(): ThemePreset {
  if (typeof window === "undefined") return THEME_PRESETS[0];
  try {
    const raw = localStorage.getItem(STORAGE_THEME_KEY);
    if (!raw) return THEME_PRESETS[0];
    const parsed = JSON.parse(raw);
    if (parsed && parsed.primaryHex) return parsed;
  } catch (e) {
    console.warn("Failed to read theme config:", e);
  }
  return THEME_PRESETS[0];
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

export function applyThemeToDOM(theme: ThemePreset): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  root.style.setProperty("--font-display", theme.fontDisplay);
  root.style.setProperty("--font-sans", theme.fontSans);
  root.style.setProperty("--radius", theme.radius);

  if (theme.primaryHex) {
    root.style.setProperty("--primary-hex", theme.primaryHex);
    root.style.setProperty("--gold", theme.primaryHex);
  }
  if (theme.backgroundHex) {
    root.style.setProperty("--bg-custom", theme.backgroundHex);
  }
}
