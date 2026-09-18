/**
 * Supabase Auth Storage & Session Helper
 *
 * Environment-driven: reads Project Reference and session from active environment.
 * NEVER hardcodes any production or fallback Supabase project reference.
 */

/**
 * Returns the configured Supabase Project Reference from environment.
 * Returns null when no Supabase project configuration is present.
 */
export function getSupabaseProjectRef(): string | null {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.SUPABASE_PROJECT_ID) return process.env.SUPABASE_PROJECT_ID;
    if (process.env.VITE_SUPABASE_PROJECT_ID) return process.env.VITE_SUPABASE_PROJECT_ID;
    if (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) {
      try {
        const url = new URL(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!);
        const ref = url.hostname.split(".")[0];
        if (ref && ref !== "localhost" && ref !== "127") return ref;
      } catch {}
    }
  }
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    const env = (import.meta as any).env;
    if (env.VITE_SUPABASE_PROJECT_ID) return env.VITE_SUPABASE_PROJECT_ID;
    if (env.VITE_SUPABASE_URL) {
      try {
        const url = new URL(env.VITE_SUPABASE_URL);
        const ref = url.hostname.split(".")[0];
        if (ref && ref !== "localhost" && ref !== "127") return ref;
      } catch {}
    }
  }
  return null;
}

/**
 * Retrieves the raw Supabase auth token string from localStorage if present.
 */
export function getStoredSupabaseToken(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const projectRef = getSupabaseProjectRef();
  if (projectRef) {
    const direct = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (direct) return direct;
  }
  // Dynamic fallback: look for any sb-*-auth-token key
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const item = localStorage.getItem(key);
        if (item) return item;
      }
    }
  } catch {}
  return null;
}

/**
 * Retrieves the parsed Supabase session object from localStorage if present.
 */
export function getStoredSupabaseSession(): any | null {
  const raw = getStoredSupabaseToken();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists a Supabase session to localStorage using the configured project reference.
 */
export function saveStoredSupabaseSession(session: any): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const projectRef = getSupabaseProjectRef();
    const raw = JSON.stringify(session);
    if (projectRef) {
      localStorage.setItem(`sb-${projectRef}-auth-token`, raw);
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("sentinel-auth-change"));
  } catch (e) {
    console.error("[auth-storage] Failed to save local session to storage:", e);
  }
}

/**
 * Clears stored Supabase session tokens from localStorage.
 */
export function clearStoredSupabaseSession(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const projectRef = getSupabaseProjectRef();
    if (projectRef) {
      localStorage.removeItem(`sb-${projectRef}-auth-token`);
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("sentinel-auth-change"));
  } catch (e) {
    console.warn("[auth-storage] Error clearing stored session:", e);
  }
}
