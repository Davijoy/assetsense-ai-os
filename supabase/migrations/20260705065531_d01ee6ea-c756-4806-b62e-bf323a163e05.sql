CREATE INDEX IF NOT EXISTS realtifyu_connection_logs_user_event_created_idx
  ON public.realtifyu_connection_logs (user_id, event, created_at DESC);

CREATE INDEX IF NOT EXISTS realtifyu_connection_logs_user_status_created_idx
  ON public.realtifyu_connection_logs (user_id, status, created_at DESC);