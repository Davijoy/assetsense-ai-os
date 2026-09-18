-- =========================================================================
-- REOS v1.0 — Phase 3: Workspace Domain Tables (Deals Bounded Context)
-- =========================================================================

-- Enums for Deal domain -----------------------------------------------------

CREATE TYPE public.deal_stage AS ENUM (
  'lead',
  'qualified',
  'proposed',
  'negotiating',
  'agreed',
  'booked',
  'construction_started',
  'foundation_complete',
  'framing_complete',
  'rough_in_complete',
  'drywall_complete',
  'finishing_complete',
  'final_inspection',
  'registration_initiated',
  'documents_submitted',
  'registration_pending',
  'registered',
  'possession_scheduled',
  'possession_offered',
  'possession_accepted',
  'handover_scheduled',
  'handover_completed',
  'completed',
  'cancelled',
  'terminated',
  'archived'
);

CREATE TYPE public.booking_status AS ENUM (
  'draft',
  'token_paid',
  'confirmed',
  'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'partial',
  'completed',
  'overdue',
  'waived'
);

CREATE TYPE public.possession_status AS ENUM (
  'not_ready',
  'ready_for_offer',
  'offered',
  'accepted',
  'handover_scheduled',
  'handover_completed',
  'delayed'
);

-- Core tables --------------------------------------------------------------

CREATE TABLE public.deals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL, -- References contacts table (to be created)
  project_id  UUID NOT NULL, -- References properties table
  unit_number VARCHAR(50) NOT NULL,
  agreed_value NUMERIC(15,2) NOT NULL CHECK (agreed_value >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency_code ~ '^[A-Z]{3}$'),
  agreement_date DATE NOT NULL,
  current_status deal_stage NOT NULL DEFAULT 'lead',
  agreed_possession_date DATE,
  actual_possession_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, customer_id, project_id, unit_number)
);

COMMENT ON TABLE public.deals IS 'Core business agreement between customer and developer for a specific property unit';
COMMENT ON COLUMN public.deals.customer_id IS 'Reference to contact/customer entity';
COMMENT ON COLUMN public.deals.project_id IS 'Reference to property/project being purchased';
COMMENT ON COLUMN public.deals.unit_number IS 'Specific unit identifier within the project';
COMMENT ON COLUMN public.deals.agreed_value IS 'Total agreed purchase price in specified currency';
COMMENT ON COLUMN public.deals.currency_code IS 'ISO 4217 currency code (INR, USD, etc.)';
COMMENT ON COLUMN public.deals.agreement_date IS 'Date when agreement was reached';
COMMENT ON COLUMN public.deals.current_status IS 'High-level status of the deal lifecycle';
COMMENT ON COLUMN public.deals.agreed_possession_date IS 'Contractually agreed date for possession';
COMMENT ON COLUMN public.deals.actual_possession_date IS 'Actual date when possession was given';

-- Indexes for performance
CREATE INDEX deals_workspace_idx ON public.deals(workspace_id);
CREATE INDEX deals_customer_idx ON public.deals(customer_id);
CREATE INDEX deals_project_idx ON public.deals(project_id);
CREATE INDEX deals_status_idx ON public.deals(current_status);
CREATE INDEX deals_unit_idx ON public.deals(project_id, unit_number);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- RLS policies following established pattern
CREATE POLICY "deals ws read" ON public.deals
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deals ws insert" ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deals ws update" ON public.deals
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deals ws delete" ON public.deals
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Grant permissions
GRANT SELECT ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;

-- Bounded Context Tables ---------------------------------------------------

-- 1. Sales Pipeline Lifecycle
CREATE TABLE public.deal_sales_pipeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stage           deal_stage NOT NULL DEFAULT 'lead',
  lead_source     VARCHAR(100),
  assigned_to     UUID, -- References workspace_members.user_id
  estimated_value NUMERIC(15,2),
  probability     INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id)
);

COMMENT ON TABLE public.deal_sales_pipeline IS 'Tracks the sales process from lead to agreement';
COMMENT ON COLUMN public.deal_sales_pipeline.stage IS 'Current stage in sales process';
COMMENT ON COLUMN public.deal_sales_pipeline.lead_source IS 'Source of the lead (website, referral, etc.)';
COMMENT ON COLUMN public.deal_sales_pipeline.assigned_to IS 'Sales representative assigned';
COMMENT ON COLUMN public.deal_sales_pipeline.probability IS 'Probability of closing (0-100%)';

CREATE INDEX deal_sales_pipeline_deal_idx ON public.deal_sales_pipeline(deal_id);
CREATE INDEX deal_sales_pipeline_workspace_idx ON public.deal_sales_pipeline(workspace_id);
CREATE INDEX deal_sales_pipeline_stage_idx ON public.deal_sales_pipeline(stage);

ALTER TABLE public.deal_sales_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_sales_pipeline ws read" ON public.deal_sales_pipeline
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_sales_pipeline ws insert" ON public.deal_sales_pipeline
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_sales_pipeline ws update" ON public.deal_sales_pipeline
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_sales_pipeline ws delete" ON public.deal_sales_pipeline
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT ON public.deal_sales_pipeline TO authenticated;
GRANT ALL ON public.deal_sales_pipeline TO service_role;

-- 2. Booking Lifecycle
CREATE TABLE public.deal_booking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  booking_status  booking_status NOT NULL DEFAULT 'draft',
  token_amount    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (token_amount >= 0),
  token_paid_date TIMESTAMPTZ,
  booking_date    DATE,
  expected_agreement_date DATE,
  actual_agreement_date DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id)
);

COMMENT ON TABLE public.deal_booking IS 'Tracks the booking process including token payment';
COMMENT ON COLUMN public.deal_booking.booking_status IS 'Current status of booking process';
COMMENT ON COLUMN public.deal_booking.token_amount IS 'Token amount paid to secure the unit';
COMMENT ON COLUMN public.deal_booking.token_paid_date IS 'Date when token payment was received';
COMMENT ON COLUMN public.deal_booking.booking_date IS 'Date when booking was made';
COMMENT ON COLUMN public.deal_booking.expected_agreement_date IS 'Expected date for agreement signing';
COMMENT ON COLUMN public.deal_booking.actual_agreement_date IS 'Actual date when agreement was signed';

CREATE INDEX deal_booking_deal_idx ON public.deal_booking(deal_id);
CREATE INDEX deal_booking_workspace_idx ON public.deal_booking(workspace_id);
CREATE INDEX deal_booking_status_idx ON public.deal_booking(booking_status);

ALTER TABLE public.deal_booking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_booking ws read" ON public.deal_booking
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_booking ws insert" ON public.deal_booking
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_booking ws update" ON public.deal_booking
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_booking ws delete" ON public.deal_booking
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT ON public.deal_booking TO authenticated;
GRANT ALL ON public.deal_booking TO service_role;

-- 3. Construction Lifecycle
CREATE TABLE public.deal_construction (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  start_date       DATE,
  foundation_date  DATE,
  framing_date     DATE,
  rough_in_date    DATE,
  drywall_date     DATE,
  finishing_date   DATE,
  final_inspection_date DATE,
  status           VARCHAR(50) DEFAULT 'not_started',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id)
);

COMMENT ON TABLE public.deal_construction IS 'Tracks construction progress for the unit';
COMMENT ON COLUMN public.deal_construction.start_date IS 'Date when construction started';
COMMENT ON COLUMN public.deal_construction.foundation_date IS 'Date when foundation work completed';
COMMENT ON COLUMN public.deal_construction.framing_date IS 'Date when framing completed';
COMMENT ON COLUMN public.deal_construction.rough_in_date IS 'Date when rough-in (plumbing/electrical) completed';
COMMENT ON COLUMN public.deal_construction.drywall_date IS 'Date when drywall installation completed';
COMMENT ON COLUMN public.deal_construction.finishing_date IS 'Date when finishing work completed';
COMMENT ON COLUMN public.deal_construction.final_inspection_date IS 'Date when final inspection passed';
COMMENT ON COLUMN public.deal_construction.status IS 'Overall construction status';

CREATE INDEX deal_construction_deal_idx ON public.deal_construction(deal_id);
CREATE INDEX deal_construction_workspace_idx ON public.deal_construction(workspace_id);

ALTER TABLE public.deal_construction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_construction ws read" ON public.deal_construction
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_construction ws insert" ON public.deal_construction
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_construction ws update" ON public.deal_construction
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_construction ws delete" ON public.deal_construction
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT ON public.deal_construction TO authenticated;
GRANT ALL ON public.deal_construction TO service_role;

-- 4. Registration Lifecycle
CREATE TABLE public.deal_registration (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  application_date    DATE,
  submission_date     DATE,
  approval_date       DATE,
  registration_date   DATE,
  registration_number VARCHAR(100),
  stamp_duty_paid     NUMERIC(15,2) DEFAULT 0 CHECK (stamp_duty_paid >= 0),
  registration_fees   NUMERIC(15,2) DEFAULT 0 CHECK (registration_fees >= 0),
  status              VARCHAR(50) DEFAULT 'not_started',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id)
);

COMMENT ON TABLE public.deal_registration IS 'Tracks property registration process with government authorities';
COMMENT ON COLUMN public.deal_registration.application_date IS 'Date when application was submitted';
COMMENT ON COLUMN public.deal_registration.submission_date IS 'Date when documents were submitted to registrar';
COMMENT ON COLUMN public.deal_registration.approval_date IS 'Date when application was approved';
COMMENT ON COLUMN public.deal_registration.registration_date IS 'Date when property was officially registered';
COMMENT ON COLUMN public.deal_registration.registration_number IS 'Official registration number from authorities';
COMMENT ON COLUMN public.deal_registration.stamp_duty_paid IS 'Amount of stamp duty paid';
COMMENT ON COLUMN public.deal_registration.registration_fees IS 'Amount of registration fees paid';

CREATE INDEX deal_registration_deal_idx ON public.deal_registration(deal_id);
CREATE INDEX deal_registration_workspace_idx ON public.deal_registration(workspace_id);

ALTER TABLE public.deal_registration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_registration ws read" ON public.deal_registration
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_registration ws insert" ON public.deal_registration
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_registration ws update" ON public.deal_registration
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_registration ws delete" ON public.deal_registration
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT ON public.deal_registration TO authenticated;
GRANT ALL ON public.deal_registration TO service_role;

-- 5. Payment Lifecycle
CREATE TABLE public.deal_payment_schedule (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  payment_status   payment_status NOT NULL DEFAULT 'pending',
  last_payment_date DATE,
  next_payment_date DATE,
  final_payment_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id)
);

COMMENT ON TABLE public.deal_payment_schedule IS 'Tracks payment schedule and status for the deal';
COMMENT ON COLUMN public.deal_payment_schedule.payment_status IS 'Overall payment status';
COMMENT ON COLUMN public.deal_payment_schedule.last_payment_date IS 'Date of last payment received';
COMMENT ON COLUMN public.deal_payment_schedule.next_payment_date IS 'Date when next payment is due';
COMMENT ON COLUMN public.deal_payment_schedule.final_payment_date IS 'Date when final payment is due';

-- Note: Financial information (total amount, currency) is sourced from the deal record
-- to avoid duplication and ensure consistency

CREATE INDEX deal_payment_schedule_deal_idx ON public.deal_payment_schedule(deal_id);
CREATE INDEX deal_payment_schedule_workspace_idx ON public.deal_payment_schedule(workspace_id);
CREATE INDEX deal_payment_schedule_status_idx ON public.deal_payment_schedule(payment_status);

ALTER TABLE public.deal_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_payment_schedule ws read" ON public.deal_payment_schedule
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_payment_schedule ws insert" ON public.deal_payment_schedule
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_payment_schedule ws update" ON public.deal_payment_schedule
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_payment_schedule ws delete" ON public.deal_payment_schedule
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT ON public.deal_payment_schedule TO authenticated;
GRANT ALL ON public.deal_payment_schedule TO service_role;

-- Payment Installments (child table)
CREATE TABLE public.deal_payment_installments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_schedule_id UUID NOT NULL REFERENCES public.deal_payment_schedule(id) ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date         DATE NOT NULL,
  amount_due       NUMERIC(15,2) NOT NULL CHECK (amount_due >= 0),
  amount_paid      NUMERIC(15,2) DEFAULT 0 CHECK (amount_paid >= 0),
  payment_date     DATE,
  status           VARCHAR(20) DEFAULT 'pending', -- pending, paid, partial, overdue, waived
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.deal_payment_installments IS 'Individual payment installments in the schedule';
COMMENT ON COLUMN public.deal_payment_installments.payment_schedule_id IS 'Reference to parent payment schedule';
COMMENT ON COLUMN public.deal_payment_installments.installment_number IS 'Sequence number of this installment';
COMMENT ON COLUMN public.deal_payment_installments.due_date IS 'Date when this installment is due';
COMMENT ON COLUMN public.deal_payment_installments.amount_due IS 'Amount due for this installment';
COMMENT ON COLUMN public.deal_payment_installments.amount_paid IS 'Amount actually paid for this installment';
COMMENT ON COLUMN public.deal_payment_installments.payment_date IS 'Date when payment was received';
COMMENT ON COLUMN public.deal_payment_installments.status IS 'Status of this specific installment';

CREATE INDEX deal_payment_installments_schedule_idx ON public.deal_payment_installments(payment_schedule_id);
CREATE INDEX deal_payment_installments_workspace_idx ON public.deal_payment_installments(workspace_id);
CREATE INDEX deal_payment_installments_due_date_idx ON public.deal_payment_installments(due_date);
CREATE INDEX deal_payment_installments_status_idx ON public.deal_payment_installments(status);

ALTER TABLE public.deal_payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_payment_installments ws read" ON public.deal_payment_installments
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_payment_installments ws insert" ON public.deal_payment_installments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_payment_installments ws update" ON public.deal_payment_installments
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_payment_installments ws delete" ON public.deal_payment_installments
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT ON public.deal_payment_installments TO authenticated;
GRANT ALL ON public.deal_payment_installments TO service_role;

-- 6. Possession Lifecycle
CREATE TABLE public.deal_possession (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id              UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  workspace_id         UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  possession_status    possession_status NOT NULL DEFAULT 'not_ready',
  readiness_date       DATE,
  offered_date         DATE,
  accepted_date        DATE,
  handover_scheduled_date DATE,
  actual_handover_date DATE,
  possession_letter_date DATE,
  keys_handed_over_date DATE,
  snag_list_count      INTEGER DEFAULT 0 CHECK (snag_list_count >= 0),
  snag_resolved_count  INTEGER DEFAULT 0 CHECK (snag_resolved_count >= 0 AND snag_resolved_count <= snag_list_count),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id)
);

COMMENT ON TABLE public.deal_possession IS 'Tracks possession and handover process for the unit';
COMMENT ON COLUMN public.deal_possession.possession_status IS 'Current status of possession process';
COMMENT ON COLUMN public.deal_possession.readiness_date IS 'Date when unit was ready for possession';
COMMENT ON COLUMN public.deal_possession.offered_date IS 'Date when possession was offered to customer';
COMMENT ON COLUMN public.deal_possession.accepted_date IS 'Date when customer accepted possession';
COMMENT ON COLUMN public.deal_possession.handover_scheduled_date IS 'Date when handover was scheduled';
COMMENT ON COLUMN public.deal_possession.actual_handover_date IS 'Actual date when handover occurred';
COMMENT ON COLUMN public.deal_possession.possession_letter_date IS 'Date when possession letter was issued';
COMMENT ON COLUMN public.deal_possession.keys_handed_over_date IS 'Date when keys were handed over';
COMMENT ON COLUMN public.deal_possession.snag_list_count IS 'Total number of snags/issues identified';
COMMENT ON COLUMN public.deal_possession.snag_resolved_count IS 'Number of snags that have been resolved';

CREATE INDEX deal_possession_deal_idx ON public.deal_possession(deal_id);
CREATE INDEX deal_possession_workspace_idx ON public.deal_possession(workspace_id);
CREATE INDEX deal_possession_status_idx ON public.deal_possession(possession_status);

ALTER TABLE public.deal_possession ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_possession ws read" ON public.deal_possession
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_possession ws insert" ON public.deal_possession
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_possession ws update" ON public.deal_possession
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_possession ws delete" ON public.deal_possession
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT ON public.deal_possession TO authenticated;
GRANT ALL ON public.deal_possession TO service_role;

-- Snag Items for possession process
CREATE TABLE public.deal_possession_snags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  possession_id   UUID NOT NULL REFERENCES public.deal_possession(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  location        VARCHAR(200), -- e.g., "Master Bedroom", "Kitchen", "Bathroom 2"
  severity        VARCHAR(20) DEFAULT 'minor', -- minor, major, critical
  reported_date   DATE NOT NULL,
  resolved_date   DATE,
  resolved_by     UUID, -- References workspace_members.user_id
  resolution_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.deal_possession_snags IS 'Individual snags/issues identified during possession inspection';
COMMENT ON COLUMN public.deal_possession_snags.possession_id IS 'Reference to possession record';
COMMENT ON COLUMN public.deal_possession_snags.description IS 'Description of the snag/issue';
COMMENT ON COLUMN public.deal_possession_snags.location IS 'Location of the snag within the unit';
COMMENT ON COLUMN public.deal_possession_snags.severity IS 'Severity level of the snag';
COMMENT ON COLUMN public.deal_possession_snags.reported_date IS 'Date when snag was reported';
COMMENT ON COLUMN public.deal_possession_snags.resolved_date IS 'Date when snag was resolved';
COMMENT ON COLUMN public.deal_possession_snags.resolved_by IS 'Who resolved the snag';
COMMENT ON COLUMN public.deal_possession_snags.resolution_notes IS 'Notes about how the snag was resolved';

CREATE INDEX deal_possession_snags_possession_idx ON public.deal_possession_snags(possession_id);
CREATE INDEX deal_possession_snags_workspace_idx ON public.deal_possession_snags(workspace_id);
CREATE INDEX deal_possession_snags_severity_idx ON public.deal_possession_snags(severity);
CREATE INDEX deal_possession_snags_resolved_date_idx ON public.deal_possession_snags(resolved_date);

ALTER TABLE public.deal_possession_snags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_possession_snags ws read" ON public.deal_possession_snags
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_possession_snags ws insert" ON public.deal_possession_snags
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_possession_snags ws update" ON public.deal_possession_snags
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "deal_possession_snags ws delete" ON public.deal_possession_snags
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT ON public.deal_possession_snags TO authenticated;
GRANT ALL ON public.deal_possession_snags TO service_role;

-- =========================================================================
-- Indexes for performance optimization
-- =========================================================================

-- Composite indexes for common query patterns
CREATE INDEX deals_customer_project_idx ON public.deals(customer_id, project_id);
CREATE INDEX deals_project_unit_idx ON public.deals(project_id, unit_number);
CREATE INDEX deals_status_date_idx ON public.deals(current_status, agreement_date);

-- =========================================================================
-- Triggers for updated_at timestamps
-- =========================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
DO $$
DECLARE
    tables CURSOR FOR
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'deals', 'deal_sales_pipeline', 'deal_booking', 'deal_construction',
            'deal_registration', 'deal_payment_schedule', 'deal_payment_installments',
            'deal_possession', 'deal_possession_snags'
        );
BEGIN
    FOR table_record IN tables LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I.%I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();',
            table_record.tablename, 'public', table_record.tablename,
            table_record.tablename, 'public', table_record.tablename);
    END LOOP;
END $$;

-- =========================================================================
-- Initial data (if needed)
-- =========================================================================

-- No initial data required for deals tables as they are workspace-specific