
-- Table to track read news per user
CREATE TABLE public.user_read_news (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, news_id)
);

ALTER TABLE public.user_read_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reads" ON public.user_read_news FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reads" ON public.user_read_news FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reads" ON public.user_read_news FOR DELETE USING (auth.uid() = user_id);
