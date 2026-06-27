## Sentinel Fort REOS v1.0 — Architecture Migration Plan

This is a foundational refactor that touches schema, services, auth, and AI layers. I'll deliver it in **5 phases**, each independently shippable. Phase 1 is the unblocker — everything else builds on it.

### Phase 1 — Multi-Tenant Foundation (schema + RBAC)

**New schema (single migration, all GRANTs + RLS):**

```text
workspaces (id, category, type, name, parent_id, settings jsonb)
workspace_members (workspace_id, user_id, role, status)
roles (id, workspace_id, name, is_system)
permissions (id, code, description)              -- e.g. leads.read, deals.write
role_permissions (role_id, permission_id)
feature_flags (workspace_id, flag_key, enabled, config jsonb)
audit_logs (id, workspace_id, actor_id, action, entity, entity_id, diff jsonb, ts)
```

**Enums:** `workspace_category`, `workspace_type` (matching the spec exactly).

**Security-definer helpers:**
- `current_workspace_id()` — reads `auth.jwt() -> 'workspace_id'`
- `has_permission(_user uuid, _perm text)` — joins members → roles → perms
- `is_workspace_member(_user uuid, _ws uuid)`

**RLS template** applied to every workspace-scoped table:
```sql
USING (workspace_id = current_workspace_id() AND has_permission(auth.uid(), '<resource>.read'))
```

**Backfill:** seed one `INTERNAL/PLATFORM_ADMIN` workspace, attach all existing users, stamp existing `leads/calls/properties/kie_documents/branding_settings` rows with that `workspace_id`.

### Phase 2 — Global Intelligence Layer + Relationship Graph

**Global tables (no workspace_id):**
```text
properties_global       -- promoted from properties; canonical record
locations               -- city, geo, polygon
market_data             -- time-series price/yield by location
property_media          -- images, videos, floorplans
property_embeddings     -- pgvector(1536), refs properties_global
valuation_models        -- model registry (extends existing insights registry)
documents_global        -- shared docs (RERA filings, market reports)
```

**Relationship graph:**
```text
property_relationships (
  property_id, workspace_id, contact_id, relationship_type, since, until, metadata jsonb
)
```
Enum `relationship_type` with the 10 values from the spec. Existing `properties.developer` field becomes a seeded `OWNER` relationship.

### Phase 3 — Workspace Domain Tables

Refactor + add, all carrying `workspace_id`:
```text
contacts, leads (refactor), campaigns, deals, deal_rooms,
notifications, activities, workflows, workflow_runs,
commissions, ai_actions
```
Existing `leads` gets `workspace_id` + `contact_id` FK. `calls` becomes an `activity` subtype.

### Phase 4 — Service Layer (no direct table access from clients)

**Directory:** `src/lib/services/` — pure functions, importable by server fns.
```
services/
  workspace.service.ts       (resolve workspace from JWT claims)
  rbac.service.ts            (has_permission wrapper)
  leads.service.ts
  properties.service.ts
  relationships.service.ts
  deals.service.ts
  notifications.service.ts
  workflows.service.ts
  audit.service.ts
  events.service.ts          (publish only — in-process bus + outbox table)
  ai/
    platform.ts              (agent registry, run() with audit + confidence)
    agents/
      crm.agent.ts
      property.agent.ts
      marketing.agent.ts
      investment.agent.ts
      knowledge.agent.ts
      executive.agent.ts
      compliance.agent.ts
      support.agent.ts
```

**API surface:** versioned REST under `src/routes/api/v1/*` for external callers; internal UI keeps `createServerFn` but every fn calls a service (no inline SQL).

**Refactor:** `copilot.functions.ts`, `bi.functions.ts`, `kie-rag.functions.ts`, `insights.functions.ts` move their queries into services and gain `workspace_id` filtering.

### Phase 5 — Events, Workflows, Notifications

**Event bus (MVP):** Postgres `events_outbox` table + `events.service.ts publish()`. A background drainer (server fn invoked by cron route under `/api/public/cron/drain-events`) dispatches to subscribers. BullMQ/Redis is a swap-in adapter later — the publish API stays the same.

**Event types:** the 9 listed in the spec, as a TS discriminated union + DB enum.

**Workflow engine:** `workflows` (definition jsonb: trigger event + steps) + `workflow_runs` (state machine). Approval steps write to `ai_actions` with `approval_state`.

**Notifications:** `notifications.service.ts send({ channel, ... })` with adapters: `in_app` (DB insert), `email` (stub → Resend later), `whatsapp`/`sms` (stub → Twilio later). All notification triggers come from event subscribers, never from UI code.

**AI autonomy modes** stored on `workspaces.settings.ai_mode` and enforced in `ai/platform.ts run()`.

### What stays working during the migration

- Phase 1 backfills existing rows into a default workspace, so current UI keeps rendering.
- Phases 2–3 add columns/tables; old reads still pass.
- Phase 4 refactors are internal; UI imports stay the same.
- Phase 5 is additive.

### Out of scope for this delivery (called out explicitly)

- AWS migration (Aurora/Cognito/K8s) — architecture is compatible, but no AWS code ships.
- Real WhatsApp/SMS/Email providers — adapter stubs only.
- Per-channel marketplace services (Loans/Insurance/Legal/Interior) — schema reserves space via `workspace_type` PARTNER enums; no UI built.
- UI rebuild — existing `/app/*` pages keep working against the refactored services. New admin screens (workspace switcher, RBAC editor, feature flags) are minimal.

### Recommended execution

Ship **Phase 1 first** as one approval-gated migration + service skeleton. It's the dependency for everything else and is the highest-risk change (touches RLS on every existing table). Then ship Phases 2–5 in subsequent turns once Phase 1 is verified in preview.

### Confirm before I start

1. **Default workspace assignment** — OK to put all existing users + data into one auto-created `INTERNAL / PLATFORM_ADMIN` workspace named "Sentinel Fort HQ"? (Required to keep RLS from blacking out current UI.)
2. **Start with Phase 1 only** this turn, or do you want me to also draft Phase 2 (global intelligence + relationship graph) in the same delivery?
3. **Auth model** — keep current Supabase Auth and inject `workspace_id` via a custom JWT hook? (Recommended; no user disruption.) Or add a workspace-switcher UI that stores active workspace in DB and reads via `auth.uid()` lookup (no JWT hook, slightly slower RLS)?
