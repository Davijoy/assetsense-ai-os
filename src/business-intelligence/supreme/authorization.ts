/**
 * Supreme Intelligence execution authorization policy.
 *
 * Single source of truth for which app roles may EXECUTE orchestration and
 * proof scenarios. Mirrors the canonical server-side `requireAdminOrManager`
 * middleware (src/integrations/supabase/role-middleware.ts), which is DB-backed
 * via `public.user_roles`. Deliberately limited to admin and manager — NOT
 * widened to viewer/builder/developer/agent, and no `platform_admin` literal
 * bypass.
 */
export const ORCHESTRATION_EXEC_ROLES: string[] = ["admin", "manager"];

/**
 * Pure predicate mirroring requireAdminOrManager. Used by the unit tests to
 * prove the exact allow/deny matrix applied to orchestration execution.
 */
export function canExecuteSupreme(roles: readonly string[]): boolean {
  return ORCHESTRATION_EXEC_ROLES.some((r) => roles.includes(r));
}