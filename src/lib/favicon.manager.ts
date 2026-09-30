/**
 * Favicon Manager for Sentinel Fort Brand Studio.
 * Safely updates document favicon at runtime with seamless fallback.
 */

export const DEFAULT_FAVICON_URL = "/favicon.ico";

export function setRuntimeFavicon(url?: string | null): void {
  if (typeof document === "undefined") return;

  const targetUrl = url && url.trim() ? url.trim() : DEFAULT_FAVICON_URL;
  
  // Find or create favicon link element
  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "shortcut icon";
    document.head.appendChild(link);
  }

  link.href = targetUrl;
}
