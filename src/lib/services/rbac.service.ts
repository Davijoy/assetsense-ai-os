import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabase = SupabaseClient<any, any, any>;

/**
 * Permission codes defined in the Phase 1 seed. Extend in lockstep with the
 * `permissions` table.
 */
export type PermissionCode =
  | "workspace.read"
  | "workspace.admin"
  | "leads.read"
  | "leads.write"
  | "properties.read"
  | "properties.write"
  | "calls.read"
  | "deals.read"
  | "deals.write"
  | "documents.read"
  | "documents.write"
  | "branding.write"
  | "ai.invoke"
  | "ai.approve"
  | "audit.read"
  | "flags.write";

export async function hasPermission(
  supabase: AnySupabase,
  userId: string,
  permission: PermissionCode,
): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc("has_permission", {
    _user_id: userId,
    _perm: permission,
  });
  if (error) throw error;
  return data === true;
}

export async function requirePermission(
  supabase: AnySupabase,
  userId: string,
  permission: PermissionCode,
): Promise<void> {
  if (!(await hasPermission(supabase, userId, permission))) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }
}