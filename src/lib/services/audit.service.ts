import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabase = SupabaseClient<any, any, any>;

export type AuditEntry = {
  workspaceId: string;
  actorId: string | null;
  action: string;        // e.g. "lead.created"
  entity: string;        // e.g. "leads"
  entityId?: string | null;
  diff?: Record<string, unknown>;
};

/**
 * Append a single audit log row. Uses the calling client (RLS applies).
 * Service-role callers may pass `supabaseAdmin` from server-only paths.
 */
export async function recordAudit(
  supabase: AnySupabase,
  entry: AuditEntry,
): Promise<void> {
  const { error } = await (supabase as any).from("audit_logs").insert({
    workspace_id: entry.workspaceId,
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    diff: entry.diff ?? {},
  });
  if (error) throw error;
}