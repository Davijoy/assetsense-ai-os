# Sentinel Fort REOS — Service Layer

All business logic lives here. Server functions in `src/lib/*.functions.ts` must
delegate to a service in this folder — no inline SQL in route or server-fn files.

Services are pure async functions that accept an authenticated Supabase client
plus the resolved `workspaceId` and return plain DTOs. They never depend on
`supabaseAdmin` unless the operation is explicitly privileged.

## Layout

- `workspace.service.ts`     — resolve the caller's active workspace + membership
- `rbac.service.ts`          — permission checks (mirrors the DB `has_permission` fn)
- `feature-flags.service.ts` — read/write per-workspace feature flags
- `audit.service.ts`         — append-only audit log writes
- `leads.service.ts`         — leads CRUD scoped to workspace
- `properties.service.ts`    — properties CRUD scoped to workspace
- `ai/platform.ts`           — agent registry + `runAgent()` wrapper

Phase 1 ships the workspace/RBAC/audit foundation. Domain services land in
Phase 3+ as existing `.functions.ts` files are refactored.