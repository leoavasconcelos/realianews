CREATE TABLE IF NOT EXISTS public.job_locks (
  name TEXT PRIMARY KEY,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

GRANT ALL ON public.job_locks TO service_role;

ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: table is service-role only. RLS is
-- enabled so any accidental client access is blocked by default.
