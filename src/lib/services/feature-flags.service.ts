import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabase = SupabaseClient<any, any, any>;

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
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
  return data?.enabled === true;
}