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
  "/app/marketing": ["admin", "manager", "agent"],
  "/app/bi": ["admin", "manager", "viewer", "builder", "developer"],
  "/app/partners": ["admin", "manager", "builder", "developer"],
  "/app/command": ["admin", "manager"],
  "/app/copilot": ["admin", "manager", "agent", "builder", "developer"],
  "/app/docchat": ["admin", "manager", "agent", "builder", "developer"],
  "/app/recommendations": ["admin", "manager", "builder"],
  "/app/workflows": ["admin", "manager", "builder", "developer"],
  "/app/dealrooms": ["admin", "manager", "agent", "builder", "developer"],
  "/app/risk": ["admin", "manager"],
  "/app/market": ["admin", "manager", "viewer", "builder", "developer"],
  "/app/supreme-intelligence": ["admin", "manager", "viewer", "builder", "developer"],
  "/app/inventory": ["admin", "manager", "builder", "developer"],
  "/app/users": ["admin", "manager"],
  "/app/governance": ["admin", "manager"],
  "/app/customer": ["admin", "manager", "agent", "viewer"],
  "/app/salesintel": ["admin", "manager", "agent", "builder", "developer"],
  "/app/kie": ["admin", "manager", "builder", "developer"],
  "/app/collections": ["admin", "manager", "viewer"],
  "/app/graph": ["admin", "manager"],
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

  // Feature flag checks
  if (featureFlags) {
    if (path.startsWith("/app/voice") && featureFlags.voice === false) return false;
    if (path.startsWith("/app/marketing") && (featureFlags.marketing === false || featureFlags.ai_marketing === false)) return false;
    if (path.startsWith("/app/marketplace") && featureFlags.marketplace === false) return false;
    if (path.startsWith("/app/crm") && featureFlags.crm === false) return false;
    if (path.startsWith("/app/bi") && featureFlags.bi === false) return false;
    if (path.startsWith("/app/supreme-intelligence") && featureFlags.supreme_intelligence === false) return false;
  }

  const allowed = ROUTE_ROLES[path];
  if (!allowed) return true; // unknown route: let the route's own gate decide
  return roles.some((r) => allowed.includes(r));
}

