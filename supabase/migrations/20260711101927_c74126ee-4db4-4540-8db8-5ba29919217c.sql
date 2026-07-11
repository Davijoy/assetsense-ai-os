ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_score_generated_at timestamptz;

CREATE INDEX IF NOT EXISTS properties_attributes_gin ON public.properties USING gin (attributes);