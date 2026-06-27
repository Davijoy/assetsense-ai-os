import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Phase 1 default workspace; pinned in the migration.
export const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-00000000d3f7";

export type WorkspaceCategory = "INTERNAL" | "CUSTOMER" | "PARTNER";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  category: WorkspaceCategory;
  type: string;
  settings: Record<string, unknown>;
};

export type Membership = {
  workspaceId: string;
  roleId: string;
  isPrimary: boolean;
};

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

/**
 * Resolve the active workspace for the signed-in caller. The DB function
 * picks the primary membership, or the oldest active membership when no
 * primary is set. Returns null when the user has no membership.
 */
export async function getCurrentWorkspaceId(
  supabase: AnySupabase,
): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc("current_workspace_id");
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function listMyMemberships(
  supabase: AnySupabase,
  userId: string,
): Promise<Membership[]> {
  const { data, error } = await (supabase as any)
    .from("workspace_members")
    .select("workspace_id, role_id, is_primary, status")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    workspaceId: r.workspace_id,
    roleId: r.role_id,
    isPrimary: !!r.is_primary,
  }));
}

export async function getWorkspace(
  supabase: AnySupabase,
  workspaceId: string,
): Promise<Workspace | null> {
  const { data, error } = await (supabase as any)
    .from("workspaces")
    .select("id, name, slug, category, type, settings")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    category: data.category,
    type: data.type,
    settings: (data.settings ?? {}) as Record<string, unknown>,
  };
}