import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabase = SupabaseClient<any, any, any>;

export type AuditRow = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
};

export type RoleRow = { role: string; users: number; scope: string };

export async function listAudit(
  supabase: AnySupabase,
  workspaceId: string,
  limit = 12,
): Promise<AuditRow[]> {
  const { data, error } = await (supabase as any)
    .from("audit_logs")
    .select("id, ts, actor_id, action, entity, entity_id")
    .eq("workspace_id", workspaceId)
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const actorIds = Array.from(
    new Set((data ?? []).map((r: any) => r.actor_id).filter(Boolean)),
  );
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      names.set(p.id, p.full_name || p.email || "Member");
    }
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    ts: r.ts,
    actor: r.actor_id ? (names.get(r.actor_id) ?? "Member") : "AI Engine",
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id ?? null,
  }));
}

export async function listRoleDistribution(
  supabase: AnySupabase,
  workspaceId: string,
): Promise<RoleRow[]> {
  const { data: members, error } = await (supabase as any)
    .from("workspace_members")
    .select("role_id, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (error) throw error;

  const { data: roles } = await (supabase as any)
    .from("roles")
    .select("id, name, description, is_system");

  const counts = new Map<string, number>();
  for (const m of members ?? []) {
    counts.set(m.role_id, (counts.get(m.role_id) ?? 0) + 1);
  }

  return (roles ?? [])
    .map((r: any) => ({
      role: r.name as string,
      users: counts.get(r.id) ?? 0,
      scope: (r.description as string) || (r.is_system ? "System role" : "Custom role"),
    }))
    .sort((a: RoleRow, b: RoleRow) => b.users - a.users);
}