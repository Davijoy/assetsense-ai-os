-- =========================================================================
-- Migration: 20260923230000_strict_opportunity_assignment_integrity.sql
-- Description: Enforce strict deal opportunity assignment integrity across all roles.
--
-- Updates public.trg_validate_deal_opportunity_integrity() to guarantee that
-- NEW.assigned_to IS NOT DISTINCT FROM originating lead's assigned_to for EVERY
-- operation (INSERT or UPDATE), removing the manager exception.
--
-- Reassignments must be performed on the originating CRM lead (which automatically
-- cascades to opportunities via trg_sync_lead_assignment_to_opportunities),
-- preventing direct opportunity assignment drift across all user operations.
--
-- Preserves existing immutable-field (lead_id, workspace_id) and workspace-isolation checks.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.trg_validate_deal_opportunity_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_ws UUID;
  v_lead_assigned UUID;
BEGIN
  -- 1. Verify originating lead exists and query canonical workspace & assignment
  SELECT workspace_id, assigned_to INTO v_lead_ws, v_lead_assigned
  FROM public.leads
  WHERE id = NEW.lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_LEAD: Originating lead % does not exist', NEW.lead_id;
  END IF;

  -- 2. On UPDATE, lead_id and workspace_id are strictly immutable
  IF TG_OP = 'UPDATE' THEN
    IF NEW.lead_id IS DISTINCT FROM OLD.lead_id THEN
      RAISE EXCEPTION 'IMMUTABLE_FIELD: lead_id on deal_opportunities cannot be modified';
    END IF;
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'IMMUTABLE_FIELD: workspace_id on deal_opportunities cannot be modified';
    END IF;
  END IF;

  -- 3. Enforce workspace isolation agreement with originating lead
  IF NEW.workspace_id IS DISTINCT FROM v_lead_ws THEN
    RAISE EXCEPTION 'WORKSPACE_MISMATCH: Opportunity workspace % does not match lead workspace %', NEW.workspace_id, v_lead_ws;
  END IF;

  -- 4. Enforce strict agreement of assigned_to with originating lead for ALL operations (including managers)
  IF NEW.assigned_to IS DISTINCT FROM v_lead_assigned THEN
    RAISE EXCEPTION 'ASSIGNMENT_MISMATCH: Opportunity assignee % must match lead assignee %', NEW.assigned_to, v_lead_assigned;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger attachment remains active and bound to the updated function
DROP TRIGGER IF EXISTS trg_deal_opportunity_integrity ON public.deal_opportunities;
CREATE TRIGGER trg_deal_opportunity_integrity
  BEFORE INSERT OR UPDATE ON public.deal_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_deal_opportunity_integrity();
