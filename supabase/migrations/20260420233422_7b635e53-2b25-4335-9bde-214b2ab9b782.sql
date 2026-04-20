ALTER TABLE public.instagram_publications
  DROP CONSTRAINT IF EXISTS instagram_publications_status_check;

ALTER TABLE public.instagram_settings
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'approval_queue',
  ADD COLUMN IF NOT EXISTS auto_enqueue_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_interval_minutes integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS single_post_default boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS carousel_when_multiple_images boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_caption_length integer NOT NULL DEFAULT 1600,
  ADD COLUMN IF NOT EXISTS brand_style text NOT NULL DEFAULT 'notjournal_editorial';

ALTER TABLE public.instagram_publications
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'single_image',
  ADD COLUMN IF NOT EXISTS primary_news_id uuid,
  ADD COLUMN IF NOT EXISTS title_snapshot text,
  ADD COLUMN IF NOT EXISTS section_label text,
  ADD COLUMN IF NOT EXISTS image_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_image_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS source_snapshot text;

UPDATE public.instagram_publications
SET
  primary_news_id = COALESCE(primary_news_id, news_ids[1]),
  image_count = GREATEST(COALESCE(array_length(slides_urls, 1), 0), COALESCE(array_length(selected_image_urls, 1), 0), image_count),
  selected_image_urls = CASE
    WHEN cardinality(selected_image_urls) > 0 THEN selected_image_urls
    WHEN cardinality(slides_urls) > 0 THEN slides_urls
    ELSE '{}'::text[]
  END,
  published_at = COALESCE(published_at, sent_at),
  post_type = CASE
    WHEN COALESCE(array_length(slides_urls, 1), 0) > 1 THEN 'carousel'
    ELSE COALESCE(post_type, 'single_image')
  END,
  status = CASE
    WHEN status = 'pending' THEN 'queued'
    ELSE status
  END
WHERE true;

ALTER TABLE public.instagram_publications
  ADD CONSTRAINT instagram_publications_status_check
  CHECK (status IN ('queued', 'preview', 'approved', 'sent', 'failed', 'cancelled'));

ALTER TABLE public.instagram_publications
  DROP CONSTRAINT IF EXISTS instagram_publications_post_type_check,
  ADD CONSTRAINT instagram_publications_post_type_check
  CHECK (post_type IN ('single_image', 'carousel'));

ALTER TABLE public.instagram_settings
  DROP CONSTRAINT IF EXISTS instagram_settings_mode_check,
  ADD CONSTRAINT instagram_settings_mode_check
  CHECK (mode IN ('approval_queue'));

CREATE INDEX IF NOT EXISTS idx_instagram_publications_status_created_at
  ON public.instagram_publications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_publications_primary_news_id
  ON public.instagram_publications (primary_news_id);

CREATE INDEX IF NOT EXISTS idx_instagram_publications_published_at
  ON public.instagram_publications (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_settings_mode_enabled
  ON public.instagram_settings (mode, enabled);

DROP TRIGGER IF EXISTS update_instagram_settings_updated_at ON public.instagram_settings;
CREATE TRIGGER update_instagram_settings_updated_at
BEFORE UPDATE ON public.instagram_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();