import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import {
  listAudit,
  listRoleDistribution,
  type AuditRow,
  type RoleRow,
} from "@/lib/services/governance.service";

export type GovernanceSnapshot = {
  audit: AuditRow[];
  roles: RoleRow[];
};

export const getGovernanceSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GovernanceSnapshot> => {
    const { supabase } = context as { supabase: any };
    const workspaceId = await getCurrentWorkspaceId(supabase);
    if (!workspaceId) return { audit: [], roles: [] };

    const [audit, roles] = await Promise.all([
      listAudit(supabase, workspaceId),
      listRoleDistribution(supabase, workspaceId),
    ]);
    return { audit, roles };
  });