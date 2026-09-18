-- =========================================================================
-- FORT WORKSPACE PUBLIC ID  (additive only — no destructive DDL)
-- =========================================================================
-- Adds a stable, human-readable identifier to every workspace:
--
--     internal UUID   -> database identity  (joins, FKs, RLS)   [unchanged]
--     public_id       -> human-facing identity (FORT-XXX0990)   [new]
--
-- SECURITY CONTRACT
--   * public_id is CONTEXTUAL IDENTITY ONLY. It is never an authorization
--     claim. No RLS policy in this database references public_id, and none is
--     added here. Authorization continues to require:
--         authenticated user + workspace_members + role + server capability
--   * public_id is SERVER GENERATED. `authenticated` holds only SELECT on
--     public.workspaces (see 20260627092619), so a client can never insert or
--     choose one.
--   * public_id is IMMUTABLE once set (enforced by trigger below), so it
--     remains stable for the life of the workspace.
--
-- This migration does NOT: create organizations, rewrite RLS, move domain
-- data, delete roles, or touch System A (roles/permissions/role_permissions).
-- =========================================================================

-- 1. Column (nullable first so the backfill can run) ----------------------
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS public_id TEXT;

COMMENT ON COLUMN public.workspaces.public_id IS
  'Human-facing FORT workspace identifier (FORT-XXX0990). Contextual identity only — NEVER an authorization claim. Server generated, unique, immutable.';

-- 2. Monotonic numeric component ------------------------------------------
-- Guarantees global uniqueness independently of the letter component.
-- Starts at 990 so the first (existing, oldest) workspace becomes FORT-xxx0990.
CREATE SEQUENCE IF NOT EXISTS public.workspace_public_id_seq
  AS BIGINT START WITH 990 INCREMENT BY 1 NO CYCLE;

-- 3. Generator -------------------------------------------------------------
-- Letters are derived deterministically from the workspace UUID (md5 bytes —
-- no RNG, so the value is reproducible); digits come from the sequence, which
-- is what actually enforces uniqueness. Past 9999 the numeric part simply
-- grows to 5 digits; the UNIQUE constraint continues to hold.
CREATE OR REPLACE FUNCTION public.generate_workspace_public_id(_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_digest  BYTEA;
  v_letters TEXT;
  v_n       BIGINT;
BEGIN
  IF _workspace_id IS NULL THEN
    RAISE EXCEPTION 'generate_workspace_public_id: workspace id is required';
  END IF;

  v_digest := decode(md5(_workspace_id::text), 'hex');
  v_letters :=
      chr(65 + (get_byte(v_digest, 0) % 26)) ||
      chr(65 + (get_byte(v_digest, 1) % 26)) ||
      chr(65 + (get_byte(v_digest, 2) % 26));

  v_n := nextval('public.workspace_public_id_seq');

  RETURN 'FORT-' || v_letters || lpad(v_n::text, 4, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_workspace_public_id(UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.generate_workspace_public_id(UUID) TO service_role;

-- 4. Auto-assign on insert -------------------------------------------------
CREATE OR REPLACE FUNCTION public.workspaces_assign_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := public.generate_workspace_public_id(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_assign_public_id_trg ON public.workspaces;
CREATE TRIGGER workspaces_assign_public_id_trg
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.workspaces_assign_public_id();

-- 5. Immutability ----------------------------------------------------------
-- Once assigned, public_id can never change (stability guarantee). NULL -> value
-- is permitted so the backfill below can run.
CREATE OR REPLACE FUNCTION public.workspaces_freeze_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.public_id IS NOT NULL AND NEW.public_id IS DISTINCT FROM OLD.public_id THEN
    RAISE EXCEPTION 'workspaces.public_id is immutable (workspace %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_freeze_public_id_trg ON public.workspaces;
CREATE TRIGGER workspaces_freeze_public_id_trg
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.workspaces_freeze_public_id();

-- 6. Backfill existing workspaces -----------------------------------------
-- Deterministic order (oldest first) so identifiers are assigned stably.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.workspaces WHERE public_id IS NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.workspaces
       SET public_id = public.generate_workspace_public_id(r.id)
     WHERE id = r.id;
  END LOOP;
END
$$;

-- 7. Constraints -----------------------------------------------------------
ALTER TABLE public.workspaces ALTER COLUMN public_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_public_id_key'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT workspaces_public_id_key UNIQUE (public_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_public_id_format_chk'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT workspaces_public_id_format_chk
      CHECK (public_id ~ '^FORT-[A-Z]{3}[0-9]{4,}$');
  END IF;
END
$$;
