-- Add region column to news table
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS region text DEFAULT 'Brazil';

-- Create index for faster region filtering
CREATE INDEX IF NOT EXISTS idx_news_region ON public.news(region);