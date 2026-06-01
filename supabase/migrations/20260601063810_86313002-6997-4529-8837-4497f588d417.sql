
-- Properties (marketplace inventory)
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  property_type text NOT NULL,
  price_inr bigint NOT NULL,
  status text NOT NULL DEFAULT 'available',
  ai_score int NOT NULL DEFAULT 0,
  developer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO anon, authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties public read" ON public.properties FOR SELECT TO anon, authenticated USING (true);

-- Leads (CRM)
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  source text NOT NULL,
  stage text NOT NULL DEFAULT 'new',
  score int NOT NULL DEFAULT 0,
  budget_inr bigint,
  project text,
  owner text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads public read" ON public.leads FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX leads_source_idx ON public.leads (source);
CREATE INDEX leads_stage_idx ON public.leads (stage);

-- Calls (AI Voice)
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  agent text NOT NULL,
  language text NOT NULL,
  duration_sec int NOT NULL DEFAULT 0,
  intent_score int NOT NULL DEFAULT 0,
  intent_label text NOT NULL,
  sentiment text NOT NULL DEFAULT 'neutral',
  qualified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.calls TO anon, authenticated;
GRANT ALL ON public.calls TO service_role;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls public read" ON public.calls FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX calls_created_at_idx ON public.calls (created_at DESC);
CREATE INDEX calls_intent_idx ON public.calls (intent_label);
