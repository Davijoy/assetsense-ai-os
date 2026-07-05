
CREATE TABLE public.realtifyu_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  account_id text,
  account_email text,
  account_name text,
  raw_profile jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.realtifyu_connections TO authenticated;
GRANT ALL ON public.realtifyu_connections TO service_role;
ALTER TABLE public.realtifyu_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own realtifyu connection"
  ON public.realtifyu_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own realtifyu connection"
  ON public.realtifyu_connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.realtifyu_oauth_states (
  state text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_verifier text NOT NULL,
  redirect_uri text NOT NULL,
  return_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);
GRANT SELECT, DELETE ON public.realtifyu_oauth_states TO authenticated;
GRANT ALL ON public.realtifyu_oauth_states TO service_role;
ALTER TABLE public.realtifyu_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own oauth state"
  ON public.realtifyu_oauth_states FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_realtifyu_connections_updated
  BEFORE UPDATE ON public.realtifyu_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
