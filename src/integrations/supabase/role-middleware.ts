import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

export type AppRole = "admin" | "manager" | "agent" | "viewer" | "builder" | "developer";

/**
 * Server-fn middleware that ensures the caller has at least one of the given roles.
 * Throws 403 otherwise. Builds on requireSupabaseAuth, so context.supabase / userId
 * remain available downstream.
 */
export function requireRoles(roles: AppRole[]) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const { supabase, userId } = context as { supabase: any; userId: string };
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) {
        throw new Response("Forbidden: role lookup failed", { status: 403 });
      }
      const userRoles = ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
      const ok = userRoles.some((r) => roles.includes(r));
      if (!ok) {
        throw new Response(
          `Forbidden: requires one of [${roles.join(", ")}]`,
          { status: 403 },
        );
      }
      return next({ context: { roles: userRoles } });
    });
}

export const requireAdmin = requireRoles(["admin"]);
export const requireAdminOrManager = requireRoles(["admin", "manager"]);
export const requireStaff = requireRoles(["admin", "manager", "agent"]);
export const requireBuilderOrDeveloper = requireRoles(["admin", "manager", "builder", "developer"]);