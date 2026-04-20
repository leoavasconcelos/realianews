CREATE TABLE IF NOT EXISTS public.instagram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url text,
  enabled boolean NOT NULL DEFAULT false,
  schedule_hour integer NOT NULL DEFAULT 9,
  top_n integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT instagram_settings_singleton CHECK (id IS NOT NULL),
  CONSTRAINT instagram_settings_schedule_hour_range CHECK (schedule_hour >= 0 AND schedule_hour <= 23),
  CONSTRAINT instagram_settings_top_n_range CHECK (top_n >= 1 AND top_n <= 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS instagram_settings_singleton_idx ON public.instagram_settings ((true));

CREATE TABLE IF NOT EXISTS public.instagram_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_ids uuid[] NOT NULL DEFAULT '{}',
  slides_urls text[] NOT NULL DEFAULT '{}',
  caption text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT instagram_publications_status_check CHECK (status IN ('pending', 'preview', 'sent', 'failed'))
);

ALTER TABLE public.instagram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and moderators can view instagram settings"
ON public.instagram_settings
FOR SELECT
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can insert instagram settings"
ON public.instagram_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update instagram settings"
ON public.instagram_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and moderators can view instagram publications"
ON public.instagram_publications
FOR SELECT
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can insert instagram publications"
ON public.instagram_publications
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can update instagram publications"
ON public.instagram_publications
FOR UPDATE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE TRIGGER update_instagram_settings_updated_at
BEFORE UPDATE ON public.instagram_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.instagram_settings (webhook_url, enabled, schedule_hour, top_n)
SELECT null, false, 9, 5
WHERE NOT EXISTS (SELECT 1 FROM public.instagram_settings);

INSERT INTO storage.buckets (id, name, public)
SELECT 'instagram-posts', 'instagram-posts', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'instagram-posts'
);

CREATE POLICY "Public can view instagram post assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'instagram-posts');