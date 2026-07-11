ALTER TABLE public.news ADD COLUMN IF NOT EXISTS is_relevant BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_news_needs_relevance_check
  ON public.news (id)
  WHERE is_relevant IS NULL;