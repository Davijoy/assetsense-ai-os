import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'
import { getStoredSupabaseSession } from './auth-storage'

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      // transient network failure
    }
    if (!token && typeof window !== 'undefined') {
      try {
        const stored = getStoredSupabaseSession();
        if (stored) {
          token = Array.isArray(stored) ? stored[0] : (stored.access_token || stored.token);
        }
      } catch {}
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
