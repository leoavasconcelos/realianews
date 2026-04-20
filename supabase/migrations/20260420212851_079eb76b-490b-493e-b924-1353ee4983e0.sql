ALTER TABLE public.instagram_settings
DROP CONSTRAINT IF EXISTS instagram_settings_top_n_range;

ALTER TABLE public.instagram_settings
ADD CONSTRAINT instagram_settings_top_n_range CHECK (top_n >= 1 AND top_n <= 8);

UPDATE public.instagram_settings
SET top_n = LEAST(top_n, 8);