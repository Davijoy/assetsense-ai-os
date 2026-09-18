import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Phase 1 default workspace; pinned in the migration.
export const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-00000000d3f7";

export type WorkspaceCategory = "INTERNAL" | "CUSTOMER" | "PARTNER";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  category: WorkspaceCategory;
  type: string;
  settings: { [key: string]: JsonValue };
};

export type Membership = {
  workspaceId: string;
  roleId: string;
  isPrimary: boolean;
};

/** Membership row including status and the System A role name. */
export type MembershipRecord = {
  workspaceId: string;
  roleId: string;
  roleName: string | null;
  status: "active" | "invited" | "suspended";
  isPrimary: boolean;
};

/**
 * Workspace identity for display. `publicId` is the human-facing FORT
 * identifier (FORT-XXX0990) added by 20260824120000.
 *
 * SECURITY: publicId is CONTEXTUAL IDENTITY ONLY — never an authorization
 * claim, never accepted as proof of membership, and never used in a lookup
 * that decides access. The UUID remains the database identity.
 */
export type WorkspaceIdentity = {
  id: string;
  publicId: string | null;
  name: string;
  slug: string;
  category: WorkspaceCategory;
  type: string;
  isPrivate: boolean;
};

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

const SYSTEM_ROLE_MAP: Record<string, string> = {
  "00000000-0000-0000-0000-0000000ad301": "platform_admin",
  "00000000-0000-0000-0000-0000000ad302": "member",
  "00000000-0000-0000-0000-0000000ad303": "viewer",
};

/**
 * Resolve the active workspace for the signed-in caller. The DB function
 * picks the primary membership, or the oldest active membership when no
 * primary is set. Returns null when the user has no membership.
 */
export async function getCurrentWorkspaceId(
  supabase: AnySupabase,
  userId?: string,
): Promise<string | null> {
  const timeoutMs = 2500;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("getCurrentWorkspaceId timeout")), timeoutMs)
    );
    const { data, error } = await Promise.race([
      (supabase as any).rpc("current_workspace_id"),
      timeout,
    ]);
    if (!error && data) return (data as string | null) ?? null;
  } catch {}

  // Direct table query fallback if RPC is unavailable
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("getCurrentWorkspaceId query timeout")), 2000)
    );
    let query = (supabase as any)
      .from("workspace_members")
      .select("workspace_id")
      .eq("status", "active");
    if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await Promise.race([
      query
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      timeout,
    ]);
    if (!error && data?.workspace_id) return data.workspace_id;
  } catch {}

  return null;
}

export async function listMyMemberships(
  supabase: AnySupabase,
  userId: string,
): Promise<Membership[]> {
  const timeoutMs = 2500;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("listMyMemberships timeout")), timeoutMs)
    );
    const { data, error } = await Promise.race([
      (supabase as any)
        .from("workspace_members")
        .select("workspace_id, role_id, is_primary, status")
        .eq("user_id", userId)
        .eq("status", "active"),
      timeout,
    ]);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      workspaceId: r.workspace_id,
      roleId: r.role_id,
      isPrimary: !!r.is_primary,
    }));
  } catch {
    return [];
  }
}

/**
 * All memberships for the caller, including non-active ones.
 *
 * `listMyMemberships` deliberately returns only ACTIVE rows (it drives the
 * workspace switcher). The FORT resolver additionally needs to distinguish
 * "no membership at all" from "invitation pending / suspended", because those
 * two states must never be auto-provisioned into a private workspace.
 *
 * RLS ("members read own workspace") scopes this to the caller's own rows.
 */
export async function listMembershipRecords(
  supabase: AnySupabase,
  userId: string,
): Promise<MembershipRecord[]> {
  const timeoutMs = 2500;
  let data: any = null;
  let error: any = null;

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("listMembershipRecords timeout")), timeoutMs)
    );
    const res = await Promise.race([
      (supabase as any)
        .from("workspace_members")
        .select("workspace_id, role_id, is_primary, status, roles(name)")
        .eq("user_id", userId),
      timeout,
    ]);
    data = res.data;
    error = res.error;
  } catch (e) {
    error = e;
  }

  // Fallback if roles(name) join failed or timed out
  if (error || !data) {
    try {
      const fallbackTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("listMembershipRecords fallback timeout")), 2000)
      );
      const res = await Promise.race([
        (supabase as any)
          .from("workspace_members")
          .select("workspace_id, role_id, is_primary, status")
          .eq("user_id", userId),
        fallbackTimeout,
      ]);
      if (!res.error && res.data) {
        data = res.data;
        error = null;
      }
    } catch {}
  }

  if (error) {
    console.warn("[workspace.service] listMembershipRecords query failed/timed out:", error);
    return [];
  }

  return (data ?? []).map((r: any) => {
    let roleName: string | null = null;
    if (r.roles) {
      roleName = Array.isArray(r.roles) ? r.roles[0]?.name ?? null : r.roles.name ?? null;
    }
    if (!roleName && r.role_id && SYSTEM_ROLE_MAP[r.role_id]) {
      roleName = SYSTEM_ROLE_MAP[r.role_id];
    }
    return {
      workspaceId: r.workspace_id,
      roleId: r.role_id,
      roleName,
      status: (r.status as MembershipRecord["status"]) ?? "active",
      isPrimary: !!r.is_primary,
    };
  });
}

export async function getWorkspace(
  supabase: AnySupabase,
  workspaceId: string,
): Promise<Workspace | null> {
  const timeoutMs = 2500;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("getWorkspace timeout")), timeoutMs)
    );
    const { data, error } = await Promise.race([
      (supabase as any)
        .from("workspaces")
        .select("id, name, slug, category, type, settings")
        .eq("id", workspaceId)
        .maybeSingle(),
      timeout,
    ]);
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      category: data.category,
      type: data.type,
      settings: (data.settings ?? {}) as { [key: string]: JsonValue },
    };
  } catch {
    return null;
  }
}

/**
 * Workspace identity including the human-facing FORT public id.
 *
 * RLS ("workspaces self-read") already restricts this row to workspaces the
 * caller is a member of — the query cannot read another tenant's identity.
 *
 * Degrades gracefully when 20260824120000 has not been applied yet: the
 * public_id select is retried without that column and `publicId` comes back
 * null, so the FORT surface keeps rendering on an unmigrated database.
 */
export async function getWorkspaceIdentity(
  supabase: AnySupabase,
  workspaceId: string,
): Promise<WorkspaceIdentity | null> {
  const timeoutMs = 2500;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("getWorkspaceIdentity timeout")), timeoutMs)
    );
    const withPublicId = await Promise.race([
      (supabase as any)
        .from("workspaces")
        .select("id, name, slug, category, type, settings, public_id")
        .eq("id", workspaceId)
        .maybeSingle(),
      timeout,
    ]);

    if (!withPublicId.error && withPublicId.data) {
      return toIdentity(withPublicId.data);
    }
  } catch {}

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("getWorkspaceIdentity base timeout")), 2000)
    );
    const base = await Promise.race([
      getWorkspace(supabase, workspaceId),
      timeout,
    ]);
    return base ? toIdentity({ ...base, public_id: null }) : null;
  } catch {}

  return null;
}

function toIdentity(row: any): WorkspaceIdentity {
  const settings = (row.settings ?? {}) as { [key: string]: JsonValue };
  return {
    id: row.id,
    publicId: (row.public_id as string | null) ?? null,
    name: row.name,
    slug: row.slug,
    category: row.category,
    type: row.type,
    isPrivate: settings.private === true,
  };
}

/**
 * Provision a private FORT workspace for the AUTHENTICATED caller.
 *
 * Delegates entirely to `public.provision_fort_workspace()` (20260824120001),
 * which derives the subject from `auth.uid()` and takes NO arguments — so no
 * caller can provision, join or elevate another user, and no workspace id can
 * be supplied from the client.
 *
 * The DB function is idempotent (an existing active membership is returned
 * as-is) and returns null when provisioning cannot be safely determined —
 * a pending invitation or suspended membership.
 */
export async function provisionFortWorkspace(
  supabase: AnySupabase,
): Promise<string | null> {
  const timeoutMs = 3000;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("provisionFortWorkspace timeout")), timeoutMs)
    );
    const { data, error } = await Promise.race([
      (supabase as any).rpc("provision_fort_workspace"),
      timeout,
    ]);
    if (error) {
      console.warn("[workspace.service] provision_fort_workspace RPC returned error:", error);
      return null;
    }
    return (data as string | null) ?? null;
  } catch (e) {
    console.warn("[workspace.service] provision_fort_workspace threw/timed out:", e);
    return null;
  }
}
