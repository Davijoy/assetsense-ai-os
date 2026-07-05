
CREATE TABLE public.realtifyu_connection_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  application text NOT NULL DEFAULT 'sentinel-fort',
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.realtifyu_connection_logs TO authenticated;
GRANT ALL ON public.realtifyu_connection_logs TO service_role;
ALTER TABLE public.realtifyu_connection_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own realtifyu logs"
  ON public.realtifyu_connection_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX realtifyu_connection_logs_user_created_idx
  ON public.realtifyu_connection_logs (user_id, created_at DESC);
