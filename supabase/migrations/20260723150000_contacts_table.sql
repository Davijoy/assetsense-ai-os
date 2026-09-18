-- =========================================================================
-- REOS v1.0 — Phase 3: Workspace Domain Tables (Contacts)
-- =========================================================================

-- Enums for Contact domain --------------------------------------------------

CREATE TYPE public.contact_status AS ENUM (
  'NEW',
  'ACTIVE',
  'INACTIVE',
  'CUSTOMER',
  'PARTNER',
  'VENDOR',
  'LEAD',
  'REFERRAL',
  'ARCHIVED'
);

-- Core table ---------------------------------------------------------------

CREATE TABLE public.contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  full_name       VARCHAR(201) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(20),
  company         VARCHAR(200),
  job_title       VARCHAR(100),
  website         VARCHAR(500),
  address_line_1  VARCHAR(200),
  address_line_2  VARCHAR(200),
  city            VARCHAR(100),
  state           VARCHAR(100),
  postal_code     VARCHAR(20),
  country         CHAR(2) DEFAULT 'IN',
  lead_source     VARCHAR(100),
  status          contact_status NOT NULL DEFAULT 'NEW',
  preferred_contact_method VARCHAR(50) DEFAULT 'email',
  do_not_contact  BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id), -- Will be set by application
  updated_by      UUID REFERENCES auth.users(id), -- Will be set by application

  -- Constraints
  CONSTRAINT contacts_name_check CHECK (first_name IS NOT NULL OR last_name IS NOT NULL),
  CONSTRAINT contacts_country_code CHECK (country ~ '^[A-Z]{2}$')
);

COMMENT ON TABLE public.contacts IS 'Individuals and organizations that interact with the business';
COMMENT ON COLUMN public.contacts.workspace_id IS 'Workspace this contact belongs to for multi-tenancy';
COMMENT ON COLUMN public.contacts.first_name IS 'Given name';
COMMENT ON COLUMN public.contacts.last_name IS 'Family name/Surname';
COMMENT ON COLUMN public.contacts.full_name IS 'Computed full name (first_name + last_name)';
COMMENT ON COLUMN public.contacts.email IS 'Primary email address';
COMMENT ON COLUMN public.contacts.phone IS 'Primary phone number';
COMMENT ON COLUMN public.contacts.company IS 'Organization name';
COMMENT ON COLUMN public.contacts.job_title IS 'Position/title at company';
COMMENT ON COLUMN public.contacts.website IS 'Personal or company website URL';
COMMENT ON COLUMN public.contacts.address_line_1 IS 'Primary address line';
COMMENT ON COLUMN public.contacts.address_line_2 IS 'Secondary address line';
COMMENT ON COLUMN public.contacts.city IS 'City';
COMMENT ON COLUMN public.contacts.state IS 'State/Province';
COMMENT ON COLUMN public.contacts.postal_code IS 'ZIP/Postal code';
COMMENT ON COLUMN public.contacts.country IS 'Country (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN public.contacts.lead_source IS 'How contact was acquired (marketing tracking)';
COMMENT ON COLUMN public.contacts.status IS 'Current lifecycle status';
COMMENT ON COLUMN public.contacts.preferred_contact_method IS 'Preferred way to be contacted';
COMMENT ON COLUMN public.contacts.do_not_contact IS 'Opt-out flag for communications (GDPR/TCPA compliance)';
COMMENT ON COLUMN public.contacts.notes IS 'Internal notes about contact';
COMMENT ON COLUMN public.contacts.tags IS 'Categorization labels for segmentation';
COMMENT ON COLUMN public.contacts.created_by IS 'User who created the record';
COMMENT ON COLUMN public.contacts.updated_by IS 'User who last updated the record';

-- Indexes for performance
CREATE INDEX contacts_workspace_idx ON public.contacts(workspace_id);
CREATE INDEX contacts_email_idx ON public.contacts(LOWER(email));

-- Unique case-insensitive email per workspace (expression index — required because
-- PostgreSQL UNIQUE table constraints cannot contain expressions like lower())
CREATE UNIQUE INDEX contacts_email_key
  ON public.contacts (workspace_id, lower(email));

CREATE INDEX contacts_status_idx ON public.contacts(status);
CREATE INDEX contacts_company_idx ON public.contacts(company);
CREATE INDEX contacts_lead_source_idx ON public.contacts(lead_source);
CREATE INDEX contacts_tags_idx ON public.contacts USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies following established pattern
CREATE POLICY "contacts ws select" ON public.contacts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "contacts ws insert" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "contacts ws update" ON public.contacts
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "contacts ws delete" ON public.contacts
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Grant permissions
GRANT SELECT ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

-- Trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- Indexes for common query patterns
-- =========================================================================

-- Composite indexes for frequent query combinations
CREATE INDEX contacts_workspace_status_idx ON public.contacts(workspace_id, status);
CREATE INDEX contacts_workspace_email_idx ON public.contacts(workspace_id, LOWER(email));
CREATE INDEX contacts_workspace_company_idx ON public.contacts(workspace_id, company);

-- =========================================================================
-- Note: created_by and updated_by will be handled by application layer
-- as they reference auth.uid() which is not available at database level for defaults
-- =========================================================================