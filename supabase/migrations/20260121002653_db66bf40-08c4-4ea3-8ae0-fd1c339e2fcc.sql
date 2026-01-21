-- =============================================
-- REalia Database Schema
-- =============================================

-- 1. Create profiles table for user preferences
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  interests JSONB DEFAULT '[]'::jsonb,
  blocked_sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create topics table for news categories
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create sources table for news sources
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create news table for articles
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary_ai TEXT,
  full_text TEXT,
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  image_url TEXT,
  audio_url TEXT,
  topics JSONB DEFAULT '[]'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_trending BOOLEAN NOT NULL DEFAULT false,
  read_time TEXT DEFAULT '3 min',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create user_saved_items junction table
CREATE TABLE public.user_saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  news_id UUID REFERENCES public.news(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, news_id)
);

-- =============================================
-- Enable Row Level Security
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for profiles
-- =============================================

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- RLS Policies for topics (public read)
-- =============================================

CREATE POLICY "Anyone can view topics"
  ON public.topics FOR SELECT
  USING (true);

-- =============================================
-- RLS Policies for sources (public read)
-- =============================================

CREATE POLICY "Anyone can view active sources"
  ON public.sources FOR SELECT
  USING (is_active = true);

-- =============================================
-- RLS Policies for news (public read)
-- =============================================

CREATE POLICY "Anyone can view news"
  ON public.news FOR SELECT
  USING (true);

-- =============================================
-- RLS Policies for user_saved_items
-- =============================================

CREATE POLICY "Users can view their saved items"
  ON public.user_saved_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save items"
  ON public.user_saved_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved items"
  ON public.user_saved_items FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- Trigger for auto-creating profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Trigger for updating timestamps
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Insert default topics
-- =============================================

INSERT INTO public.topics (name, slug, description, icon) VALUES
  ('Residencial', 'residencial', 'Casas, apartamentos e lançamentos residenciais', 'home'),
  ('Comercial', 'comercial', 'Escritórios, lojas, galpões e imóveis comerciais', 'building'),
  ('Corporativo', 'corporativo', 'M&A, fundos imobiliários e grandes players', 'briefcase'),
  ('Financiamento', 'financiamento', 'Crédito imobiliário, taxas e bancos', 'landmark'),
  ('Investimentos', 'investimentos', 'FIIs, CRIs e oportunidades de investimento', 'trending-up'),
  ('PropTech', 'proptech', 'Tecnologia e inovação no mercado imobiliário', 'cpu'),
  ('Logística', 'logistica', 'Galpões, centros de distribuição e e-commerce', 'truck'),
  ('Sustentabilidade', 'sustentabilidade', 'Construção verde e eficiência energética', 'leaf');

-- =============================================
-- Insert sample sources
-- =============================================

INSERT INTO public.sources (name, base_url) VALUES
  ('Valor Econômico', 'https://valor.globo.com'),
  ('Estadão', 'https://estadao.com.br'),
  ('Exame', 'https://exame.com'),
  ('InfoMoney', 'https://infomoney.com.br'),
  ('Folha de S.Paulo', 'https://folha.uol.com.br');