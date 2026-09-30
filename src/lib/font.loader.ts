/**
 * Dynamic Font Loader for Sentinel Fort Brand Studio.
 * Loads required Google Fonts stylesheets on-demand with deduplication and caching.
 */

const LOADED_FONTS = new Set<string>([
  "instrument_serif",
  "work_sans",
  "system_ui",
]);

const GOOGLE_FONT_URLS: Record<string, string> = {
  playfair: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap",
  space_grotesk: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap",
  inter_display: "https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap",
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap",
  jetbrains_mono: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..700&display=swap",
  plus_jakarta: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&display=swap",
  outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@300..800&display=swap",
};

export function getFontIdFromValue(fontValue: string): string | null {
  const lower = fontValue.toLowerCase();
  if (lower.includes("instrument serif")) return "instrument_serif";
  if (lower.includes("playfair")) return "playfair";
  if (lower.includes("space grotesk")) return "space_grotesk";
  if (lower.includes("jetbrains mono")) return "jetbrains_mono";
  if (lower.includes("plus jakarta")) return "plus_jakarta";
  if (lower.includes("outfit")) return "outfit";
  if (lower.includes("work sans")) return "work_sans";
  if (lower.includes("inter")) return "inter";
  if (lower.includes("system-ui")) return "system_ui";
  return null;
}

export function ensureFontLoaded(fontIdOrValue: string): void {
  if (typeof document === "undefined") return;

  const fontId = getFontIdFromValue(fontIdOrValue) || fontIdOrValue;
  if (!fontId || LOADED_FONTS.has(fontId) || fontId === "system_ui") return;

  const url = GOOGLE_FONT_URLS[fontId];
  if (!url) return;

  const existingElement = document.getElementById(`sentinel-font-${fontId}`);
  if (existingElement) {
    LOADED_FONTS.add(fontId);
    return;
  }

  const link = document.createElement("link");
  link.id = `sentinel-font-${fontId}`;
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
  LOADED_FONTS.add(fontId);
}

export function loadFontsForFamilyPair(displayFont: string, bodyFont: string): void {
  ensureFontLoaded(displayFont);
  ensureFontLoaded(bodyFont);
}
