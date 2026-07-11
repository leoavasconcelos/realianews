CREATE INDEX IF NOT EXISTS idx_news_published_at_with_summary
  ON public.news (published_at DESC)
  WHERE summary_ai IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_news_region_published_at
  ON public.news (region, published_at DESC)
  WHERE summary_ai IS NOT NULL;