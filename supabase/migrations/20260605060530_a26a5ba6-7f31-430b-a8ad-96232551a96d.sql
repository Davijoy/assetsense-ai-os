
CREATE TABLE public.branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL UNIQUE DEFAULT 'default',
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.branding_settings TO anon, authenticated;
GRANT ALL ON public.branding_settings TO service_role;

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branding read" ON public.branding_settings FOR SELECT USING (true);
CREATE POLICY "branding insert" ON public.branding_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "branding update" ON public.branding_settings FOR UPDATE USING (true);

INSERT INTO public.branding_settings (tenant_key) VALUES ('default') ON CONFLICT DO NOTHING;
