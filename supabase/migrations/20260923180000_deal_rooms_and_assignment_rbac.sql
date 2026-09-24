-- =========================================================================
-- SENTINEL FORT — Virtual Office & Deal Room RBAC + Preliminary Opportunities
-- Migration: 20260923180000_deal_rooms_and_assignment_rbac.sql
-- =========================================================================

-- 1. Create preliminary opportunities table for early-stage Deal Rooms
-- Tied strictly to CRM lead_id (UNIQUE) without fabricating commercial terms.
CREATE TABLE IF NOT EXISTS public.deal_opportunities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id           UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to       UUID REFERENCES auth.users(id),
  stage             VARCHAR(50) NOT NULL DEFAULT 'negotiation',
  unit_interest     VARCHAR(100),
  target_budget_inr NUMERIC(15,2),
  notes             TEXT,
  formal_deal_id    UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.deal_opportunities IS 'Preliminary deal room opportunities originating from CRM leads prior to formal contract signing';
COMMENT ON COLUMN public.deal_opportunities.lead_id IS 'Unique originating CRM lead reference (strictly one preliminary opportunity per lead)';
COMMENT ON COLUMN public.deal_opportunities.formal_deal_id IS 'Linkage to formal deals table once commercial contract is executed';

-- Indexes
CREATE INDEX IF NOT EXISTS deal_opp_workspace_idx ON public.deal_opportunities(workspace_id);
CREATE INDEX IF NOT EXISTS deal_opp_lead_idx ON public.deal_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS deal_opp_assigned_to_idx ON public.deal_opportunities(assigned_to);

-- Enable RLS
ALTER TABLE public.deal_opportunities ENABLE ROW LEVEL SECURITY;

-- 2. Optional foreign key linkage from deals to leads & deal_opportunities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deals'
      AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE public.deals ADD COLUMN lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS deals_lead_id_idx ON public.deals(lead_id);
  END IF;
END $$;

-- 3. Add outcome tracking and timestamp columns to leads table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'leads'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'visit_outcome'
    ) THEN
      ALTER TABLE public.leads ADD COLUMN visit_outcome VARCHAR(50);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.leads ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
  END IF;
END $$;

-- =========================================================================
-- 4. WORKSPACE MANAGEMENT HELPER FUNCTION
-- =========================================================================
-- Enforces manager authorization strictly through active workspace-specific
-- membership with an appropriate workspace role, or verified platform admin.
CREATE OR REPLACE FUNCTION public.is_workspace_manager(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    -- 1. Platform Administrator has cross-workspace management access
    public.has_role(_user_id, 'admin'::public.app_role)
    OR
    -- 2. Active member of this specific workspace with a workspace management role
    EXISTS (
      SELECT 1 
      FROM public.workspace_members wm
      JOIN public.roles r ON wm.role_id = r.id
      WHERE wm.user_id = _user_id 
        AND wm.workspace_id = _workspace_id 
        AND wm.status = 'active'
        AND (
          r.name IN ('admin', 'manager', 'sales_manager', 'workspace_admin', 'platform_admin')
          OR (public.has_role(_user_id, 'manager'::public.app_role) AND r.name NOT IN ('viewer', 'member', 'agent'))
        )
    )
  );
$$;

COMMENT ON FUNCTION public.is_workspace_manager(UUID, UUID) IS
'Returns true if the user is a platform administrator or holds an active management role specifically within the given workspace.';

REVOKE EXECUTE ON FUNCTION public.is_workspace_manager(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_manager(UUID, UUID) TO authenticated, service_role;

-- =========================================================================
-- 5. CLEAN AND COORDINATE `leads` RLS POLICIES
-- =========================================================================
-- Drop every legacy and conflicting policy from all prior migrations
-- to ensure Postgres permissive policy OR evaluations do not bypass constraints.
DROP POLICY IF EXISTS "leads public read" ON public.leads;
DROP POLICY IF EXISTS "leads auth read" ON public.leads;
DROP POLICY IF EXISTS "leads ws read" ON public.leads;
DROP POLICY IF EXISTS "leads_select_roles" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_roles" ON public.leads;
DROP POLICY IF EXISTS "leads_update_roles" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_roles" ON public.leads;
DROP POLICY IF EXISTS "leads_platform_admin_all" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_manager_select" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_manager_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_manager_update" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_manager_delete" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_admin_mgr_select" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_admin_mgr_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_admin_mgr_update" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_admin_mgr_delete" ON public.leads;
DROP POLICY IF EXISTS "leads_agent_assigned_select" ON public.leads;
DROP POLICY IF EXISTS "leads_agent_assigned_update" ON public.leads;
DROP POLICY IF EXISTS "leads_select_all" ON public.leads;
DROP POLICY IF EXISTS "leads_modify_all" ON public.leads;

-- A. Platform Administrator: Full cross-workspace access
CREATE POLICY "leads_platform_admin_all" ON public.leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- B. Workspace Managers & Admins: Active workspace-specific management
CREATE POLICY "leads_workspace_manager_select" ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id));

CREATE POLICY "leads_workspace_manager_insert" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_manager(auth.uid(), workspace_id));

CREATE POLICY "leads_workspace_manager_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_manager(auth.uid(), workspace_id));

CREATE POLICY "leads_workspace_manager_delete" ON public.leads
  FOR DELETE TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id));

-- C. Sales Executives (agent role): Requires BOTH agent role AND active membership AND direct assignment
CREATE POLICY "leads_agent_assigned_select" ON public.leads
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND public.is_workspace_member(auth.uid(), workspace_id)
    AND assigned_to = auth.uid()
  );

CREATE POLICY "leads_agent_assigned_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND public.is_workspace_member(auth.uid(), workspace_id)
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND public.is_workspace_member(auth.uid(), workspace_id)
    AND assigned_to = auth.uid()
    AND workspace_id = leads.workspace_id
    AND id = leads.id
  );

-- =========================================================================
-- 6. PROTECT LEAD ADMINISTRATIVE FIELDS TRIGGER
-- =========================================================================
-- Prevents Sales Executives from modifying lead assignments, workspace ownership,
-- or immutable identifiers while preserving status, appointment, and note updates.
CREATE OR REPLACE FUNCTION public.trg_protect_lead_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_manager BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_manager := public.is_workspace_manager(v_caller, OLD.workspace_id);
  IF v_is_manager THEN
    RETURN NEW;
  END IF;

  -- Sales Executives / non-managers cannot change workspace ownership
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot modify workspace_id on leads';
  END IF;

  -- Sales Executives / non-managers cannot reassign leads
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    RAISE EXCEPTION 'UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot reassign leads (assigned_to)';
  END IF;

  IF NEW.owner IS DISTINCT FROM OLD.owner THEN
    RAISE EXCEPTION 'UNAUTHORIZED_FIELD_CHANGE: Sales Executives cannot modify lead owner';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: lead id cannot be modified';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lead_fields ON public.leads;
CREATE TRIGGER trg_protect_lead_fields
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_lead_fields();

-- =========================================================================
-- 7. COORDINATE `deal_opportunities` RLS POLICIES
-- =========================================================================
DROP POLICY IF EXISTS "deal_opportunities_platform_admin_all" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_workspace_admin_mgr_select" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_workspace_manager_select" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_workspace_manager_insert" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_workspace_manager_update" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_workspace_manager_delete" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_agent_assigned_select" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_agent_assigned_insert" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_agent_assigned_update" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_insert" ON public.deal_opportunities;
DROP POLICY IF EXISTS "deal_opportunities_update" ON public.deal_opportunities;

-- A. Platform Administrator: Full cross-workspace access
CREATE POLICY "deal_opportunities_platform_admin_all" ON public.deal_opportunities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- B. Workspace Managers & Admins: Active workspace-specific management
CREATE POLICY "deal_opportunities_workspace_manager_select" ON public.deal_opportunities
  FOR SELECT TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id));

CREATE POLICY "deal_opportunities_workspace_manager_insert" ON public.deal_opportunities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_manager(auth.uid(), workspace_id));

CREATE POLICY "deal_opportunities_workspace_manager_update" ON public.deal_opportunities
  FOR UPDATE TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_manager(auth.uid(), workspace_id));

CREATE POLICY "deal_opportunities_workspace_manager_delete" ON public.deal_opportunities
  FOR DELETE TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id));

-- C. Sales Executives: Strictly assigned opportunities with agent role in active workspace
CREATE POLICY "deal_opportunities_agent_assigned_select" ON public.deal_opportunities
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND public.is_workspace_member(auth.uid(), workspace_id)
    AND assigned_to = auth.uid()
  );

CREATE POLICY "deal_opportunities_agent_assigned_insert" ON public.deal_opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND public.is_workspace_member(auth.uid(), workspace_id)
    AND assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = deal_opportunities.lead_id
        AND l.workspace_id = deal_opportunities.workspace_id
        AND l.assigned_to = auth.uid()
    )
  );

CREATE POLICY "deal_opportunities_agent_assigned_update" ON public.deal_opportunities
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND public.is_workspace_member(auth.uid(), workspace_id)
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND public.is_workspace_member(auth.uid(), workspace_id)
    AND assigned_to = auth.uid()
    AND lead_id = deal_opportunities.lead_id
    AND workspace_id = deal_opportunities.workspace_id
  );

-- =========================================================================
-- 8. DEAL OPPORTUNITY INTEGRITY & IMMUTABILITY TRIGGER
-- =========================================================================
-- Protects preliminary opportunities against unauthorized changes to
-- lead_id, workspace_id, and assigned_to, enforcing agreement with lead.
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
  -- Verify originating lead exists
  SELECT workspace_id, assigned_to INTO v_lead_ws, v_lead_assigned
  FROM public.leads
  WHERE id = NEW.lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_LEAD: Originating lead % does not exist', NEW.lead_id;
  END IF;

  -- On UPDATE, lead_id and workspace_id cannot be changed
  IF TG_OP = 'UPDATE' THEN
    IF NEW.lead_id IS DISTINCT FROM OLD.lead_id THEN
      RAISE EXCEPTION 'IMMUTABLE_FIELD: lead_id on deal_opportunities cannot be modified';
    END IF;
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'IMMUTABLE_FIELD: workspace_id on deal_opportunities cannot be modified';
    END IF;
  END IF;

  -- Enforce agreement of workspace_id with originating lead
  IF NEW.workspace_id IS DISTINCT FROM v_lead_ws THEN
    RAISE EXCEPTION 'WORKSPACE_MISMATCH: Opportunity workspace % does not match lead workspace %', NEW.workspace_id, v_lead_ws;
  END IF;

  -- Ensure assigned_to agrees with lead assigned_to
  IF NEW.assigned_to IS DISTINCT FROM v_lead_assigned THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_workspace_manager(auth.uid(), NEW.workspace_id) THEN
      RAISE EXCEPTION 'ASSIGNMENT_MISMATCH: Opportunity assignee % must match lead assignee %', NEW.assigned_to, v_lead_assigned;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_opportunity_integrity ON public.deal_opportunities;
CREATE TRIGGER trg_deal_opportunity_integrity
  BEFORE INSERT OR UPDATE ON public.deal_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_deal_opportunity_integrity();

-- =========================================================================
-- 9. REASSIGNMENT CASCADING TRIGGER
-- =========================================================================
-- Automatically updates deal_opportunities.assigned_to whenever leads.assigned_to
-- changes, guaranteeing previous executives immediately lose opportunity visibility.
CREATE OR REPLACE FUNCTION public.sync_lead_assignment_to_opportunities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    UPDATE public.deal_opportunities
    SET assigned_to = NEW.assigned_to,
        updated_at = now()
    WHERE lead_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_assignment_to_opportunities ON public.leads;
CREATE TRIGGER trg_sync_lead_assignment_to_opportunities
  AFTER UPDATE OF assigned_to ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_assignment_to_opportunities();

-- =========================================================================
-- 10. ATOMIC DATABASE TRANSACTION FUNCTION FOR SITE VISIT OUTCOMES
-- =========================================================================
-- Security definer procedure deriving authenticated caller identity from auth.uid().
-- Handles consistent state transitions, reliable audit descriptions, and idempotency.
CREATE OR REPLACE FUNCTION public.record_site_visit_outcome(
  p_lead_id UUID,
  p_workspace_id UUID,
  p_outcome VARCHAR,
  p_notes TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_next_follow_up_date DATE DEFAULT NULL,
  p_next_follow_up_time VARCHAR DEFAULT NULL,
  p_unit_interest VARCHAR DEFAULT NULL,
  p_offered_budget_inr NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_lead public.leads%ROWTYPE;
  v_opp public.deal_opportunities%ROWTYPE;
  v_is_manager BOOLEAN;
  v_opp_id UUID;
  v_deal_id_str TEXT;
  v_now TIMESTAMPTZ := now();
  v_res JSONB;
  v_is_duplicate BOOLEAN := false;
  v_subject VARCHAR(200);
  v_desc TEXT;
  v_outcome_enum public.activity_outcome;
BEGIN
  -- 1. Derive authenticated caller identity from session context
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to record site visit outcome';
  END IF;

  -- 2. Fetch and row-lock lead
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND: Lead % does not exist in workspace %', p_lead_id, p_workspace_id;
  END IF;

  -- 3. Authorization verification (Platform Admin, Workspace Manager, or assigned Sales Executive)
  v_is_manager := public.is_workspace_manager(v_caller_id, p_workspace_id);

  IF NOT v_is_manager THEN
    IF NOT public.has_role(v_caller_id, 'agent'::public.app_role)
       OR v_lead.assigned_to IS DISTINCT FROM v_caller_id
       OR NOT public.is_workspace_member(v_caller_id, p_workspace_id) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Caller % is not an authorized sales executive assigned to lead % in workspace %', v_caller_id, p_lead_id, p_workspace_id;
    END IF;
  END IF;

  -- 4. Validate input constraints per outcome
  IF p_outcome = 'UNDECIDED' THEN
    IF p_next_follow_up_date IS NULL OR p_next_follow_up_time IS NULL OR trim(p_next_follow_up_time) = '' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Next follow-up date and time are required for undecided site visits.';
    END IF;
  END IF;

  -- 5. Idempotency check: distinguish exact duplicate requests from corrections
  IF v_lead.visit_outcome = p_outcome THEN
    IF p_outcome = 'INTERESTED' THEN
      SELECT * INTO v_opp FROM public.deal_opportunities WHERE lead_id = p_lead_id;
      IF FOUND AND v_opp.stage = 'negotiation' THEN
        IF (p_offered_budget_inr IS NULL OR p_offered_budget_inr = v_lead.budget_inr)
           AND (p_unit_interest IS NULL OR p_unit_interest = v_opp.unit_interest)
           AND (p_notes IS NULL OR p_notes = v_opp.notes) THEN
          v_is_duplicate := true;
          v_opp_id := v_opp.id;
          v_deal_id_str := 'DR-' || UPPER(SUBSTRING(v_opp.id::text, 1, 4));
        END IF;
      END IF;
    ELSIF p_outcome = 'NOT_INTERESTED' THEN
      IF (p_notes IS NULL OR p_notes = v_lead.follow_up_notes) THEN
        v_is_duplicate := true;
      END IF;
    ELSIF p_outcome = 'UNDECIDED' THEN
      IF (v_lead.follow_up_date = p_next_follow_up_date)
         AND (v_lead.follow_up_time::text = p_next_follow_up_time OR (v_lead.follow_up_time IS NULL AND p_next_follow_up_time IS NULL))
         AND (p_notes IS NULL OR p_notes = v_lead.follow_up_notes) THEN
        v_is_duplicate := true;
      END IF;
    END IF;
  END IF;

  -- If exact duplicate submission, return existing state without duplicate activity logs
  IF v_is_duplicate THEN
    RETURN jsonb_build_object(
      'success', true,
      'leadId', p_lead_id,
      'outcome', p_outcome,
      'stage', CASE 
                 WHEN p_outcome = 'INTERESTED' THEN 'Negotiation'
                 WHEN p_outcome = 'NOT_INTERESTED' THEN 'Not Interested'
                 ELSE 'Follow-Up Scheduled'
               END,
      'opportunityId', v_opp_id,
      'dealId', v_deal_id_str,
      'isDuplicate', true
    );
  END IF;

  -- 6. Execute transitions & activity creation (First transition or legitimate correction)
  IF p_outcome = 'INTERESTED' THEN
    -- Update lead
    UPDATE public.leads
    SET stage = 'negotiation',
        visit_outcome = 'INTERESTED',
        budget_inr = COALESCE(p_offered_budget_inr, budget_inr),
        follow_up_status = 'completed',
        updated_at = v_now
    WHERE id = p_lead_id;

    -- Upsert / reactivate preliminary opportunity in negotiation stage
    INSERT INTO public.deal_opportunities (
      workspace_id,
      lead_id,
      assigned_to,
      stage,
      unit_interest,
      target_budget_inr,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      p_workspace_id,
      p_lead_id,
      v_lead.assigned_to,
      'negotiation',
      p_unit_interest,
      COALESCE(p_offered_budget_inr, v_lead.budget_inr),
      p_notes,
      v_now,
      v_now
    )
    ON CONFLICT (lead_id) DO UPDATE SET
      stage = 'negotiation',
      unit_interest = COALESCE(EXCLUDED.unit_interest, deal_opportunities.unit_interest),
      target_budget_inr = COALESCE(EXCLUDED.target_budget_inr, deal_opportunities.target_budget_inr),
      notes = COALESCE(EXCLUDED.notes, deal_opportunities.notes),
      updated_at = v_now
    RETURNING id INTO v_opp_id;

    v_deal_id_str := 'DR-' || UPPER(SUBSTRING(v_opp_id::text, 1, 4));
    v_subject := CASE WHEN v_lead.visit_outcome = 'INTERESTED' 
                      THEN 'Site Visit Outcome Updated: Interested'
                      ELSE 'Site Visit Outcome: Interested -> Moved to Negotiation' 
                 END;
    
    -- Reliable description formatting (safe with null/empty notes)
    v_desc := 'Prospect expressed interest. Deal Room ' || v_deal_id_str || ' initiated.';
    IF p_notes IS NOT NULL AND trim(p_notes) <> '' THEN
      v_desc := v_desc || ' Note: ' || trim(p_notes);
    END IF;
    
    v_outcome_enum := 'interested'::public.activity_outcome;

    v_res := jsonb_build_object(
      'success', true,
      'leadId', p_lead_id,
      'outcome', 'INTERESTED',
      'stage', 'Negotiation',
      'opportunityId', v_opp_id,
      'dealId', v_deal_id_str,
      'isDuplicate', false
    );

  ELSIF p_outcome = 'NOT_INTERESTED' THEN
    UPDATE public.leads
    SET stage = 'not_interested',
        visit_outcome = 'NOT_INTERESTED',
        follow_up_status = 'completed',
        follow_up_notes = CASE 
          WHEN p_reason IS NOT NULL AND trim(p_reason) <> '' AND p_notes IS NOT NULL AND trim(p_notes) <> '' THEN 'Reason: ' || trim(p_reason) || ' | ' || trim(p_notes)
          WHEN p_reason IS NOT NULL AND trim(p_reason) <> '' THEN 'Reason: ' || trim(p_reason)
          ELSE p_notes
        END,
        updated_at = v_now
    WHERE id = p_lead_id;

    -- Deactivate any existing opportunity without deleting history so closed leads do not leave active negotiation opportunities
    UPDATE public.deal_opportunities
    SET stage = 'closed_lost',
        updated_at = v_now
    WHERE lead_id = p_lead_id;

    v_subject := CASE WHEN v_lead.visit_outcome = 'NOT_INTERESTED'
                      THEN 'Site Visit Outcome Updated: Not Interested'
                      ELSE 'Site Visit Outcome: Not Interested (Closed)'
                 END;

    -- Reliable description formatting: Reason is ALWAYS persisted and never dropped by null notes
    v_desc := 'Lead marked Not Interested.';
    IF p_reason IS NOT NULL AND trim(p_reason) <> '' THEN
      v_desc := v_desc || ' Reason: ' || trim(p_reason) || '.';
    END IF;
    IF p_notes IS NOT NULL AND trim(p_notes) <> '' THEN
      v_desc := v_desc || ' Note: ' || trim(p_notes);
    END IF;

    v_outcome_enum := 'not_interested'::public.activity_outcome;

    v_res := jsonb_build_object(
      'success', true,
      'leadId', p_lead_id,
      'outcome', 'NOT_INTERESTED',
      'stage', 'Not Interested',
      'isDuplicate', false
    );

  ELSIF p_outcome = 'UNDECIDED' THEN
    UPDATE public.leads
    SET follow_up_date = p_next_follow_up_date,
        follow_up_time = p_next_follow_up_time::time,
        follow_up_status = 'pending',
        follow_up_notes = p_notes,
        visit_outcome = 'UNDECIDED',
        updated_at = v_now
    WHERE id = p_lead_id;

    -- Update opportunity state to on_hold
    UPDATE public.deal_opportunities
    SET stage = 'on_hold',
        updated_at = v_now
    WHERE lead_id = p_lead_id;

    v_subject := CASE WHEN v_lead.visit_outcome = 'UNDECIDED'
                      THEN 'Site Visit Outcome Updated: Follow-Up Rescheduled'
                      ELSE 'Site Visit Outcome: Undecided (Follow-Up Scheduled)'
                 END;

    v_desc := 'Site visit undecided. Next follow-up booked for ' || p_next_follow_up_date || ' at ' || p_next_follow_up_time || '.';
    IF p_notes IS NOT NULL AND trim(p_notes) <> '' THEN
      v_desc := v_desc || ' Note: ' || trim(p_notes);
    END IF;

    v_outcome_enum := 'follow_up_required'::public.activity_outcome;

    v_res := jsonb_build_object(
      'success', true,
      'leadId', p_lead_id,
      'outcome', 'UNDECIDED',
      'stage', 'Follow-Up Scheduled',
      'isDuplicate', false
    );
  ELSE
    RAISE EXCEPTION 'INVALID_OUTCOME: Unknown outcome %', p_outcome;
  END IF;

  -- 7. Record verified audit activity in public.activities
  INSERT INTO public.activities (
    workspace_id,
    activity_type,
    subject,
    description,
    start_time,
    status,
    outcome,
    related_to_type,
    related_to_id,
    performed_by,
    assigned_to,
    created_by,
    updated_by
  )
  VALUES (
    p_workspace_id,
    'site_visit'::public.activity_type,
    v_subject,
    v_desc,
    v_now,
    'completed'::public.activity_status,
    v_outcome_enum,
    'lead',
    p_lead_id,
    v_caller_id,
    v_lead.assigned_to,
    v_caller_id,
    v_caller_id
  );

  RETURN v_res;
END;
$$;

COMMENT ON FUNCTION public.record_site_visit_outcome IS
'Atomic database transaction for recording site visit outcomes with auth.uid() identity derivation, row-level locking, automated idempotency, and audit logging.';

REVOKE EXECUTE ON FUNCTION public.record_site_visit_outcome(UUID, UUID, VARCHAR, TEXT, TEXT, DATE, VARCHAR, VARCHAR, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_site_visit_outcome(UUID, UUID, VARCHAR, TEXT, TEXT, DATE, VARCHAR, VARCHAR, NUMERIC) TO authenticated, service_role;
