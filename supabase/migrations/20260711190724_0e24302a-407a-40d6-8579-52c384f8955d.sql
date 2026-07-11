ALTER TABLE public.news ADD COLUMN IF NOT EXISTS relevance_rechecked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_news_needs_relevance_recheck
  ON public.news (created_at)
  WHERE summary_ai IS NOT NULL AND relevance_rechecked_at IS NULL;