import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabase = SupabaseClient<any, any, any>;

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

// In-memory feature flag store with all primary Sentinel Fort modules
export const FEATURE_FLAGS_STORE: Record<string, boolean> = {
  crm: true,
  leads: true,
  inventory: true,
  marketplace: true,
  marketing: true,
  intelligence: true,
  messages: true,
  branding: true,
  chat: true,
  supreme_intelligence: true,
  voice: true,
  collections: true,
};

export async function listFlags(
  supabase: AnySupabase,
  workspaceId: string,
): Promise<FeatureFlag[]> {
  const { data, error } = await (supabase as any)
    .from("feature_flags")
    .select("flag_key, enabled, config")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    key: r.flag_key,
    enabled: !!r.enabled,
    config: (r.config ?? {}) as Record<string, unknown>,
  }));
}

export async function isFlagEnabled(
  supabase: AnySupabase,
  workspaceId: string,
  key: string,
): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .from("feature_flags")
    .select("enabled")
    .eq("workspace_id", workspaceId)
    .eq("flag_key", key)
    .maybeSingle();
  if (error) throw error;
  if (data && typeof data.enabled === "boolean") {
    return data.enabled;
  }
  return FEATURE_FLAGS_STORE[key] ?? true;
}

/**
 * Authoritative feature flag resolution for workspace context.
 * Reads in-memory store merged with any workspace-level persistence.
 */
export async function getEffectiveFeatureFlags(
  supabase: AnySupabase,
  workspaceId?: string | null,
): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = { ...FEATURE_FLAGS_STORE };
  if (!workspaceId) return flags;

  try {
    const rows = await listFlags(supabase, workspaceId);
    for (const r of rows) {
      flags[r.key] = r.enabled;
    }
  } catch (err) {
    // Non-fatal if table not present or empty in development
  }

  return flags;
}