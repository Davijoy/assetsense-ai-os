import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import { buildFeed, type FeedItem } from "@/lib/services/feed.service";

export type { FeedItem };

export const getExecutiveFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeedItem[]> => {
    const { supabase } = context as { supabase: any };
    const workspaceId = await getCurrentWorkspaceId(supabase);
    if (!workspaceId) return [];
    return buildFeed(supabase, workspaceId);
  });