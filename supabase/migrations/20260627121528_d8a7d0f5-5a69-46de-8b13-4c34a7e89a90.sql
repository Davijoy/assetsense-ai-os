
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.relationship_type AS ENUM (
    'OWNER','LENDER','BROKER','BUYER','TENANT',
    'INVESTOR','MANAGER','ARCHITECT','CONTRACTOR','REGULATOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ LOCATIONS ============
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  region text,
  country text NOT NULL DEFAULT 'IN',
  lat double precision,
  lng double precision,
  polygon jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, region, country)
);
GRANT SELECT ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations read all auth" ON public.locations FOR SELECT TO authenticated USING (true);

-- ============ PROPERTIES_GLOBAL ============
CREATE TABLE IF NOT EXISTS public.properties_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  property_type text NOT NULL,
  asset_class text,
  status text NOT NULL DEFAULT 'available',
  price_inr bigint,
  area_sqft numeric,
  developer text,
  rera_id text,
  description text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_global_location_idx ON public.properties_global(location_id);
CREATE INDEX IF NOT EXISTS properties_global_type_idx ON public.properties_global(property_type);
GRANT SELECT ON public.properties_global TO authenticated;
GRANT ALL ON public.properties_global TO service_role;
ALTER TABLE public.properties_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_global read all auth" ON public.properties_global FOR SELECT TO authenticated USING (true);

-- ============ PROPERTY_MEDIA ============
CREATE TABLE IF NOT EXISTS public.property_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties_global(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS property_media_property_idx ON public.property_media(property_id);
GRANT SELECT ON public.property_media TO authenticated;
GRANT ALL ON public.property_media TO service_role;
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_media read all auth" ON public.property_media FOR SELECT TO authenticated USING (true);

-- ============ MARKET_DATA ============
CREATE TABLE IF NOT EXISTS public.market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  metric text NOT NULL,            -- e.g. avg_price_psf, rental_yield, absorption_rate
  period_start date NOT NULL,
  period_end date NOT NULL,
  value numeric NOT NULL,
  unit text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS market_data_location_metric_idx ON public.market_data(location_id, metric, period_start DESC);
GRANT SELECT ON public.market_data TO authenticated;
GRANT ALL ON public.market_data TO service_role;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market_data read all auth" ON public.market_data FOR SELECT TO authenticated USING (true);

-- ============ VALUATION_MODELS ============
CREATE TABLE IF NOT EXISTS public.valuation_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  family text NOT NULL,            -- e.g. regression, gbdt, neural, bayesian
  version text NOT NULL DEFAULT '1.0.0',
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.valuation_models TO authenticated;
GRANT ALL ON public.valuation_models TO service_role;
ALTER TABLE public.valuation_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "valuation_models read all auth" ON public.valuation_models FOR SELECT TO authenticated USING (true);

-- ============ DOCUMENTS_GLOBAL ============
CREATE TABLE IF NOT EXISTS public.documents_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  doc_type text NOT NULL DEFAULT 'general',
  jurisdiction text,
  publisher text,
  summary text,
  storage_path text,
  size_bytes bigint NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_global_type_idx ON public.documents_global(doc_type);
GRANT SELECT ON public.documents_global TO authenticated;
GRANT ALL ON public.documents_global TO service_role;
ALTER TABLE public.documents_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_global read all auth" ON public.documents_global FOR SELECT TO authenticated USING (true);

-- ============ PROPERTY_EMBEDDINGS (pgvector 1536 = openai/text-embedding-3-small) ============
CREATE TABLE IF NOT EXISTS public.property_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties_global(id) ON DELETE CASCADE,
  model text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  embedding vector(1536) NOT NULL,
  source_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, model)
);
CREATE INDEX IF NOT EXISTS property_embeddings_hnsw
  ON public.property_embeddings USING hnsw (embedding vector_cosine_ops);
GRANT SELECT ON public.property_embeddings TO authenticated;
GRANT ALL ON public.property_embeddings TO service_role;
ALTER TABLE public.property_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_embeddings read all auth" ON public.property_embeddings FOR SELECT TO authenticated USING (true);

-- ============ PROPERTY_RELATIONSHIPS (workspace-scoped) ============
CREATE TABLE IF NOT EXISTS public.property_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties_global(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid,
  contact_name text,
  relationship_type public.relationship_type NOT NULL,
  since date,
  until date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS property_relationships_property_idx ON public.property_relationships(property_id);
CREATE INDEX IF NOT EXISTS property_relationships_workspace_idx ON public.property_relationships(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_relationships TO authenticated;
GRANT ALL ON public.property_relationships TO service_role;
ALTER TABLE public.property_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_rel ws members read"
  ON public.property_relationships FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "property_rel ws members write"
  ON public.property_relationships FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "property_rel ws members update"
  ON public.property_relationships FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "property_rel ws members delete"
  ON public.property_relationships FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$ BEGIN
  CREATE TRIGGER locations_touch BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER properties_global_touch BEFORE UPDATE ON public.properties_global
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER documents_global_touch BEFORE UPDATE ON public.documents_global
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER valuation_models_touch BEFORE UPDATE ON public.valuation_models
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER property_rel_touch BEFORE UPDATE ON public.property_relationships
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ similarity RPC ============
CREATE OR REPLACE FUNCTION public.match_properties(
  query_embedding vector(1536),
  match_count int DEFAULT 8
)
RETURNS TABLE (
  property_id uuid,
  name text,
  city text,
  similarity double precision
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT p.id, p.name, l.city,
         1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.property_embeddings e
  JOIN public.properties_global p ON p.id = e.property_id
  LEFT JOIN public.locations l ON l.id = p.location_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
REVOKE EXECUTE ON FUNCTION public.match_properties(vector, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_properties(vector, int) TO authenticated, service_role;

-- ============ BACKFILL from existing properties ============
INSERT INTO public.locations (city)
SELECT DISTINCT city FROM public.properties
WHERE city IS NOT NULL
ON CONFLICT (city, region, country) DO NOTHING;

INSERT INTO public.properties_global
  (name, location_id, property_type, status, price_inr, developer, source_property_id)
SELECT p.name, l.id, p.property_type, p.status, p.price_inr, p.developer, p.id
FROM public.properties p
LEFT JOIN public.locations l ON l.city = p.city AND l.region IS NULL AND l.country = 'IN'
WHERE NOT EXISTS (
  SELECT 1 FROM public.properties_global g WHERE g.source_property_id = p.id
);

-- Seed OWNER relationships from legacy `developer` text into the default workspace
INSERT INTO public.property_relationships
  (property_id, workspace_id, contact_name, relationship_type, metadata)
SELECT g.id,
       '00000000-0000-0000-0000-00000000d3f7'::uuid,
       g.developer,
       'OWNER'::public.relationship_type,
       jsonb_build_object('source', 'backfill_developer_field')
FROM public.properties_global g
WHERE g.developer IS NOT NULL AND g.developer <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.property_relationships r
    WHERE r.property_id = g.id
      AND r.relationship_type = 'OWNER'
      AND r.contact_name = g.developer
  );

-- Seed a couple of baseline valuation models
INSERT INTO public.valuation_models (code, name, family, description, features, metrics)
VALUES
  ('avm_xgb_v1', 'AVM · XGBoost Comparable Sales', 'gbdt',
   'Gradient-boosted AVM trained on closed transactions + market_data signals.',
   '["price_psf","absorption_rate","location_score","age_years","floor","amenity_score"]'::jsonb,
   '{"mape":0.072,"r2":0.89,"holdout":"2025Q2"}'::jsonb),
  ('yield_bayes_v1', 'Rental Yield · Bayesian Hierarchical', 'bayesian',
   'Hierarchical Bayesian yield model with city-level partial pooling.',
   '["rent_psf","vacancy_rate","cap_rate","market_growth"]'::jsonb,
   '{"crps":0.041,"coverage_90":0.91}'::jsonb)
ON CONFLICT (code) DO NOTHING;
