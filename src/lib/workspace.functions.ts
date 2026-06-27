import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getCurrentWorkspaceId,
  getWorkspace,
  listMyMemberships,
} from "@/lib/services/workspace.service";
import { listFlags } from "@/lib/services/feature-flags.service";

/**
 * Returns the signed-in user's active workspace, all memberships, and the
 * feature-flag map for that workspace. Drives the workspace switcher and
 * gates UI modules per tenant.
 */
export const getMyWorkspaceContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as {
      supabase: any;
      userId: string;
    };

    const [workspaceId, memberships] = await Promise.all([
      getCurrentWorkspaceId(supabase),
      listMyMemberships(supabase, userId),
    ]);

    if (!workspaceId) {
      return {
        workspace: null,
        memberships,
        flags: [] as Array<{ key: string; enabled: boolean }>,
      };
    }

    const [workspace, flagsRaw] = await Promise.all([
      getWorkspace(supabase, workspaceId),
      listFlags(supabase, workspaceId),
    ]);

    return {
      workspace,
      memberships,
      flags: flagsRaw.map((f) => ({ key: f.key, enabled: f.enabled })),
    };
  });