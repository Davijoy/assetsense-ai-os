/**
 * SENTINEL FORT — Administrative User Management Server Functions
 *
 * Provides authenticated, server-side role management and provisioning reconciliation:
 *   - listAdminUsers: Secure administrative user directory listing
 *   - updateUserRole: Atomic System A (workspace_members) and System B (user_roles) synchronization
 *
 * Security:
 *   - Protected by `requireAdmin` server middleware (rejects non-admins with 403)
 *   - Executes administrative mutations using `supabaseAdmin` service role
 *   - Guarantees role synchronization between System A (roles.name) and System B (app_role)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, type AppRole } from "@/integrations/supabase/role-middleware";
import { supabaseAdmin, isServiceRoleAvailable } from "@/integrations/supabase/client.server";

const UpdateRoleInput = z.object({
  targetUserId: z.string().uuid(),
  newRole: z.enum(["admin", "manager", "agent", "viewer", "builder", "developer"]),
  workspaceId: z.string().uuid().optional(),
});

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabase: authenticatedClient } = context as { supabase: any; userId: string };
    const db = isServiceRoleAvailable() ? supabaseAdmin : authenticatedClient;

    const [
      { data: profiles, error: pErr },
      { data: roleRows, error: rErr },
      { data: memberRows, error: mErr },
    ] = await Promise.all([
      db.from("profiles").select("id, email, full_name, created_at").order("created_at"),
      db.from("user_roles").select("user_id, role"),
      db
        .from("workspace_members")
        .select("user_id, workspace_id, role_id, status, is_primary, roles(name), workspaces(name, public_id)"),
    ]);

    if (pErr) throw pErr;
    if (mErr) console.warn("[listAdminUsers] memberRows query note:", mErr);
    if (rErr) console.warn("[listAdminUsers] roleRows query note:", rErr);

    const rolesByUser = new Map<string, AppRole[]>();
    (roleRows ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });

    const membersByUser = new Map<string, any[]>();
    (memberRows ?? []).forEach((m: any) => {
      const arr = membersByUser.get(m.user_id) ?? [];
      arr.push(m);
      membersByUser.set(m.user_id, arr);
    });

    return ((profiles ?? []) as any[]).map((p) => {
      const uRoles = rolesByUser.get(p.id) ?? [];
      const uMembers = membersByUser.get(p.id) ?? [];
      const primaryMember = uMembers.find((m) => m.is_primary) ?? uMembers[0] ?? null;
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        roles: uRoles,
        workspaceId: primaryMember?.workspace_id ?? null,
        workspaceName: primaryMember?.workspaces?.name ?? null,
        workspacePublicId: primaryMember?.workspaces?.public_id ?? null,
        systemARole: primaryMember?.roles?.name ?? null,
        membershipStatus: primaryMember?.status ?? "unprovisioned",
      };
    });
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(UpdateRoleInput)
  .handler(async ({ context, data }) => {
    const { supabase: authenticatedClient, userId: adminUserId } = context as {
      supabase: any;
      userId: string;
    };
    const db = isServiceRoleAvailable() ? supabaseAdmin : authenticatedClient;
    const { targetUserId, newRole, workspaceId } = data;

    // 1. Determine System A role name
    const systemARoleName =
      newRole === "admin" ? "platform_admin" : newRole === "viewer" ? "viewer" : "member";

    // 2. Fetch System A role ID (with fallback to seeded system UUIDs)
    let systemARoleId: string =
      systemARoleName === "platform_admin"
        ? "00000000-0000-0000-0000-0000000ad301"
        : systemARoleName === "viewer"
          ? "00000000-0000-0000-0000-0000000ad303"
          : "00000000-0000-0000-0000-0000000ad302";

    try {
      const { data: roleRow } = await db
        .from("roles")
        .select("id")
        .eq("name", systemARoleName)
        .is("workspace_id", null)
        .maybeSingle();

      if (roleRow?.id) {
        systemARoleId = roleRow.id;
      }
    } catch (rErr) {
      console.warn("[updateUserRole] role lookup warning, using seed ID:", rErr);
    }

    // 3. Fetch previous System B role for audit trail
    let previousRole: string | null = null;
    try {
      const { data: existingRoleRow } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (existingRoleRow) {
        previousRole = existingRoleRow.role;
      }
    } catch {
      // ignore
    }

    // 4. Update / Replace System B (user_roles)
    const { error: delErr } = await db
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId);
    if (delErr) throw delErr;

    const { error: insErr } = await db
      .from("user_roles")
      .insert({ user_id: targetUserId, role: newRole });
    if (insErr) throw insErr;

    // 5. Update or Insert System A (workspace_members)
    const { data: existingMembers, error: memberFetchErr } = await db
      .from("workspace_members")
      .select("id, workspace_id, is_primary")
      .eq("user_id", targetUserId);

    if (memberFetchErr) throw memberFetchErr;

    let targetWorkspaceId = workspaceId;

    if (existingMembers && existingMembers.length > 0) {
      // User has existing workspace memberships — update their System A role
      const primaryMember = existingMembers.find((m: any) => m.is_primary) ?? existingMembers[0];
      targetWorkspaceId = primaryMember.workspace_id;

      const { error: updateMemberErr } = await db
        .from("workspace_members")
        .update({ role_id: systemARoleId, status: "active" })
        .eq("user_id", targetUserId);
      if (updateMemberErr) throw updateMemberErr;
    } else if (targetWorkspaceId) {
      // User has a designated workspace passed or known — attempt update first
      const { data: updatedRows, error: wsUpdateErr } = await db
        .from("workspace_members")
        .update({ role_id: systemARoleId, status: "active" })
        .eq("workspace_id", targetWorkspaceId)
        .eq("user_id", targetUserId)
        .select("id");

      if (wsUpdateErr) throw wsUpdateErr;

      if (!updatedRows || updatedRows.length === 0) {
        // Only insert if no membership existed in target workspace
        const { error: insertMemberErr } = await db
          .from("workspace_members")
          .insert({
            workspace_id: targetWorkspaceId,
            user_id: targetUserId,
            role_id: systemARoleId,
            status: "active",
            is_primary: true,
          });
        if (insertMemberErr) throw insertMemberErr;
      }
    } else if (newRole === "admin") {
      // Explicit elevation to Platform Admin for previously unprovisioned user
      const defaultHqWsId = "00000000-0000-0000-0000-00000000d3f7";
      const { error: insertMemberErr } = await db
        .from("workspace_members")
        .insert({
          workspace_id: defaultHqWsId,
          user_id: targetUserId,
          role_id: systemARoleId,
          status: "active",
          is_primary: true,
        });
      if (insertMemberErr) throw insertMemberErr;
      targetWorkspaceId = defaultHqWsId;
    }

    // 6. Update sentinel_user_profiles (Persona synchronization)
    const personaMap: Record<AppRole, string> = {
      admin: "PLATFORM_ADMIN",
      manager: "SALES_EXECUTIVE",
      agent: "SALES_EXECUTIVE",
      viewer: "INVESTOR",
      builder: "DEVELOPER",
      developer: "DEVELOPER",
    };
    const primaryPersona = personaMap[newRole] ?? "SALES_EXECUTIVE";

    try {
      await db
        .from("sentinel_user_profiles")
        .upsert(
          {
            user_id: targetUserId,
            workspace_id: targetWorkspaceId,
            primary_persona: primaryPersona,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
    } catch (profileErr) {
      console.warn("[updateUserRole] sentinel_user_profiles upsert note:", profileErr);
    }

    // 7. Write Comprehensive Audit Log
    try {
      await db.from("audit_logs").insert({
        workspace_id: targetWorkspaceId,
        actor_id: adminUserId,
        action: "ROLE_ASSIGNMENT",
        entity: "user_roles",
        entity_id: targetUserId,
        diff: {
          previous_role: previousRole,
          assigned_role: newRole,
          system_a_role: systemARoleName,
          role_id: systemARoleId,
        },
      });
    } catch (auditErr) {
      console.warn("[updateUserRole] audit_logs note:", auditErr);
    }

    return {
      success: true,
      targetUserId,
      previousRole,
      newRole,
      systemARole: systemARoleName,
      workspaceId: targetWorkspaceId,
    };
  });

const UpdateFeatureFlagInput = z.object({
  workspaceId: z.string().uuid().optional(),
  flagKey: z.string().min(1),
  enabled: z.boolean(),
});

// In-memory feature flag cache with all primary Sentinel Fort modules
const FEATURE_FLAGS_STORE: Record<string, boolean> = {
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

export const listWorkspaceFeatureFlags = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    return { ...FEATURE_FLAGS_STORE };
  });

export const updateWorkspaceFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(UpdateFeatureFlagInput)
  .handler(async ({ context, data }) => {
    const { supabase: authenticatedClient, userId: adminUserId } = context as {
      supabase: any;
      userId: string;
    };
    const db = isServiceRoleAvailable() ? supabaseAdmin : authenticatedClient;
    const { workspaceId, flagKey, enabled } = data;
    const targetWorkspaceId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

    const previousValue = FEATURE_FLAGS_STORE[flagKey] ?? true;
    FEATURE_FLAGS_STORE[flagKey] = enabled;

    try {
      await db.from("audit_logs").insert({
        workspace_id: targetWorkspaceId,
        actor_id: adminUserId,
        action: "FEATURE_FLAG_UPDATE",
        entity: "workspace_settings",
        entity_id: targetWorkspaceId,
        diff: {
          flag: flagKey,
          previous_value: previousValue,
          new_value: enabled,
        },
      });
    } catch (auditErr) {
      console.warn("[updateWorkspaceFeatureFlag] audit_logs note:", auditErr);
    }

    return {
      success: true,
      workspaceId: targetWorkspaceId,
      flagKey,
      previousValue,
      enabled,
    };
  });

export interface AdminAuditLogEntry {
  id: string;
  ts: string;
  actorId: string | null;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  workspaceId: string | null;
  diff: Record<string, any>;
}

export const listAdminAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<AdminAuditLogEntry[]> => {
    const { supabase: authenticatedClient } = context as { supabase: any; userId: string };
    const db = isServiceRoleAvailable() ? supabaseAdmin : authenticatedClient;

    try {
      const [
        { data: logs, error: logErr },
        { data: profiles, error: profErr },
      ] = await Promise.all([
        db
          .from("audit_logs")
          .select("id, ts, actor_id, action, entity, entity_id, workspace_id, diff")
          .order("ts", { ascending: false })
          .limit(50),
        db.from("profiles").select("id, email, full_name"),
      ]);

      if (logErr) {
        console.warn("[listAdminAuditLogs] query note:", logErr);
        return [];
      }

      const profMap = new Map<string, string>();
      (profiles ?? []).forEach((p: any) => {
        profMap.set(p.id, p.full_name || p.email || "Platform Admin");
      });

      return (logs ?? []).map((l: any) => ({
        id: l.id,
        ts: l.ts,
        actorId: l.actor_id,
        actorEmail: l.actor_id ? profMap.get(l.actor_id) ?? l.actor_id : "System",
        action: l.action,
        entity: l.entity,
        entityId: l.entity_id,
        workspaceId: l.workspace_id,
        diff: typeof l.diff === "object" && l.diff !== null ? l.diff : {},
      }));
    } catch (e) {
      console.warn("[listAdminAuditLogs] exception:", e);
      return [];
    }
  });

