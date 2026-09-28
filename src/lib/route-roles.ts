/**
 * SENTINEL FORT — advisory route ↔ role matrix.
 *
 * Mirrors the shell sidebar access policy (app.tsx nav + kieNav). This is a
 * CLIENT-SIDE HINT used ONLY to avoid advertising capabilities the caller
 * cannot reach. Real enforcement is each route's own beforeLoad / role gate
 * (DB-backed user_roles). It never grants anything.
 */
export const ROUTE_ROLES: Record<string, readonly string[]> = {
  "/app/crm": ["admin", "manager", "agent", "viewer"],
  "/app/leads": ["admin", "manager", "agent", "viewer"],
  "/app/marketplace": ["admin", "manager", "agent", "viewer", "builder", "developer"],
  "/app/voice": ["admin", "manager", "agent"],
  "/app/marketing": ["admin", "manager"],
  "/app/bi": ["admin", "manager", "viewer", "builder", "developer"],
  "/app/partners": ["admin", "builder", "developer"],
  "/app/command": ["admin"],
  "/app/copilot": ["admin", "manager", "builder", "developer"],
  "/app/docchat": ["admin", "builder", "developer"],
  "/app/recommendations": ["admin", "builder"],
  "/app/workflows": ["admin", "builder", "developer"],
  "/app/dealrooms": ["admin", "manager", "agent", "builder", "developer"],
  "/app/risk": ["admin"],
  "/app/market": ["admin", "viewer", "builder", "developer"],
  "/app/supreme-intelligence": ["admin", "viewer", "builder", "developer"],
  "/app/inventory": ["admin", "manager", "builder", "developer"],
  "/app/users": ["admin"],
  "/app/governance": ["admin"],
  "/app/customer": ["admin", "manager", "agent", "viewer"],
  "/app/salesintel": ["admin", "builder", "developer"],
  "/app/kie": ["admin", "builder", "developer"],
  "/app/collections": ["admin", "viewer"],
  "/app/graph": ["admin"],
  "/app/documents": ["admin", "manager", "agent", "builder", "developer"],
  "/app/messages": ["admin", "manager", "agent", "viewer", "builder", "developer"],
  "/app/settings/branding": ["admin"],
  "/app/settings/integrations": ["admin"],
};

export function isRouteAuthorized(
  roles: readonly string[],
  path: string | null | undefined,
  featureFlags?: Record<string, boolean> | null,
): boolean {
  if (!path) return false;

  const isAdmin = roles.includes("admin");

  // Feature flag checks: Workspace feature flags control non-admin user availability.
  // For admin, role-authorized modules remain accessible regardless of workspace feature flags.
  if (featureFlags && !isAdmin) {
    // Core route: Default On, fail closed only if explicitly disabled (false)
    if (path.startsWith("/app/crm") && featureFlags.crm === false) return false;

    // Optional routes: Fail closed (must be explicitly true)
    if (path.startsWith("/app/voice") && featureFlags.voice !== true) return false;
    if (path.startsWith("/app/marketing") && (featureFlags.marketing !== true && featureFlags.ai_marketing !== true)) return false;
    if (path.startsWith("/app/marketplace") && featureFlags.marketplace !== true) return false;
    if (path.startsWith("/app/bi") && featureFlags.bi !== true) return false;
    if (path.startsWith("/app/supreme-intelligence") && featureFlags.supreme_intelligence !== true) return false;
    if (path.startsWith("/app/inventory") && featureFlags.inventory !== true) return false;
    if (path.startsWith("/app/copilot") && featureFlags.chat !== true) return false;
    if (path.startsWith("/app/collections") && featureFlags.collections !== true) return false;
  }

  const allowed = ROUTE_ROLES[path];
  if (!allowed) return true; // unknown route: let the route's own gate decide
  return roles.some((r) => allowed.includes(r));
}

