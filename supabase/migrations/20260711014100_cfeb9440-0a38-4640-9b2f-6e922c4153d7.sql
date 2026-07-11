CREATE TABLE public.crawl_monitor_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_urls INTEGER NOT NULL DEFAULT 0,
  ok_count INTEGER NOT NULL DEFAULT 0,
  redirect_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  changed BOOLEAN NOT NULL DEFAULT false,
  alert_sent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT
);

CREATE TABLE public.crawl_monitor_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.crawl_monitor_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status_code INTEGER,
  final_url TEXT,
  category TEXT NOT NULL,
  previous_status_code INTEGER,
  previous_category TEXT,
  changed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX crawl_monitor_urls_run_id_idx ON public.crawl_monitor_urls(run_id);
CREATE INDEX crawl_monitor_urls_url_idx ON public.crawl_monitor_urls(url);
CREATE INDEX crawl_monitor_runs_ran_at_idx ON public.crawl_monitor_runs(ran_at DESC);

GRANT SELECT ON public.crawl_monitor_runs TO authenticated;
GRANT ALL ON public.crawl_monitor_runs TO service_role;
GRANT SELECT ON public.crawl_monitor_urls TO authenticated;
GRANT ALL ON public.crawl_monitor_urls TO service_role;

ALTER TABLE public.crawl_monitor_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_monitor_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view crawl runs"
ON public.crawl_monitor_runs FOR SELECT
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can view crawl url results"
ON public.crawl_monitor_urls FOR SELECT
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));