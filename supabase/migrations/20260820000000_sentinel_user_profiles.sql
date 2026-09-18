/**
 * SENTINEL FORT — identity/experience profile persistence.
 *
 * Smallest appropriate schema: one profile row per (user, workspace).
 *
 * SECURITY (mirrors this project's B1/B3/B4 discipline):
 *  - Owner enforced server-side via auth.uid() = user_id. NEVER client-trusted.
 *  - workspace_id sourced from the RLS-safe `current_workspace_id` RPC at write
 *    time — NOT a client-supplied value and never a DEFAULT_WORKSPACE_ID.
 *  - Row-level security enabled; policies restrict all access to the row owner.
 *  - Persona/intent/objective are advisory EXPERIENCE choices only. They never
 *    grant authorization (RBAC stays DB-backed via public.user_roles).
 */
create table sentinel_user_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  workspace_id     uuid references workspaces not null,
  primary_persona  text,
  personae         text[]  not null default array[]::text[],
  intents          text[]  not null default array[]::text[],
  objective        text,
  context          jsonb   not null default '{}'::jsonb,
  created_at       timestamp with time zone not null default now(),
  updated_at       timestamp with time zone not null default now(),
  unique (user_id, workspace_id)
);

alter table sentinel_user_profiles enable row level security;

-- The caller may only read/write their own profile rows.
create policy "user can CRUD own workspace profile"
  on sentinel_user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- (updated_at is set explicitly by the sentinel server functions on every upsert;
-- no trigger dependency required for this minimal profile table.)
